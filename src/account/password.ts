// Empreinte du mot de passe du compte (calcul pur ; la fonction Argon2id est fournie par l'app).
// Seule l'empreinte est gardée : le mot de passe lui-même n'est jamais stocké.
import { PASSWORD_KDF } from './settings';

/** Calcul de clé Argon2id : libsodium dans l'app, une fonction simulée dans les tests. */
export type Kdf = (password: string, salt: Uint8Array, opsLimit: number, memLimit: number, bytes: number) => Uint8Array;

export type PasswordRecord = {
  v: 1;
  alg: 'argon2id';
  opsLimit: number;
  memLimit: number;
  salt: string;
  hash: string;
};

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Comparaison en temps constant (ne révèle pas où les deux valeurs diffèrent). */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function hashPassword(password: string, kdf: Kdf, salt: Uint8Array): PasswordRecord {
  const { opsLimit, memLimit, hashBytes } = PASSWORD_KDF;
  const hash = kdf(password, salt, opsLimit, memLimit, hashBytes);
  const record: PasswordRecord = { v: 1, alg: 'argon2id', opsLimit, memLimit, salt: toHex(salt), hash: toHex(hash) };
  hash.fill(0);
  return record;
}

export function verifyPassword(password: string, record: PasswordRecord, kdf: Kdf): boolean {
  const expected = fromHex(record.hash);
  const actual = kdf(password, fromHex(record.salt), record.opsLimit, record.memLimit, expected.length);
  const ok = sameBytes(actual, expected);
  actual.fill(0);
  return ok;
}
