// Import manuel d'un modèle (repris d'Aube) : sélecteur de fichiers d'Android, copie dans
// l'espace privé de l'app, taille et empreinte SHA-256 calculées sur le téléphone.
// L'app ne télécharge jamais rien. Lot 0 : on accepte n'importe quel .gguf pour le mesurer ;
// la liste des modèles acceptés (taille + empreinte attendues) viendra au lot 3.

import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { MODELS_DIR } from './settings';

export type StoredModel = { name: string; uri: string; sizeBytes: number };

export type ImportResult =
  | { kind: 'canceled' }
  | { kind: 'installed'; model: StoredModel; sha256: string; copyMs: number; hashMs: number }
  | { kind: 'refused'; reason: 'not-gguf' | 'no-space' | 'unreadable' };

function modelsDir(): Directory {
  const dir = new Directory(Paths.document, MODELS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function listModels(): StoredModel[] {
  try {
    return modelsDir()
      .list()
      .filter((e): e is File => e instanceof File && e.name.toLowerCase().endsWith('.gguf'))
      .map((f) => ({ name: f.name, uri: f.uri, sizeBytes: f.size ?? 0 }))
      .sort((a, b) => a.sizeBytes - b.sizeBytes);
  } catch {
    return [];
  }
}

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // copie temporaire : le cache est vidé par Android
  }
}

export async function importModel(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (picked.canceled || picked.assets.length === 0) return { kind: 'canceled' };
  const asset = picked.assets[0];
  const temp = new File(asset.uri);
  if (!asset.name.toLowerCase().endsWith('.gguf')) {
    deleteQuietly(temp);
    return { kind: 'refused', reason: 'not-gguf' };
  }
  try {
    const size = temp.size ?? 0;
    let free: number | null = null;
    try {
      free = Paths.availableDiskSpace;
    } catch {
      free = null;
    }
    if (free !== null && free < size + 200 * 1024 * 1024) {
      deleteQuietly(temp);
      return { kind: 'refused', reason: 'no-space' };
    }
    const h0 = Date.now();
    const sha256 = await temp.digest('SHA-256');
    const hashMs = Date.now() - h0;
    const target = new File(modelsDir(), asset.name);
    deleteQuietly(target);
    const c0 = Date.now();
    await temp.move(target);
    const copyMs = Date.now() - c0;
    return { kind: 'installed', model: { name: target.name, uri: target.uri, sizeBytes: target.size ?? size }, sha256, copyMs, hashMs };
  } catch {
    deleteQuietly(temp);
    return { kind: 'refused', reason: 'unreadable' };
  }
}

export function deleteModel(model: StoredModel): void {
  deleteQuietly(new File(model.uri));
}
