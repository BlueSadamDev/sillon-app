// Chiffrement des sauvegardes (prototype du lot 0) : libsodium, code natif.
// Clé : Argon2id (mot de passe + sel aléatoire). Chiffrement : XChaCha20-Poly1305,
// l'en-tête du fichier sert de donnée associée (il est donc lui aussi vérifié).

import {
  crypto_aead_xchacha20poly1305_ietf_decrypt,
  crypto_aead_xchacha20poly1305_ietf_encrypt,
  crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13,
  randombytes_buf,
} from 'react-native-libsodium';

import {
  concat,
  decodeHeader,
  encodeHeader,
  FORMAT_VERSION,
  HEADER_BYTES,
  KDF_ARGON2ID,
  NONCE_BYTES,
  SALT_BYTES,
  type ParseProblem,
} from './format';

const KEY_BYTES = 32;

export type Timings = { kdfMs: number; cipherMs: number };

export function deriveKey(password: string, salt: Uint8Array, opsLimit: number, memLimit: number): Uint8Array {
  return crypto_pwhash(KEY_BYTES, password, salt, opsLimit, memLimit, crypto_pwhash_ALG_ARGON2ID13);
}

export function encryptText(
  plain: string,
  password: string,
  opsLimit: number,
  memLimit: number,
): { file: Uint8Array; timings: Timings } {
  const salt = randombytes_buf(SALT_BYTES);
  const nonce = randombytes_buf(NONCE_BYTES);
  const header = encodeHeader({ version: FORMAT_VERSION, kdf: KDF_ARGON2ID, opsLimit, memLimit, salt, nonce });
  const t0 = Date.now();
  const key = deriveKey(password, salt, opsLimit, memLimit);
  const t1 = Date.now();
  const cipher = crypto_aead_xchacha20poly1305_ietf_encrypt(plain, header, null, nonce, key);
  const t2 = Date.now();
  key.fill(0);
  return { file: concat(header, cipher), timings: { kdfMs: t1 - t0, cipherMs: t2 - t1 } };
}

export type DecryptResult =
  | { ok: true; text: string; timings: Timings }
  | { ok: false; problem: ParseProblem | 'wrong-password-or-damaged' };

export function decryptFile(file: Uint8Array, password: string): DecryptResult {
  const parsed = decodeHeader(file);
  if ('problem' in parsed) return { ok: false, problem: parsed.problem };
  const { header } = parsed;
  const t0 = Date.now();
  const key = deriveKey(password, header.salt, header.opsLimit, header.memLimit);
  const t1 = Date.now();
  try {
    const text = crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      file.slice(HEADER_BYTES),
      file.slice(0, HEADER_BYTES),
      header.nonce,
      key,
      'text',
    );
    return { ok: true, text, timings: { kdfMs: t1 - t0, cipherMs: Date.now() - t1 } };
  } catch {
    return { ok: false, problem: 'wrong-password-or-damaged' };
  } finally {
    key.fill(0);
  }
}
