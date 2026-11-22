// Chiffrement des sauvegardes (format version 1, figé au lot 2).
//
// Clé : Argon2id (mot de passe de sauvegarde + sel aléatoire). Chiffrement : XChaCha20-Poly1305,
// l'en-tête du fichier sert de « donnée associée » : il est en clair, mais vérifié lui aussi.
//
// La clé est calculée une seule fois, à la configuration, puis gardée dans le coffre sécurisé du
// téléphone : chaque sauvegarde réutilise ce sel et ces réglages, avec un nonce neuf. Le mot de passe,
// lui, n'est jamais gardé. À la restauration, la clé est recalculée à partir du mot de passe et de
// l'en-tête du fichier.
//
// Les calculs passent par un « moteur » : libsodium (code natif) dans l'app, une bibliothèque
// JavaScript compatible dans les tests sur l'ordinateur. Le format du fichier est le même.

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

export const KEY_BYTES = 32;

export interface CryptoEngine {
  /** Argon2id (version 1.3, 1 fil) ; memLimit en octets. */
  argon2id(password: string, salt: Uint8Array, opsLimit: number, memLimit: number, bytes: number): Uint8Array;
  /** XChaCha20-Poly1305 : renvoie le texte chiffré suivi de l'étiquette d'authentification. */
  seal(plain: string, associatedData: string, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  /** Inverse de seal ; lève une erreur si la clé est mauvaise ou le fichier abîmé. */
  open(cipher: Uint8Array, associatedData: string, nonce: Uint8Array, key: Uint8Array): string;
  random(bytes: number): Uint8Array;
}

export type KdfParams = { opsLimit: number; memLimit: number };

/** Clé de sauvegarde et réglages qui ont servi à la calculer (gardés dans le coffre sécurisé). */
export type BackupKey = KdfParams & { salt: Uint8Array; key: Uint8Array };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 standard, avec « = » final (même résultat que libsodium, variante ORIGINAL). */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

export function fromBase64(text: string): Uint8Array | null {
  const clean = text.replace(/=+$/, '');
  if (/[^A-Za-z0-9+/]/.test(clean) || clean.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let o = 0;
  for (const ch of clean) {
    value = (value << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (value >> bits) & 0xff;
    }
  }
  return out;
}

/**
 * Donnée associée : libsodium (react-native-libsodium) n'accepte que du texte à cet endroit.
 * L'en-tête est donc passé en base64 (transformation fixe et réversible) : il reste vérifié octet par octet.
 */
function associatedData(header: Uint8Array): string {
  return toBase64(header);
}

/** Calcule la clé de sauvegarde à partir du mot de passe (à la configuration, environ 1,2 s sur le S21). */
export function createBackupKey(password: string, params: KdfParams, engine: CryptoEngine): BackupKey {
  const salt = engine.random(SALT_BYTES);
  const key = engine.argon2id(password, salt, params.opsLimit, params.memLimit, KEY_BYTES);
  return { ...params, salt, key };
}

/** Chiffre le contenu d'une sauvegarde avec la clé gardée (rapide : aucun calcul Argon2id). */
export function encryptWithKey(plain: string, k: BackupKey, engine: CryptoEngine): Uint8Array {
  const nonce = engine.random(NONCE_BYTES);
  const header = encodeHeader({
    version: FORMAT_VERSION,
    kdf: KDF_ARGON2ID,
    opsLimit: k.opsLimit,
    memLimit: k.memLimit,
    salt: k.salt,
    nonce,
  });
  return concat(header, engine.seal(plain, associatedData(header), nonce, k.key));
}

export type DecryptProblem = ParseProblem | 'wrong-password-or-damaged';
export type DecryptResult = { ok: true; text: string } | { ok: false; problem: DecryptProblem };

/** Déchiffre avec une clé déjà calculée (la clé doit correspondre au sel de l'en-tête). */
export function decryptWithKey(file: Uint8Array, key: Uint8Array, engine: CryptoEngine): DecryptResult {
  const parsed = decodeHeader(file);
  if ('problem' in parsed) return { ok: false, problem: parsed.problem };
  try {
    const text = engine.open(
      file.slice(HEADER_BYTES),
      associatedData(file.slice(0, HEADER_BYTES)),
      parsed.header.nonce,
      key,
    );
    return { ok: true, text };
  } catch {
    return { ok: false, problem: 'wrong-password-or-damaged' };
  }
}

/** Déchiffre avec le mot de passe (restauration) : la clé est recalculée à partir de l'en-tête. */
export function decryptWithPassword(file: Uint8Array, password: string, engine: CryptoEngine): DecryptResult {
  const parsed = decodeHeader(file);
  if ('problem' in parsed) return { ok: false, problem: parsed.problem };
  const { salt, opsLimit, memLimit } = parsed.header;
  const key = engine.argon2id(password, salt, opsLimit, memLimit, KEY_BYTES);
  try {
    return decryptWithKey(file, key, engine);
  } finally {
    key.fill(0);
  }
}
