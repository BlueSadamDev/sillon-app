// Banc d'essai « Chiffrement » (lot 0) : mêmes calculs que la vraie sauvegarde (cipher.ts),
// avec la mesure des temps. Clé recalculée à chaque essai pour mesurer Argon2id.

import { createBackupKey, decryptWithKey, encryptWithKey, KEY_BYTES, type DecryptResult as CoreResult } from './cipher';
import { decodeHeader } from './format';
import { sodiumEngine } from './sodium';

export type Timings = { kdfMs: number; cipherMs: number };

export function encryptText(
  plain: string,
  password: string,
  opsLimit: number,
  memLimit: number,
): { file: Uint8Array; timings: Timings } {
  const t0 = Date.now();
  const k = createBackupKey(password, { opsLimit, memLimit }, sodiumEngine);
  const t1 = Date.now();
  const file = encryptWithKey(plain, k, sodiumEngine);
  const t2 = Date.now();
  k.key.fill(0);
  return { file, timings: { kdfMs: t1 - t0, cipherMs: t2 - t1 } };
}

export type DecryptResult =
  | { ok: true; text: string; timings: Timings }
  | { ok: false; problem: Exclude<CoreResult, { ok: true }>['problem'] };

export function decryptFile(file: Uint8Array, password: string): DecryptResult {
  const parsed = decodeHeader(file);
  if ('problem' in parsed) return { ok: false, problem: parsed.problem };
  const { salt, opsLimit, memLimit } = parsed.header;
  const t0 = Date.now();
  const key = sodiumEngine.argon2id(password, salt, opsLimit, memLimit, KEY_BYTES);
  const t1 = Date.now();
  const result = decryptWithKey(file, key, sodiumEngine);
  key.fill(0);
  return result.ok ? { ok: true, text: result.text, timings: { kdfMs: t1 - t0, cipherMs: Date.now() - t1 } } : result;
}
