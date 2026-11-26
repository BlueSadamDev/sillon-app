// Enveloppe d'un message de synchronisation (étude, section 7.1), version prototype du lot 7.0.
// Le relais vérifie la signature de l'appareil et range le message. Il ne voit jamais le contenu :
// `payload` est chiffré par l'appareil (XChaCha20-Poly1305), avec une clé que le relais n'a pas.
// La même construction est écrite côté app dans src/sync/essai/envelope.ts : le vecteur de test
// partagé (test/envelope.test.ts et src/sync/essai/envelope.test.ts) garantit qu'elles concordent.
import { createPublicKey, verify, type KeyObject } from 'node:crypto';

export type Kind = 'update' | 'snapshot';

export type Envelope = {
  docId: string;
  deviceId: string;
  seq: number;
  epoch: number;
  kind: Kind;
  /** Contenu chiffré, en base64. */
  payload: string;
  /** Signature Ed25519 de l'en-tête et du contenu chiffré, en base64. */
  sig: string;
};

export const MAX_PAYLOAD_BYTES = 64 * 1024;
const ID = /^[A-Za-z0-9_-]{16,64}$/;

/** En-tête signé (et donnée associée du chiffrement côté app). */
export function header(e: Pick<Envelope, 'docId' | 'deviceId' | 'seq' | 'epoch' | 'kind'>): string {
  return `sillon-v0\n${e.docId}\n${e.deviceId}\n${e.seq}\n${e.epoch}\n${e.kind}\n`;
}

export function signedBytes(e: Pick<Envelope, 'docId' | 'deviceId' | 'seq' | 'epoch' | 'kind'>, payload: Uint8Array): Uint8Array {
  const head = new TextEncoder().encode(header(e));
  const out = new Uint8Array(head.length + payload.length);
  out.set(head, 0);
  out.set(payload, head.length);
  return out;
}

/** Texte signé par l'appareil pour répondre au défi du relais. */
export function challengeText(nonce: string): string {
  return `sillon-relais-v0\nauth\n${nonce}`;
}

/** L'identifiant d'appareil est sa clé publique Ed25519, en base64url (43 caractères). */
export function publicKeyOf(deviceId: string): KeyObject | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(deviceId)) return null;
  try {
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: deviceId }, format: 'jwk' });
  } catch {
    return null;
  }
}

export function verifySig(deviceId: string, data: Uint8Array, sigB64: string): boolean {
  const key = publicKeyOf(deviceId);
  if (!key) return false;
  const sig = Buffer.from(sigB64, 'base64');
  if (sig.length !== 64) return false;
  try {
    return verify(null, data, key, sig);
  } catch {
    return false;
  }
}

/** Vérifie la forme de l'enveloppe et sa signature. Renvoie le contenu chiffré, ou la raison du refus. */
export function checkEnvelope(e: unknown, from: string): { ok: true; env: Envelope; payload: Buffer } | { ok: false; reason: string } {
  const env = e as Envelope;
  if (!env || typeof env !== 'object') return { ok: false, reason: 'forme' };
  if (typeof env.docId !== 'string' || !ID.test(env.docId)) return { ok: false, reason: 'docId' };
  if (env.deviceId !== from) return { ok: false, reason: 'appareil' };
  if (!Number.isSafeInteger(env.seq) || env.seq < 1) return { ok: false, reason: 'seq' };
  if (!Number.isSafeInteger(env.epoch) || env.epoch < 1) return { ok: false, reason: 'epoch' };
  if (env.kind !== 'update' && env.kind !== 'snapshot') return { ok: false, reason: 'kind' };
  if (typeof env.payload !== 'string' || typeof env.sig !== 'string') return { ok: false, reason: 'forme' };
  const payload = Buffer.from(env.payload, 'base64');
  if (payload.length === 0 || payload.length > MAX_PAYLOAD_BYTES) return { ok: false, reason: 'taille' };
  if (!verifySig(from, signedBytes(env, payload), env.sig)) return { ok: false, reason: 'signature' };
  return { ok: true, env, payload };
}
