// Affiche un nouveau code d'installation à usage unique (valable 15 minutes), à saisir dans
// « Sillon (essai) » pour autoriser un appareil. Usage : npm run code
import { Store } from '../src/store.ts';

const store = new Store(process.env.RELAIS_DB ?? 'relais.db');
console.log(`Code d'installation (valable 15 minutes, une seule fois) : ${store.newInstallCode()}`);
store.close();
