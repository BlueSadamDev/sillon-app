// Moteur de chiffrement de l'app : libsodium (react-native-libsodium, code natif).
import {
  crypto_aead_xchacha20poly1305_ietf_decrypt,
  crypto_aead_xchacha20poly1305_ietf_encrypt,
  crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13,
  randombytes_buf,
  to_string,
} from 'react-native-libsodium';

import type { CryptoEngine } from './cipher';

export const sodiumEngine: CryptoEngine = {
  argon2id: (password, salt, opsLimit, memLimit, bytes) =>
    crypto_pwhash(bytes, password, salt, opsLimit, memLimit, crypto_pwhash_ALG_ARGON2ID13),
  seal: (plain, ad, nonce, key) => crypto_aead_xchacha20poly1305_ietf_encrypt(plain, ad, null, nonce, key),
  // La sortie « text » de react-native-libsodium n'est pas implémentée : on décode l'UTF-8 ici.
  open: (cipher, ad, nonce, key) => to_string(crypto_aead_xchacha20poly1305_ietf_decrypt(null, cipher, ad, nonce, key)),
  random: (bytes) => randombytes_buf(bytes),
};
