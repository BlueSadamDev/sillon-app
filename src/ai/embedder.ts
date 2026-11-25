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

/**
 * Moteur du lot 3 : le modèle est chargé au premier calcul, les calculs passent un par un, et le
 * modèle est libéré après INDEXING.releaseAfterMs sans rien à calculer (règle : chargé à la demande,
 * puis libéré). Au lot 4, appeler release() avant de charger le modèle de rédaction : un seul modèle
 * en mémoire à la fois.
 */
export function createLazyEngine(modelUri: string, dimension: number, releaseAfterMs: number) {
  let loaded: Promise<LoadedEmbedder> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function release(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    const current = loaded;
    loaded = null;
    if (current) await releaseEmbedder(await current.catch(() => null));
  }

  function embedOne(text: string): Promise<number[]> {
    const job = queue.then(async () => {
      if (timer) clearTimeout(timer);
      if (needsAppRestart(modelUri)) throw new Error('un autre modèle a déjà servi');
      loaded ??= loadEmbedder(modelUri);
      let e: LoadedEmbedder;
      try {
        e = await loaded;
      } catch (err) {
        loaded = null;
        throw err;
      }
      try {
        const { vector } = await embed({ ...e, dimension }, text);
        return vector;
      } finally {
        timer = setTimeout(() => void release(), releaseAfterMs);
      }
    });
    queue = job.catch(() => undefined);
    return job;
  }

  return { embed: embedOne, release };
}
