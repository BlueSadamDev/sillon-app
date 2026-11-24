// Rangement d'un vecteur dans la base : les nombres (Float32) sont écrits en base64, un texte compact
// (768 nombres → 4 096 caractères). Calcul pur, sans dépendance.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Map([...ALPHABET].map((c, i) => [c, i]));

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '=';
  }
  return out;
}

function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      ((LOOKUP.get(clean[i]) ?? 0) << 18) |
      ((LOOKUP.get(clean[i + 1]) ?? 0) << 12) |
      ((LOOKUP.get(clean[i + 2]) ?? 0) << 6) |
      (LOOKUP.get(clean[i + 3]) ?? 0);
    if (o < bytes.length) bytes[o++] = (n >> 16) & 255;
    if (o < bytes.length) bytes[o++] = (n >> 8) & 255;
    if (o < bytes.length) bytes[o++] = n & 255;
  }
  return bytes;
}

export function encodeVector(vector: ArrayLike<number>): string {
  const f32 = Float32Array.from(vector);
  return bytesToBase64(new Uint8Array(f32.buffer));
}

export function decodeVector(text: string): Float32Array {
  const bytes = base64ToBytes(text);
  return new Float32Array(bytes.buffer, 0, Math.floor(bytes.length / 4));
}
