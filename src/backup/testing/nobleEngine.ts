/// <reference types="node" />
// Moteur de chiffrement pour les tests sur l'ordinateur : bibliothèques JavaScript @noble,
// mêmes algorithmes que libsodium (Argon2id 1.3 à 1 fil, XChaCha20-Poly1305 IETF).
// Jamais utilisé par l'app.
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { argon2id } from '@noble/hashes/argon2.js';
import { randomBytes } from 'node:crypto';

import type { CryptoEngine } from '../cipher';

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder('utf-8', { fatal: true });

export const nobleEngine: CryptoEngine = {
  argon2id: (password, salt, opsLimit, memLimit, bytes) =>
    argon2id(utf8.encode(password), salt, { t: opsLimit, m: memLimit / 1024, p: 1, dkLen: bytes }),
  seal: (plain, ad, nonce, key) => xchacha20poly1305(key, nonce, utf8.encode(ad)).encrypt(utf8.encode(plain)),
  open: (cipher, ad, nonce, key) => fromUtf8.decode(xchacha20poly1305(key, nonce, utf8.encode(ad)).decrypt(cipher)),
  random: (bytes) => new Uint8Array(randomBytes(bytes)),
};
