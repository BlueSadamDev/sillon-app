// Affiche l'état du relais : appareils autorisés, messages rangés, taille. Aucun contenu
// (il est chiffré et le relais ne peut pas le lire). Usage : npm run etat
import { statSync } from 'node:fs';

import { Store } from '../src/store.ts';

const path = process.env.RELAIS_DB ?? 'relais.db';
const store = new Store(path);
const s = store.stats();
let size = 0;
for (const f of [path, `${path}-wal`]) {
  try {
    size += statSync(f).size;
  } catch {
    // fichier absent
  }
}
console.log(`Appareils autorisés : ${s.devices}`);
console.log(`Messages rangés : ${s.messages} (${(s.payloadBytes / 1024).toFixed(0)} Kio de contenu chiffré)`);
console.log(`Taille de la base : ${(size / 1024).toFixed(0)} Kio`);
store.close();
