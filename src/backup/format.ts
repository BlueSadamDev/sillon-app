// Format du fichier chiffré : version 1, figée au lot 2 (prototype du lot 0 repris tel quel).
// Ne jamais modifier cette version : un changement de format = une nouvelle version, et l'app
// doit continuer à relire les anciennes (test automatique dans restore.test.ts).
//
// En-tête (tout en clair, mais protégé : il sert de « donnée associée » au chiffrement,
// donc toute modification fait échouer le déchiffrement) :
//   octets 0-3   : « SILN » (signature du format)
//   octet  4     : version du format
//   octet  5     : algorithme de dérivation de clé (1 = Argon2id)
//   octets 6-9   : opsLimit (entier 32 bits, gros-boutiste)
//   octets 10-13 : memLimit en Kio (entier 32 bits, gros-boutiste)
//   octets 14-29 : sel (16 octets)
//   octets 30-53 : nonce XChaCha20 (24 octets)
// Puis : texte chiffré + étiquette d'authentification (16 octets).

export const MAGIC = [0x53, 0x49, 0x4c, 0x4e]; // « SILN »
export const FORMAT_VERSION = 1;
export const KDF_ARGON2ID = 1;
export const SALT_BYTES = 16;
export const NONCE_BYTES = 24;
export const HEADER_BYTES = 4 + 1 + 1 + 4 + 4 + SALT_BYTES + NONCE_BYTES;

export type Header = {
  version: number;
  kdf: number;
  opsLimit: number;
  memLimit: number;
  salt: Uint8Array;
  nonce: Uint8Array;
};

export type ParseProblem = 'too-short' | 'not-sillon' | 'unknown-version' | 'unknown-kdf';

function writeU32(out: Uint8Array, offset: number, value: number): void {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

function readU32(src: Uint8Array, offset: number): number {
  return ((src[offset] << 24) | (src[offset + 1] << 16) | (src[offset + 2] << 8) | src[offset + 3]) >>> 0;
}

export function encodeHeader(h: Header): Uint8Array {
  if (h.salt.length !== SALT_BYTES || h.nonce.length !== NONCE_BYTES) {
    throw new Error('Sel ou nonce de mauvaise taille');
  }
  if (h.memLimit % 1024 !== 0) throw new Error('memLimit doit être un multiple de 1024');
  const out = new Uint8Array(HEADER_BYTES);
  out.set(MAGIC, 0);
  out[4] = h.version;
  out[5] = h.kdf;
  writeU32(out, 6, h.opsLimit);
  writeU32(out, 10, h.memLimit / 1024);
  out.set(h.salt, 14);
  out.set(h.nonce, 14 + SALT_BYTES);
  return out;
}

export function decodeHeader(file: Uint8Array): { header: Header } | { problem: ParseProblem } {
  if (file.length < HEADER_BYTES) return { problem: 'too-short' };
  for (let i = 0; i < MAGIC.length; i++) {
    if (file[i] !== MAGIC[i]) return { problem: 'not-sillon' };
  }
  const version = file[4];
  if (version !== FORMAT_VERSION) return { problem: 'unknown-version' };
  const kdf = file[5];
  if (kdf !== KDF_ARGON2ID) return { problem: 'unknown-kdf' };
  return {
    header: {
      version,
      kdf,
      opsLimit: readU32(file, 6),
      memLimit: readU32(file, 10) * 1024,
      salt: file.slice(14, 14 + SALT_BYTES),
      nonce: file.slice(14 + SALT_BYTES, HEADER_BYTES),
    },
  };
}

export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
