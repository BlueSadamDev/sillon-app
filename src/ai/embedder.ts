// Calcul des embeddings avec llama.rn : tout est local, le moteur reçoit le chemin
// d'un fichier déjà présent sur le téléphone. Modèle chargé à la demande, puis libéré.

import { initLlama, type LlamaContext } from 'llama.rn';

import { EMBEDDING_ENGINE } from './settings';

export type LoadedEmbedder = {
  ctx: LlamaContext;
  loadMs: number;
  description: string;
  /** Taille attendue des vecteurs, lue dans le fichier du modèle. */
  dimension: number;
};

/**
 * Défaut de llama.rn 0.12.9 (corrigé dans la 0.13) : la taille des vecteurs est retenue au premier
 * calcul et réutilisée pour tous les modèles suivants tant que l'app tourne. Un deuxième modèle de
 * taille différente donne alors des vecteurs faux. On retient donc le premier modèle de la session.
 */
let firstModelThisSession: string | null = null;

/** Vrai si un autre modèle a déjà servi depuis l'ouverture de l'app (il faut la fermer complètement). */
export function needsAppRestart(modelUri: string): boolean {
  return firstModelThisSession !== null && firstModelThisSession !== modelUri;
}

export async function loadEmbedder(modelUri: string): Promise<LoadedEmbedder> {
  const t0 = Date.now();
  const ctx = await initLlama({
    model: modelUri,
    embedding: true,
    n_ctx: EMBEDDING_ENGINE.contextTokens,
    n_batch: EMBEDDING_ENGINE.contextTokens,
    n_ubatch: EMBEDDING_ENGINE.contextTokens,
    n_threads: EMBEDDING_ENGINE.threads,
    n_gpu_layers: EMBEDDING_ENGINE.gpuLayers,
    use_mlock: false,
  });
  firstModelThisSession ??= modelUri;
  return { ctx, loadMs: Date.now() - t0, description: ctx.model?.desc ?? '', dimension: ctx.model?.nEmbd ?? 0 };
}

export async function embed(e: LoadedEmbedder, text: string): Promise<{ vector: number[]; ms: number }> {
  const t0 = Date.now();
  const res = await e.ctx.embedding(text, { embd_normalize: EMBEDDING_ENGINE.normalize });
  const vector = res.embedding;
  if (e.dimension > 0 && vector.length !== e.dimension) {
    throw new Error(`vecteur de ${vector.length} nombres au lieu de ${e.dimension}`);
  }
  if (vector.some((x) => !Number.isFinite(x))) throw new Error('vecteur invalide (valeurs non numériques)');
  return { vector, ms: Date.now() - t0 };
}

export async function releaseEmbedder(e: LoadedEmbedder | null): Promise<void> {
  if (e) await e.ctx.release().catch(() => undefined);
}
