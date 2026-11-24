// Données du compte, rangées dans le coffre sécurisé du téléphone (expo-secure-store).
// On y garde l'identifiant, l'empreinte du mot de passe et les réglages de déverrouillage.
import { DEFAULT_LOCK_DELAY_MIN } from './settings';
import type { PasswordRecord } from './password';

export type Account = {
  username: string;
  password: PasswordRecord;
  biometrics: boolean;
  lockDelayMin: number;
  /** Identifiant d'auteur des notes (préparation au partage). Vide pour un compte d'avant : voir identity.ts. */
  authorId: string;
};

/** Coffre clé → texte : expo-secure-store dans l'app, une table en mémoire dans les tests. */
export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function parseAccount(raw: string | null): Account | null {
  if (raw === null) return null;
  try {
    const a = JSON.parse(raw) as Partial<Account>;
    if (typeof a.username !== 'string' || !a.password || a.password.v !== 1) return null;
    return {
      username: a.username,
      password: a.password,
      biometrics: a.biometrics === true,
      lockDelayMin: typeof a.lockDelayMin === 'number' ? a.lockDelayMin : DEFAULT_LOCK_DELAY_MIN,
      authorId: typeof a.authorId === 'string' ? a.authorId : '',
    };
  } catch {
    return null;
  }
}
