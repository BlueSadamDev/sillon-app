// Faux appareil, pour les tests et le test de charge : il fait ce que fera l'app (clé Ed25519,
// réponse au défi, enveloppes signées). Son contenu est fait d'octets aléatoires, déjà
// « chiffrés » du point de vue du relais : aucune note, vraie ou fictive, ne passe par ici.
import { generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import WebSocket from 'ws';

import { challengeText, signedBytes, type Envelope, type Kind } from './envelope.ts';

export class TestDevice {
  readonly deviceId: string;
  private readonly key: KeyObject;
  seq = 0;

  constructor() {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    this.deviceId = publicKey.export({ format: 'jwk' }).x!;
    this.key = privateKey;
  }

  envelope(docId: string, payload: Uint8Array, kind: Kind = 'update', seq = ++this.seq): Envelope {
    const head = { docId, deviceId: this.deviceId, seq, epoch: 1, kind };
    return { ...head, payload: Buffer.from(payload).toString('base64'), sig: sign(null, signedBytes(head, payload), this.key).toString('base64') };
  }

  randomEnvelope(docId = 'doc-essai-0000000001', size = 256): Envelope {
    return this.envelope(docId, randomBytes(size));
  }

  /** Se connecte et s'identifie. Renvoie la connexion et une file des messages reçus. */
  async connect(url: string, installCode?: string) {
    const ws = new WebSocket(url);
    const inbox: Record<string, unknown>[] = [];
    const waiters: { test: (m: Record<string, unknown>) => boolean; resolve: (m: Record<string, unknown>) => void }[] = [];
    const closed = new Promise<{ code: number; reason: string }>((resolve) => ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() })));
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      const i = waiters.findIndex((w) => w.test(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else inbox.push(msg);
    });
    const next = (test: (m: Record<string, unknown>) => boolean = () => true) =>
      new Promise<Record<string, unknown>>((resolve) => {
        const i = inbox.findIndex(test);
        if (i >= 0) resolve(inbox.splice(i, 1)[0]);
        else waiters.push({ test, resolve });
      });
    const challenge = await next((m) => m.t === 'challenge');
    const sig = sign(null, new TextEncoder().encode(challengeText(challenge.nonce as string)), this.key).toString('base64');
    ws.send(JSON.stringify({ t: 'hello', deviceId: this.deviceId, sig, installCode }));
    const first = await Promise.race([next((m) => m.t === 'welcome'), closed]);
    const send = (msg: object) => ws.send(JSON.stringify(msg));
    return { ws, welcome: first as Record<string, unknown> & { code?: number }, next, send, closed, inbox };
  }
}
