// Branchements du compte sur le téléphone : coffre sécurisé, Argon2id (libsodium), empreinte digitale.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { crypto_pwhash, crypto_pwhash_ALG_ARGON2ID13, randombytes_buf } from 'react-native-libsodium';

import { t } from '@/texts/fr';

import type { Kdf } from './password';
import { PASSWORD_KDF } from './settings';
import type { SecretStore } from './store';

export const secureStore: SecretStore = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

export const argon2id: Kdf = (password, salt, opsLimit, memLimit, bytes) =>
  crypto_pwhash(bytes, password, salt, opsLimit, memLimit, crypto_pwhash_ALG_ARGON2ID13);

export function newSalt(): Uint8Array {
  return randombytes_buf(PASSWORD_KDF.saltBytes);
}

/** Le téléphone a un lecteur d'empreinte et au moins une empreinte enregistrée. */
export async function biometricsAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Demande l'empreinte. Renvoie true seulement si elle est reconnue. */
export async function askBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t.account.biometricsPrompt,
      cancelLabel: t.account.biometricsCancel,
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** Laisse l'écran s'afficher (message « Vérification… ») avant un calcul Argon2id qui bloque un instant. */
export function afterPaint(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}
