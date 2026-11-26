// Lot 7.0 (banc d'essai) : fonctions de libsodium nécessaires à la synchronisation
// (étude, section 5) : présentes ? justes ? rapides ?
// Valeurs de référence : RFC 8032 (Ed25519, test 1), RFC 7693 (BLAKE2b-512 de « abc »), et une
// dérivation de clé calculée sur l'ordinateur avec @noble/hashes (voir sodiumChecks.test.ts).
import * as sodium from 'react-native-libsodium';

export const VECTORS = {
  ed25519Seed: '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60',
  ed25519Public: 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',
  ed25519SigEmpty:
    'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b',
  blake2bAbc512:
    'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
  /** crypto_kdf_derive_from_key(32, 7, 'SillonV1', clé 00 01 02 … 1f). */
  kdfId: 7,
  kdfContext: 'SillonV1',
  kdfSubkey: '93f5ef5dc55e05f58b7c57df29c727e98ff301071dd5d609fe6b79eba217b33d',
};

/** Fonctions attendues (étude, section 5) et celles qui manquent dans react-native-libsodium 1.7.0. */
export const NEEDED = [
  'crypto_sign_keypair',
  'crypto_sign_seed_keypair',
  'crypto_sign_detached',
  'crypto_sign_verify_detached',
  'crypto_sign_ed25519_pk_to_curve25519',
  'crypto_sign_ed25519_sk_to_curve25519',
  'crypto_box_keypair',
  'crypto_box_seed_keypair',
  'crypto_box_seal',
  'crypto_box_seal_open',
  'crypto_generichash',
  'crypto_kdf_derive_from_key',
  'crypto_kdf_keygen',
  'crypto_aead_xchacha20poly1305_ietf_encrypt',
  'crypto_aead_xchacha20poly1305_ietf_decrypt',
  'randombytes_buf',
] as const;

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const now = () => performance.now();

/** Les fonctions de la liste sont-elles fournies par la bibliothèque installée ? */
export function presence(lib: Record<string, unknown> = sodium): { name: string; present: boolean }[] {
  return NEEDED.map((name) => ({ name, present: typeof lib[name] === 'function' }));
}

type Check = { label: string; ok: boolean; detail?: string };

function attempt(label: string, fn: () => boolean | string): Check {
  try {
    const r = fn();
    return typeof r === 'string' ? { label, ok: false, detail: r } : { label, ok: r };
  } catch (e) {
    return { label, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function refused(fn: () => unknown): boolean {
  try {
    const r = fn();
    return r === false || r === null;
  } catch {
    return true;
  }
}

/** Vérifie l'exactitude des fonctions avec les valeurs de référence et les refus attendus. */
export function correctness(): Check[] {
  const checks: Check[] = [];
  const kp = sodium.crypto_sign_seed_keypair(fromHex(VECTORS.ed25519Seed));
  checks.push(attempt('Ed25519 : clé publique de référence (RFC 8032)', () => toHex(kp.publicKey) === VECTORS.ed25519Public));
  checks.push(
    attempt('Ed25519 : signature de référence (RFC 8032)', () => toHex(sodium.crypto_sign_detached(new Uint8Array(0), kp.privateKey)) === VECTORS.ed25519SigEmpty),
  );
  checks.push(
    attempt('Ed25519 : signature de référence acceptée', () =>
      sodium.crypto_sign_verify_detached(fromHex(VECTORS.ed25519SigEmpty), new Uint8Array(0), kp.publicKey),
    ),
  );
  const msg = new Uint8Array(64).fill(7);
  const sig = sodium.crypto_sign_detached(msg, kp.privateKey);
  checks.push(
    attempt('Ed25519 : message modifié refusé', () => {
      const bad = msg.slice();
      bad[0] ^= 1;
      return refused(() => sodium.crypto_sign_verify_detached(sig, bad, kp.publicKey));
    }),
  );
  checks.push(
    attempt('Ed25519 : autre appareil refusé', () => {
      const other = sodium.crypto_sign_keypair();
      return refused(() => sodium.crypto_sign_verify_detached(sig, msg, other.publicKey));
    }),
  );
  checks.push(
    attempt('Ed25519 → X25519 (clé publique) : 32 octets', () => sodium.crypto_sign_ed25519_pk_to_curve25519(kp.publicKey).length === 32),
  );

  const box = sodium.crypto_box_keypair();
  const vaultKey = sodium.randombytes_buf(32);
  const sealed = sodium.crypto_box_seal(vaultKey, box.publicKey);
  checks.push(
    attempt('Boîte scellée : clé de coffre retrouvée (32 + 48 octets)', () => {
      const opened = sodium.crypto_box_seal_open(sealed, box.publicKey, box.privateKey);
      return sealed.length === 80 && toHex(opened) === toHex(vaultKey);
    }),
  );
  checks.push(
    attempt('Boîte scellée : autre appareil refusé', () => {
      const other = sodium.crypto_box_keypair();
      return refused(() => sodium.crypto_box_seal_open(sealed, other.publicKey, other.privateKey));
    }),
  );
  checks.push(
    attempt('Boîte scellée : contenu abîmé refusé', () => {
      const bad = sealed.slice();
      bad[40] ^= 1;
      return refused(() => sodium.crypto_box_seal_open(bad, box.publicKey, box.privateKey));
    }),
  );

  checks.push(
    attempt('BLAKE2b-512 de « abc » (RFC 7693)', () => toHex(sodium.crypto_generichash(64, new Uint8Array([97, 98, 99]), null)) === VECTORS.blake2bAbc512),
  );
  checks.push(
    attempt('BLAKE2b avec clé : 32 octets, dépend de la clé', () => {
      const a = sodium.crypto_generichash(32, msg, new Uint8Array(32).fill(1));
      const b = sodium.crypto_generichash(32, msg, new Uint8Array(32).fill(2));
      return a.length === 32 && toHex(a) !== toHex(b);
    }),
  );
  checks.push(
    attempt('Dérivation de clé (crypto_kdf) : valeur de référence', () => {
      const master = Uint8Array.from({ length: 32 }, (_, i) => i);
      return toHex(sodium.crypto_kdf_derive_from_key(32, VECTORS.kdfId, VECTORS.kdfContext, master)) === VECTORS.kdfSubkey;
    }),
  );

  const key = sodium.randombytes_buf(32);
  const nonce = sodium.randombytes_buf(24);
  const ad = 'docId=fictif;deviceId=essai;seq=1;epoch=1;kind=update';
  const cipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(msg, ad, null, nonce, key);
  checks.push(
    attempt('XChaCha20-Poly1305 : aller-retour avec donnée associée (texte)', () => {
      const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, cipher, ad, nonce, key);
      return toHex(plain) === toHex(msg);
    }),
  );
  checks.push(
    attempt('XChaCha20-Poly1305 : message déplacé (autre donnée associée) refusé', () =>
      refused(() => sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, cipher, ad.replace('seq=1', 'seq=2'), nonce, key)),
    ),
  );
  checks.push(
    attempt('XChaCha20-Poly1305 : donnée associée en octets (limite du lot 0)', () => {
      try {
        sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(msg, new Uint8Array([1, 2]) as never, null, nonce, key);
        return true;
      } catch {
        return 'toujours refusée : passer la donnée associée en texte (base64)';
      }
    }),
  );
  return checks;
}

export type Timing = { label: string; perOpMs: number; runs: number };

function time(label: string, runs: number, fn: () => void): Timing {
  const t0 = now();
  for (let i = 0; i < runs; i++) fn();
  return { label, runs, perOpMs: (now() - t0) / runs };
}

/** Temps moyen de chaque opération sur le téléphone. */
export function speed(): Timing[] {
  const kp = sodium.crypto_sign_keypair();
  const box = sodium.crypto_box_keypair();
  const small = sodium.randombytes_buf(1024);
  const big = sodium.randombytes_buf(64 * 1024);
  const sig = sodium.crypto_sign_detached(small, kp.privateKey);
  const key = sodium.randombytes_buf(32);
  const nonce = sodium.randombytes_buf(24);
  const sealed = sodium.crypto_box_seal(key, box.publicKey);
  return [
    time('Paire de clés Ed25519', 200, () => sodium.crypto_sign_keypair()),
    time('Signature Ed25519 (1 Kio)', 1000, () => sodium.crypto_sign_detached(small, kp.privateKey)),
    time('Vérification Ed25519 (1 Kio)', 1000, () => sodium.crypto_sign_verify_detached(sig, small, kp.publicKey)),
    time('Paire de clés X25519', 200, () => sodium.crypto_box_keypair()),
    time('Boîte scellée (32 octets)', 500, () => sodium.crypto_box_seal(key, box.publicKey)),
    time('Ouverture de boîte scellée', 500, () => sodium.crypto_box_seal_open(sealed, box.publicKey, box.privateKey)),
    time('BLAKE2b-256 (1 Kio)', 1000, () => sodium.crypto_generichash(32, small, null)),
    time('BLAKE2b-256 (64 Kio)', 200, () => sodium.crypto_generichash(32, big, null)),
    time('Dérivation de clé (crypto_kdf)', 1000, () => sodium.crypto_kdf_derive_from_key(32, 1, 'SillonV1', key)),
    time('XChaCha20-Poly1305 (1 Kio)', 1000, () => sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(small, 'ad', null, nonce, key)),
    time('XChaCha20-Poly1305 (64 Kio)', 200, () => sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(big, 'ad', null, nonce, key)),
  ];
}
