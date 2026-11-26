/// <reference types="node" />
// Tests sur l'ordinateur : remplace « isomorphic-webcrypto » (voir metro.config.js) par le
// générateur aléatoire de Node.js. Jamais utilisé dans l'app.
import { webcrypto } from 'crypto';

const shim = {
  ensureSecure: () => undefined,
  subtle: webcrypto.subtle,
  getRandomValues: <T extends ArrayBufferView | null>(a: T): T => webcrypto.getRandomValues(a as never) as T,
};

export default shim;
