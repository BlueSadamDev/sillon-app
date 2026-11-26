// Démarrage du relais (lancé par le service systemd sillon-relais).
// Réglages par variables d'environnement : RELAIS_DB (fichier de la base), RELAIS_PORT.
// Journal : uniquement le démarrage, l'arrêt et des compteurs. Jamais d'identifiant ni de contenu.
import { startRelay } from './relay.ts';
import { Store } from './store.ts';

const dbPath = process.env.RELAIS_DB ?? 'relais.db';
const port = Number(process.env.RELAIS_PORT ?? 8787);
const store = new Store(dbPath);
const relay = startRelay({ store, port });

relay.ready.then((p) => {
  const s = store.stats();
  console.log(`Relais Sillon prêt sur 127.0.0.1:${p} (${s.devices} appareils autorisés, ${s.messages} messages)`);
});

// Une ligne de compteurs par heure, pour suivre l'activité sans rien révéler.
setInterval(() => {
  const c = relay.counters;
  const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
  console.log(
    `Compteurs : ${relay.connected()} appareils connectés, ${c.connections} connexions, ${c.received} messages reçus, ` +
      `${c.refused} refusés, ${c.authFailures} identifications refusées ; mémoire ${mem} Mo`,
  );
}, 60 * 60 * 1000).unref();

const stop = async () => {
  await relay.close();
  store.close();
  console.log('Relais Sillon arrêté');
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
