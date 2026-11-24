// Configuration de la sauvegarde (calcul pur) : ce qui est gardé dans le coffre sécurisé du téléphone.
//
// On garde : l'adresse du dossier choisi (permission persistante d'Android) et son nom affiché ;
// la clé de sauvegarde (résultat d'Argon2id) avec son sel et ses réglages.
// On ne garde jamais le mot de passe de sauvegarde.

import { type BackupKey, fromBase64, KEY_BYTES, toBase64 } from './cipher';
import { SALT_BYTES } from './format';
import { MIN_BACKUP_PASSWORD_LENGTH } from './settings';

export type BackupFolder = { uri: string; name: string };

export type BackupConfig = { folder: BackupFolder | null; key: BackupKey | null };

export const EMPTY_CONFIG: BackupConfig = { folder: null, key: null };

/** La sauvegarde peut tourner : dossier choisi et mot de passe créé. */
export function isConfigured(c: BackupConfig): boolean {
  return c.folder !== null && c.key !== null;
}

type Stored = {
  v: 1;
  folder: BackupFolder | null;
  key: { opsLimit: number; memLimit: number; salt: string; key: string } | null;
};

export function serializeConfig(c: BackupConfig): string {
  const stored: Stored = {
    v: 1,
    folder: c.folder,
    key: c.key
      ? { opsLimit: c.key.opsLimit, memLimit: c.key.memLimit, salt: toBase64(c.key.salt), key: toBase64(c.key.key) }
      : null,
  };
  return JSON.stringify(stored);
}

/** Relit la configuration ; une partie illisible est ignorée (elle sera redemandée). */
export function parseConfig(raw: string | null): BackupConfig {
  if (raw === null) return EMPTY_CONFIG;
  let data: Partial<Stored>;
  try {
    data = JSON.parse(raw) as Partial<Stored>;
  } catch {
    return EMPTY_CONFIG;
  }
  if (data.v !== 1) return EMPTY_CONFIG;
  const f = data.folder;
  const folder =
    f && typeof f.uri === 'string' && f.uri !== '' && typeof f.name === 'string' ? { uri: f.uri, name: f.name } : null;
  let key: BackupKey | null = null;
  const k = data.key;
  if (k && typeof k.opsLimit === 'number' && typeof k.memLimit === 'number' && typeof k.salt === 'string' && typeof k.key === 'string') {
    const salt = fromBase64(k.salt);
    const bytes = fromBase64(k.key);
    if (salt?.length === SALT_BYTES && bytes?.length === KEY_BYTES) {
      key = { opsLimit: k.opsLimit, memLimit: k.memLimit, salt, key: bytes };
    }
  }
  return { folder, key };
}

export type BackupPasswordProblem = 'short' | 'mismatch';

export function checkBackupPassword(password: string, confirm: string): BackupPasswordProblem | null {
  if (password.length < MIN_BACKUP_PASSWORD_LENGTH) return 'short';
  if (password !== confirm) return 'mismatch';
  return null;
}

/** Nom lisible d'un dossier choisi avec le sélecteur d'Android (adresse content:// encodée). */
export function folderDisplayName(name: string, uri: string): string {
  const pick = (s: string) => {
    let n = s;
    try {
      n = decodeURIComponent(s);
    } catch {
      // déjà lisible
    }
    n = n.replace(/\/+$/, '');
    const cut = Math.max(n.lastIndexOf('/'), n.lastIndexOf(':'));
    return (cut >= 0 ? n.slice(cut + 1) : n).trim();
  };
  return pick(name) || pick(uri);
}
