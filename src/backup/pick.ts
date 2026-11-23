// Choix d'un fichier de sauvegarde pour la restauration (sélecteur de fichiers d'Android).
// Le fichier est copié dans le cache de l'app, lu, puis la copie est supprimée.
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { MAX_RESTORE_BYTES } from './settings';

export type PickResult =
  | { ok: true; name: string; bytes: Uint8Array }
  | { ok: false; problem: 'cancelled' | 'unreadable' | 'too-big' };

export async function pickBackupFile(): Promise<PickResult> {
  let picked: DocumentPicker.DocumentPickerResult;
  try {
    picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  } catch {
    return { ok: false, problem: 'unreadable' };
  }
  if (picked.canceled || picked.assets.length === 0) return { ok: false, problem: 'cancelled' };
  const asset = picked.assets[0];
  const copy = new File(asset.uri);
  try {
    if ((asset.size ?? copy.size ?? 0) > MAX_RESTORE_BYTES) return { ok: false, problem: 'too-big' };
    return { ok: true, name: asset.name, bytes: await copy.bytes() };
  } catch {
    return { ok: false, problem: 'unreadable' };
  } finally {
    try {
      copy.delete();
    } catch {
      // copie déjà absente
    }
  }
}
