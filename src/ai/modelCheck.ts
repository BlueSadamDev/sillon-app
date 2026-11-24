// Vérification du fichier du modèle d'embeddings (taille, puis empreinte SHA-256). Calculs purs.
import { EMBEDDING_MODEL } from './settings';

export type ModelRefusal = 'not-gguf' | 'wrong-size' | 'wrong-file' | 'no-space' | 'unreadable';

/** Premier tri, avant le calcul de l'empreinte (qui prend quelques secondes). */
export function checkCandidate(file: { name: string; sizeBytes: number }): ModelRefusal | null {
  if (!file.name.toLowerCase().endsWith('.gguf')) return 'not-gguf';
  if (file.sizeBytes < EMBEDDING_MODEL.minBytes || file.sizeBytes > EMBEDDING_MODEL.maxBytes) return 'wrong-size';
  return null;
}

export function checkDigest(sha256: string): ModelRefusal | null {
  return sha256.trim().toLowerCase() === EMBEDDING_MODEL.sha256 ? null : 'wrong-file';
}

/** Ce qui est gardé après une vérification réussie. */
export type ModelRecord = { modelId: string; sha256: string; sizeBytes: number };

export function parseRecord(text: string | null): ModelRecord | null {
  if (!text) return null;
  try {
    const r = JSON.parse(text) as Partial<ModelRecord>;
    if (typeof r.modelId !== 'string' || typeof r.sha256 !== 'string' || typeof r.sizeBytes !== 'number') return null;
    return { modelId: r.modelId, sha256: r.sha256, sizeBytes: r.sizeBytes };
  } catch {
    return null;
  }
}

/** Le modèle installé est-il toujours celui qui a été vérifié ? (fichier présent, même taille, bonne empreinte) */
export function isInstalledModelValid(record: ModelRecord | null, fileSizeBytes: number | null): boolean {
  return (
    record !== null &&
    fileSizeBytes !== null &&
    record.modelId === EMBEDDING_MODEL.id &&
    record.sha256 === EMBEDDING_MODEL.sha256 &&
    record.sizeBytes === fileSizeBytes
  );
}
