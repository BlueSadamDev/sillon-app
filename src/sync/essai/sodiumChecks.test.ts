// Vérifie sur l'ordinateur les valeurs de référence du banc libsodium (lot 7.0), avec une
// autre bibliothèque (@noble/hashes) : le téléphone doit retrouver exactement les mêmes.
import { blake2b } from '@noble/hashes/blake2.js';

import { fromHex, NEEDED, presence, toHex, VECTORS } from './sodiumChecks';

jest.mock('react-native-libsodium', () => ({}));

it('BLAKE2b-512 de « abc » (RFC 7693)', () => {
  expect(toHex(blake2b(new TextEncoder().encode('abc'), { dkLen: 64 }))).toBe(VECTORS.blake2bAbc512);
});

it('dérivation de clé : même calcul que crypto_kdf_derive_from_key de libsodium', () => {
  const key = Uint8Array.from({ length: 32 }, (_, i) => i);
  const salt = new Uint8Array(16);
  new DataView(salt.buffer).setBigUint64(0, BigInt(VECTORS.kdfId), true);
  const personalization = new Uint8Array(16);
  personalization.set(new TextEncoder().encode(VECTORS.kdfContext));
  expect(toHex(blake2b(new Uint8Array(0), { dkLen: 32, key, salt, personalization }))).toBe(VECTORS.kdfSubkey);
});

it('convertit l’hexadécimal dans les deux sens', () => {
  expect(toHex(fromHex(VECTORS.ed25519Public))).toBe(VECTORS.ed25519Public);
});

it('signale les fonctions absentes', () => {
  const fake = { crypto_sign_keypair: () => null };
  const res = presence(fake);
  expect(res).toHaveLength(NEEDED.length);
  expect(res.filter((r) => r.present).map((r) => r.name)).toEqual(['crypto_sign_keypair']);
});
