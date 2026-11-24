// Réglages de la sauvegarde (lot 2) et des bancs d'essai du lot 0.
// Aucun réglage en dur ailleurs : tout est ici.

/**
 * Calcul de la clé de sauvegarde : Argon2id 3 passes, 256 Mo (≈ 1,2 s sur le S21, lot 0).
 * Fait une seule fois à la configuration, puis à chaque restauration.
 */
export const BACKUP_KDF = { opsLimit: 3, memLimit: 256 * 1024 * 1024 } as const;

/** Repli si le téléphone manque de mémoire : 3 passes, 128 Mo (≈ 0,6 s). */
export const BACKUP_KDF_FALLBACK = { opsLimit: 3, memLimit: 128 * 1024 * 1024 } as const;

/** Longueur minimale du mot de passe de sauvegarde (12, plus long que celui du compte). */
export const MIN_BACKUP_PASSWORD_LENGTH = 12;

/** Nom de la configuration de la sauvegarde dans le coffre sécurisé du téléphone (expo-secure-store). */
export const BACKUP_CONFIG_KEY = 'sillon.backup';

/** État de la dernière sauvegarde (date, problème), dans le coffre sécurisé. */
export const BACKUP_STATE_KEY = 'sillon.backup.state';

/**
 * Nom des fichiers de sauvegarde : « sillon-AAAAMMJJ-HHMMSS.bin ». Extension « .bin » : avec un autre
 * nom, pCloud ajoute lui-même « .bin » (lot 0). Seuls les fichiers de cette forme exacte sont à Sillon.
 */
export const BACKUP_PREFIX = 'sillon-';
export const BACKUP_EXTENSION = '.bin';
export const BACKUP_MIME = 'application/octet-stream';

/**
 * Attente entre l'écriture et la relecture de la liste du dossier (pCloud peut signaler une erreur
 * sur une écriture réussie : seule la liste fait foi).
 */
export const VERIFY_DELAY_MS = 3000;

/** Rotation : nombre de sauvegardes datées gardées dans le dossier (cahier des charges, F7). */
export const BACKUP_KEEP = 10;

/**
 * Attente avant chaque suppression de la rotation : pCloud refuse les actions trop rapprochées
 * (lot 0 : deux suppressions dans la même seconde refusées).
 */
export const DELETE_DELAY_MS = 5000;

/** Attente entre le déverrouillage et la sauvegarde automatique (l'accueil s'affiche d'abord). */
export const AUTO_START_DELAY_MS = 2000;

/** Après une sauvegarde automatique ratée, délai avant une nouvelle tentative automatique (minutes). */
export const AUTO_RETRY_AFTER_MIN = 60;

/** Nom de la tâche de fond de sauvegarde auprès d'Android. */
export const BACKGROUND_TASK_NAME = 'sillon-sauvegarde-quotidienne';

/**
 * Intervalle minimal entre deux réveils de la tâche de fond (minutes). Android choisit le moment exact ;
 * la tâche ne sauvegarde qu'une fois par jour. Plusieurs réveils par jour donnent plusieurs chances
 * si l'un échoue (app pCloud endormie, par exemple).
 */
export const BACKGROUND_INTERVAL_MIN = 6 * 60;

/**
 * Taille maximale d'un fichier à restaurer (octets). Une sauvegarde de 2 000 notes fait environ 1,3 Mo
 * (lot 0) : au-delà de 100 Mo, ce n'est pas une sauvegarde Sillon, et le lire saturerait la mémoire.
 */
export const MAX_RESTORE_BYTES = 100 * 1024 * 1024;

/** Au-delà de ce nombre de jours sans sauvegarde, la pastille passe en « warn » (DESIGN.md). */
export const BACKUP_OLD_AFTER_DAYS = 3;

// --- Bancs d'essai du lot 0 ---

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
