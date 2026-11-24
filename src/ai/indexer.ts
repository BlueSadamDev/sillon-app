// Calcul des vecteurs des notes : à l'enregistrement et en rattrapage, par petits lots avec une pause
// entre deux, pour ne pas bloquer l'app. Lit seulement la table « notes » (via src/db) et n'écrit que
// des vecteurs : aucune note n'est modifiée ici.
import type { VectorProgress, VectorsRepo } from '@/db/vectorsRepo';

import { documentText, isBlank, textHash } from './noteText';
import { INDEXING } from './settings';

/** Le moteur qui transforme un texte en vecteur (llama.rn dans l'app, simulé dans les tests). */
export type EmbeddingEngine = { embed(text: string): Promise<ArrayLike<number>> };

export type IndexOutcome = 'done' | 'stopped' | 'failed';

type Deps = {
  vectors: Pick<VectorsRepo, 'pending' | 'save' | 'confirm' | 'cleanup' | 'progress'>;
  engine: EmbeddingEngine;
  modelId: string;
  dimension: number;
  sleep?: (ms: number) => Promise<void>;
  onProgress?: (p: VectorProgress) => void;
  batchSize?: number;
  pauseMs?: number;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isValidVector(v: ArrayLike<number>, dimension: number): boolean {
  if (v.length !== dimension) return false;
  for (let i = 0; i < v.length; i++) if (!Number.isFinite(v[i])) return false;
  return true;
}

export function createIndexer({
  vectors,
  engine,
  modelId,
  dimension,
  sleep = wait,
  onProgress,
  batchSize = INDEXING.batchSize,
  pauseMs = INDEXING.pauseMs,
}: Deps) {
  let stopRequested = false;
  let running: Promise<IndexOutcome> | null = null;
  let again = false;

  async function pass(): Promise<IndexOutcome> {
    await vectors.cleanup(modelId);
    onProgress?.(await vectors.progress(modelId));
    // Une note qui échoue n'est pas reprise dans le même passage (évite de tourner en boucle).
    const failed = new Set<string>();
    for (;;) {
      if (stopRequested) return 'stopped';
      const batch = (await vectors.pending(modelId, batchSize + failed.size)).filter((n) => !failed.has(n.id));
      if (batch.length === 0) return failed.size > 0 ? 'failed' : 'done';
      for (const note of batch.slice(0, batchSize)) {
        if (stopRequested) return 'stopped';
        const text = documentText(note);
        const hash = textHash(text);
        if (note.knownHash === hash) {
          await vectors.confirm(note.id, note.updatedAt);
          continue;
        }
        if (isBlank(note)) {
          // Note vide : rien à comparer, un vecteur vide la marque comme traitée.
          await vectors.save(note.id, { modelId, textHash: hash, sourceUpdatedAt: note.updatedAt, vector: [] });
          continue;
        }
        let vector: ArrayLike<number>;
        try {
          vector = await engine.embed(text);
        } catch {
          failed.add(note.id);
          continue;
        }
        // Garde-fou (défaut de llama.rn 0.12.9) : un vecteur de mauvaise taille n'est jamais rangé.
        if (!isValidVector(vector, dimension)) return 'failed';
        await vectors.save(note.id, { modelId, textHash: hash, sourceUpdatedAt: note.updatedAt, vector });
      }
      onProgress?.(await vectors.progress(modelId));
      await sleep(pauseMs);
    }
  }

  return {
    /**
     * Calcule tout ce qui manque. Un appel pendant un calcul en cours en relance un à la fin
     * (une note enregistrée entre-temps n'est pas oubliée).
     */
    run(): Promise<IndexOutcome> {
      stopRequested = false;
      if (running) {
        again = true;
        return running;
      }
      running = (async () => {
        let outcome: IndexOutcome;
        do {
          again = false;
          outcome = await pass();
        } while (again && outcome === 'done' && !stopRequested);
        running = null;
        return outcome;
      })();
      return running;
    },
    /** Arrête après la note en cours (app mise en arrière-plan, modèle supprimé…). */
    stop(): void {
      stopRequested = true;
    },
    get busy(): boolean {
      return running !== null;
    },
  };
}

export type Indexer = ReturnType<typeof createIndexer>;
