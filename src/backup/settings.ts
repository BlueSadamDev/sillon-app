// Réglages du banc d'essai « Chiffrement » et « Dossier pCloud » (lot 0).
// Aucun réglage en dur dans les écrans : tout est ici.

/** Profils Argon2id mesurés sur le téléphone (opsLimit = nombre de passes, memLimit en octets). */
export const KDF_PROFILES = [
  { id: 'interactive', label: 'Argon2id 2 passes, 64 Mo', opsLimit: 2, memLimit: 64 * 1024 * 1024 },
  { id: 'medium', label: 'Argon2id 3 passes, 128 Mo', opsLimit: 3, memLimit: 128 * 1024 * 1024 },
  { id: 'moderate', label: 'Argon2id 3 passes, 256 Mo', opsLimit: 3, memLimit: 256 * 1024 * 1024 },
] as const;

/** Tailles du carnet fictif chiffré pendant l'essai (nombre de notes). */
export const BENCH_NOTE_COUNTS = [200, 2000] as const;

/** Mot de passe de l'essai : fictif, il ne protège que des notes fictives. */
export const BENCH_PASSWORD = 'mot-de-passe-fictif-du-banc-d-essai';

/**
 * Préfixe et extension des fichiers d'essai écrits dans le dossier pCloud.
 * Essai n° 1 : pCloud a ajouté « .bin » aux noms en « .sillon » (type application/octet-stream),
 * et a signalé une erreur tout en créant le fichier. Essai n° 2 : extension « .bin » d'emblée.
 */
export const PCLOUD_TEST_PREFIX = 'sillon-essai-';
export const PCLOUD_TEST_EXTENSION = '.bin';

/** Taille du faux fichier de sauvegarde écrit dans pCloud (octets aléatoires). */
export const PCLOUD_TEST_SIZE_BYTES = 256 * 1024;

/** Rotation pendant l'essai : on garde peu de fichiers pour tester vite (10 dans l'app réelle). */
export const PCLOUD_TEST_KEEP = 3;
