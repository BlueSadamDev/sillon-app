import { concat, decodeHeader, encodeHeader, FORMAT_VERSION, HEADER_BYTES, KDF_ARGON2ID } from './format';

const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
const nonce = Uint8Array.from({ length: 24 }, (_, i) => 100 + i);
const header = { version: FORMAT_VERSION, kdf: KDF_ARGON2ID, opsLimit: 3, memLimit: 256 * 1024 * 1024, salt, nonce };

describe('en-tête du fichier chiffré', () => {
  it('se relit à l’identique', () => {
    const bytes = encodeHeader(header);
    expect(bytes.length).toBe(HEADER_BYTES);
    const parsed = decodeHeader(concat(bytes, new Uint8Array([1, 2, 3])));
    expect(parsed).toEqual({ header });
  });

  it('refuse un fichier trop court, étranger ou d’une version inconnue', () => {
    expect(decodeHeader(new Uint8Array(10))).toEqual({ problem: 'too-short' });
    expect(decodeHeader(new Uint8Array(HEADER_BYTES))).toEqual({ problem: 'not-sillon' });
    const future = encodeHeader(header);
    future[4] = 99;
    expect(decodeHeader(future)).toEqual({ problem: 'unknown-version' });
    const otherKdf = encodeHeader(header);
    otherKdf[5] = 7;
    expect(decodeHeader(otherKdf)).toEqual({ problem: 'unknown-kdf' });
  });

  it('refuse un sel ou un nonce de mauvaise taille', () => {
    expect(() => encodeHeader({ ...header, salt: new Uint8Array(3) })).toThrow();
  });
});
