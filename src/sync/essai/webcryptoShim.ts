// Lot 7.0 : remplace « isomorphic-webcrypto » pour Yjs (voir metro.config.js).
// Yjs n'utilise que getRandomValues (identifiants d'appareil Yjs) : on le fournit avec libsodium.
import { randombytes_buf } from 'react-native-libsodium';

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) return array;
  const bytes = randombytes_buf(array.byteLength);
  new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
  return array;
}

const webcrypto = {
  ensureSecure: () => undefined,
  subtle: undefined,
  getRandomValues,
};

export default webcrypto;
