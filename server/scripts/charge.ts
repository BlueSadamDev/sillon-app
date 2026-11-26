// Test de charge, à lancer sur le mini PC pendant que le relais tourne :
//   npm run charge -- <appareils> <messages par appareil> <taille en octets>
// Par défaut : 5 appareils, 2 000 messages chacun, 1 024 octets (contenu aléatoire, aucune note).
// Mesure le délai entre l'envoi et l'accusé de réception, puis efface tout ce qu'il a créé.
import { performance } from 'node:perf_hooks';

import { Store } from '../src/store.ts';
import { TestDevice } from '../src/testDevice.ts';

const [devices = 5, perDevice = 2000, size = 1024] = process.argv.slice(2).map(Number);
const url = `ws://127.0.0.1:${process.env.RELAIS_PORT ?? 8787}`;
const store = new Store(process.env.RELAIS_DB ?? 'relais.db');

const fakes = Array.from({ length: devices }, () => new TestDevice());
const conns = [];
for (const d of fakes) conns.push(await d.connect(url, store.newInstallCode()));

const delays: number[] = [];
const t0 = performance.now();
await Promise.all(
  conns.map(async (c, i) => {
    for (let n = 0; n < perDevice; n++) {
      const sent = performance.now();
      c.send({ t: 'push', env: fakes[i].randomEnvelope(`doc-charge-${String(n % 50).padStart(10, '0')}`, size) });
      await c.next((m) => m.t === 'ack' || m.t === 'refused');
      delays.push(performance.now() - sent);
      // Les messages transmis par les autres faux appareils ne servent pas ici.
      c.inbox.length = 0;
    }
  }),
);
const total = (performance.now() - t0) / 1000;
for (const c of conns) c.ws.close();

delays.sort((a, b) => a - b);
const at = (q: number) => delays[Math.min(delays.length - 1, Math.floor(q * delays.length))].toFixed(1);
console.log(`${delays.length} messages de ${size} octets envoyés par ${devices} faux appareils en ${total.toFixed(1)} s`);
console.log(`Délai envoi → accusé : médiane ${at(0.5)} ms, 95 % sous ${at(0.95)} ms, pire ${at(1)} ms`);

// Nettoyage : rien de ce test ne reste dans la base.
for (const d of fakes) {
  store.db.prepare('DELETE FROM messages WHERE device_id = ?').run(d.deviceId);
  store.db.prepare('DELETE FROM devices WHERE device_id = ?').run(d.deviceId);
}
store.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
console.log('Faux appareils et messages du test effacés.');
store.close();
