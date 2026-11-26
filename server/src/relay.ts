// Relais prototype de Sillon (lot 7.0, étude section 4).
// - N'écoute que sur 127.0.0.1 : Tailscale Serve le rend joignable par tes seuls appareils, en TLS.
// - Chaque appareil prouve son identité en signant un défi aléatoire (étude, section 5.4).
// - Range des messages chiffrés et signés, et les transmet aux autres appareils connectés.
// - Ne contient pas Yjs, ne déchiffre rien, n'écrit aucun identifiant ni contenu dans son journal.
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';

import { challengeText, checkEnvelope, MAX_PAYLOAD_BYTES, publicKeyOf, verifySig } from './envelope.ts';
import { Store } from './store.ts';

export type RelayOptions = {
  store: Store;
  host?: string;
  port?: number;
  /** Délai pour s'identifier après la connexion. */
  authTimeoutMs?: number;
  /** Intervalle des vérifications de connexion (ping WebSocket). */
  heartbeatMs?: number;
  maxConnections?: number;
};

export type Counters = { connections: number; authFailures: number; received: number; refused: number; forwarded: number };

type Client = { ws: WebSocket; deviceId: string | null; nonce: string; alive: boolean };

const send = (ws: WebSocket, msg: object) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

export function startRelay(opts: RelayOptions) {
  const { store } = opts;
  const counters: Counters = { connections: 0, authFailures: 0, received: 0, refused: 0, forwarded: 0 };
  const clients = new Set<Client>();
  const wss = new WebSocketServer({
    host: opts.host ?? '127.0.0.1',
    port: opts.port ?? 8787,
    // Enveloppe JSON : contenu en base64 (4/3 de la taille) + en-tête.
    maxPayload: Math.ceil((MAX_PAYLOAD_BYTES * 4) / 3) + 4096,
  });
  const ready = new Promise<number>((resolve) => wss.on('listening', () => resolve((wss.address() as AddressInfo).port)));

  wss.on('connection', (ws) => {
    if (clients.size >= (opts.maxConnections ?? 32)) {
      ws.close(1013, 'trop de connexions');
      return;
    }
    const client: Client = { ws, deviceId: null, nonce: randomBytes(32).toString('base64'), alive: true };
    clients.add(client);
    counters.connections++;
    const authTimer = setTimeout(() => {
      if (!client.deviceId) ws.close(4001, 'identification attendue');
    }, opts.authTimeoutMs ?? 10_000);
    send(ws, { t: 'challenge', nonce: client.nonce });

    ws.on('pong', () => {
      client.alive = true;
    });
    ws.on('close', () => {
      clearTimeout(authTimer);
      clients.delete(client);
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return ws.close(4000, 'texte attendu');
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return ws.close(4000, 'message illisible');
      }
      if (!client.deviceId) return hello(client, msg);
      handle(client, msg);
    });
  });

  function hello(client: Client, msg: Record<string, unknown>) {
    const { ws } = client;
    const deviceId = typeof msg.deviceId === 'string' ? msg.deviceId : '';
    const sig = typeof msg.sig === 'string' ? msg.sig : '';
    if (msg.t !== 'hello' || !publicKeyOf(deviceId) || !verifySig(deviceId, new TextEncoder().encode(challengeText(client.nonce)), sig)) {
      counters.authFailures++;
      return ws.close(4003, 'identité refusée');
    }
    if (!store.isDevice(deviceId)) {
      // Premier contact d'un appareil : il doit présenter un code d'installation valable.
      // (Au lot 7 : autorisation signée par un appareil déjà présent, étude section 5.3.)
      if (typeof msg.installCode !== 'string' || !store.useInstallCode(msg.installCode)) {
        counters.authFailures++;
        return ws.close(4003, 'appareil inconnu');
      }
      store.addDevice(deviceId);
    }
    client.deviceId = deviceId;
    send(ws, { t: 'welcome', lastSeq: store.lastSeq(deviceId) });
  }

  function handle(client: Client, msg: Record<string, unknown>) {
    const { ws } = client;
    const deviceId = client.deviceId!;
    switch (msg.t) {
      case 'ping':
        return send(ws, { t: 'pong', id: msg.id });
      case 'push': {
        const checked = checkEnvelope(msg.env, deviceId);
        if (!checked.ok) {
          counters.refused++;
          return send(ws, { t: 'refused', seq: (msg.env as { seq?: unknown })?.seq ?? null, reason: checked.reason });
        }
        const res = store.put(checked.env, checked.payload);
        if (res === 'trou') {
          counters.refused++;
          return send(ws, { t: 'refused', seq: checked.env.seq, reason: 'trou', expected: store.lastSeq(deviceId) + 1 });
        }
        send(ws, { t: 'ack', seq: checked.env.seq });
        if (res === 'double') return;
        counters.received++;
        for (const other of clients) {
          if (other.deviceId && other.deviceId !== deviceId) {
            send(other.ws, { t: 'msg', env: checked.env });
            counters.forwarded++;
          }
        }
        return;
      }
      case 'pull': {
        const known = (msg.known && typeof msg.known === 'object' ? msg.known : {}) as Record<string, number>;
        const list = store.since(deviceId, known);
        for (const env of list) send(ws, { t: 'msg', env });
        return send(ws, { t: 'synced', count: list.length });
      }
      default:
        return ws.close(4000, 'type inconnu');
    }
  }

  // Coupe les connexions mortes (téléphone parti sans prévenir).
  const heartbeat = setInterval(() => {
    for (const c of clients) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, opts.heartbeatMs ?? 30_000);

  return {
    ready,
    counters,
    connected: () => [...clients].filter((c) => c.deviceId).length,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        for (const c of clients) c.ws.terminate();
        wss.close(() => resolve());
      }),
  };
}
