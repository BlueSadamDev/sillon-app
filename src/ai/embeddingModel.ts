// Modèle d'embeddings du lot 3 : import manuel (sélecteur de fichiers d'Android), vérification de la
// taille et de l'empreinte SHA-256, copie dans l'espace privé de l'app, suppression.
// L'app ne télécharge jamais rien.
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { checkCandidate, checkDigest, isInstalledModelValid, type ModelRefusal, parseRecord } from './modelCheck';
import { EMBEDDING_MODEL, EMBEDDING_MODEL_RECORD, MODEL_IMPORT_MARGIN_BYTES, MODELS_DIR } from './settings';

export type InstalledModel = { uri: string; sizeBytes: number };

export type ModelImport =
  | { kind: 'canceled' }
  | { kind: 'installed'; model: InstalledModel }
  | { kind: 'refused'; reason: ModelRefusal };

function modelsDir(): Directory {
  const dir = new Directory(Paths.document, MODELS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

const modelFile = () => new File(modelsDir(), EMBEDDING_MODEL.fileName);
const recordFile = () => new File(modelsDir(), EMBEDDING_MODEL_RECORD);

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // copie temporaire : le cache est vidé par Android
  }
}

/** Le modèle vérifié, s'il est installé (sans recalculer l'empreinte). */
export function installedModel(): InstalledModel | null {
  try {
    const file = modelFile();
    const record = recordFile();
    const size = file.exists ? (file.size ?? null) : null;
    const saved = record.exists ? parseRecord(record.textSync()) : null;
    return isInstalledModelValid(saved, size) ? { uri: file.uri, sizeBytes: size! } : null;
  } catch {
    return null;
  }
}

/** Ouvre le sélecteur de fichiers, vérifie le fichier choisi et l'installe. */
export async function importEmbeddingModel(): Promise<ModelImport> {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (picked.canceled || picked.assets.length === 0) return { kind: 'canceled' };
  const asset = picked.assets[0];
  const temp = new File(asset.uri);
  const refuse = (reason: ModelRefusal): ModelImport => {
    deleteQuietly(temp);
    return { kind: 'refused', reason };
  };
  try {
    const size = temp.size ?? asset.size ?? 0;
    const early = checkCandidate({ name: asset.name, sizeBytes: size });
    if (early) return refuse(early);
    let free: number | null = null;
    try {
      free = Paths.availableDiskSpace;
    } catch {
      free = null;
    }
    if (free !== null && free < size + MODEL_IMPORT_MARGIN_BYTES) return refuse('no-space');
    const sha256 = await temp.digest('SHA-256');
    const wrong = checkDigest(sha256);
    if (wrong) return refuse(wrong);
    const target = modelFile();
    deleteQuietly(recordFile());
    deleteQuietly(target);
    await temp.move(target);
    const finalSize = target.size ?? size;
    const record = recordFile();
    record.create({ overwrite: true });
    await record.write(JSON.stringify({ modelId: EMBEDDING_MODEL.id, sha256: EMBEDDING_MODEL.sha256, sizeBytes: finalSize }));
    return { kind: 'installed', model: { uri: target.uri, sizeBytes: finalSize } };
  } catch {
    return refuse('unreadable');
  }
}

/** Supprime le modèle du téléphone. Les vecteurs déjà calculés sont gardés (ils resservent si on le réimporte). */
export function deleteEmbeddingModel(): void {
  deleteQuietly(recordFile());
  deleteQuietly(modelFile());
}
