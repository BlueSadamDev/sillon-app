// Tests du relais prototype : identification, refus, rangement, transmission, rattrapage.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { header, signedBytes } from '../src/envelope.ts';
import { startRelay } from '../src/relay.ts';
import { Store } from '../src/store.ts';
import { TestDevice } from '../src/testDevice.ts';

describe('relais', () => {
  const store = new Store();
  const relay = startRelay({ store, port: 0, authTimeoutMs: 300 });
  let url = '';
  before(async () => {
    url = `ws://127.0.0.1:${await relay.ready}`;
  });
  after(async () => {
    await relay.close();
    store.close();
  });

  it('refuse un appareil inconnu sans code', async () => {
    const c = await new TestDevice().connect(url);
    assert.equal((await c.closed).code, 4003);
  });

  it('refuse un code d’installation faux, puis l’accepte une seule fois', async () => {
    const code = store.newInstallCode();
    const wrong = await new TestDevice().connect(url, code === '00000000' ? '11111111' : '00000000');
    assert.equal((await wrong.closed).code, 4003);
    const a = await new TestDevice().connect(url, code);
    assert.equal(a.welcome.t, 'welcome');
    const reuse = await new TestDevice().connect(url, code);
    assert.equal((await reuse.closed).code, 4003);
    a.ws.close();
  });

  it('coupe une connexion qui ne s’identifie pas', async () => {
    const { default: WebSocket } = await import('ws');
    const ws = new WebSocket(url);
    const code = await new Promise((r) => ws.on('close', (c) => r(c)));
    assert.equal(code, 4001);
  });

  it('range, transmet et rattrape les messages', async () => {
    const phone = new TestDevice();
    const tablet = new TestDevice();
    const p = await phone.connect(url, store.newInstallCode());
    const t = await tablet.connect(url, store.newInstallCode());

    const env = phone.randomEnvelope();
    p.send({ t: 'push', env });
    assert.deepEqual(await p.next((m) => m.t === 'ack'), { t: 'ack', seq: 1 });
    const live = await t.next((m) => m.t === 'msg');
    assert.deepEqual(live.env, env);

    // Renvoi du même message (après une coupure) : accepté sans doublon.
    p.send({ t: 'push', env });
    assert.deepEqual(await p.next((m) => m.t === 'ack'), { t: 'ack', seq: 1 });
    assert.equal(store.lastSeq(phone.deviceId), 1);

    // Trou dans la numérotation : refusé, avec le numéro attendu.
    phone.seq = 2;
    p.send({ t: 'push', env: phone.randomEnvelope() });
    const gap = await p.next((m) => m.t === 'refused');
    assert.equal(gap.reason, 'trou');
    assert.equal(gap.expected, 2);

    // La tablette se reconnecte et rattrape ce qu'elle n'a pas reçu.
    t.ws.close();
    phone.seq = 1;
    for (let i = 0; i < 3; i++) p.send({ t: 'push', env: phone.randomEnvelope() });
    for (let i = 0; i < 3; i++) await p.next((m) => m.t === 'ack');
    const t2 = await tablet.connect(url);
    t2.send({ t: 'pull', known: { [phone.deviceId]: 1 } });
    const got: number[] = [];
    for (;;) {
      const m = await t2.next((x) => x.t === 'msg' || x.t === 'synced');
      if (m.t === 'synced') break;
      got.push((m.env as { seq: number }).seq);
    }
    assert.deepEqual(got, [2, 3, 4]);
    p.ws.close();
    t2.ws.close();
  });

  it('refuse une signature fausse, un message d’un autre appareil, un contenu trop gros', async () => {
    const a = new TestDevice();
    const b = new TestDevice();
    const c = await a.connect(url, store.newInstallCode());
    const forged = { ...a.randomEnvelope(), sig: b.randomEnvelope().sig };
    c.send({ t: 'push', env: forged });
    assert.equal((await c.next((m) => m.t === 'refused')).reason, 'signature');
    c.send({ t: 'push', env: b.randomEnvelope() });
    assert.equal((await c.next((m) => m.t === 'refused')).reason, 'appareil');
    a.seq = 0;
    c.send({ t: 'push', env: a.randomEnvelope('doc-essai-0000000001', 64 * 1024 + 1) });
    assert.equal((await c.next((m) => m.t === 'refused')).reason, 'taille');
    c.ws.close();
  });

  it('répond au ping', async () => {
    const c = await new TestDevice().connect(url, store.newInstallCode());
    c.send({ t: 'ping', id: 7 });
    assert.deepEqual(await c.next((m) => m.t === 'pong'), { t: 'pong', id: 7 });
    c.ws.close();
  });
});

describe('enveloppe', () => {
  it('a un en-tête stable (partagé avec l’app)', () => {
    const head = { docId: 'doc-essai-0000000001', deviceId: 'A'.repeat(43), seq: 3, epoch: 1, kind: 'update' as const };
    assert.equal(header(head), `sillon-v0\ndoc-essai-0000000001\n${'A'.repeat(43)}\n3\n1\nupdate\n`);
    assert.equal(signedBytes(head, new Uint8Array([1, 2])).length, header(head).length + 2);
  });
});
