// Réglages du compte local. Aucun réglage en dur ailleurs : tout est ici.

/**
 * Empreinte du mot de passe du compte : Argon2id, 2 passes, 64 Mo (≈ 0,2 s mesurée sur le S21
 * au lot 0). Plus léger que la sauvegarde (256 Mo), car calculé à chaque déverrouillage par mot de passe.
 */
export const PASSWORD_KDF = { opsLimit: 2, memLimit: 64 * 1024 * 1024, saltBytes: 16, hashBytes: 32 } as const;

/** Longueur minimale du mot de passe du compte. */
export const MIN_PASSWORD_LENGTH = 8;

/** Longueur maximale de l'identifiant. */
export const MAX_USERNAME_LENGTH = 40;

/** Délais de verrouillage proposés (en minutes ; 0 = dès que l'app passe en arrière-plan). */
export const LOCK_DELAYS_MIN = [0, 1, 5, 15, 30] as const;
export const DEFAULT_LOCK_DELAY_MIN = 5;

/** Nom de la donnée du compte dans le coffre sécurisé du téléphone (expo-secure-store). */
export const ACCOUNT_KEY = 'sillon.account';

/** Identifiant de cet appareil (préparation au partage), dans le coffre sécurisé, à part du compte. */
export const DEVICE_ID_KEY = 'sillon.device';
