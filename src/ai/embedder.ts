// Calcul des embeddings avec llama.rn : tout est local, le moteur reçoit le chemin
// d'un fichier déjà présent sur le téléphone. Modèle chargé à la demande, puis libéré.

import { initLlama, type LlamaContext } from 'llama.rn';

import { EMBEDDING_ENGINE } from './settings';

export type LoadedEmbedder = {
  ctx: LlamaContext;
  loadMs: number;
  description: string;
};

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
  return { ctx, loadMs: Date.now() - t0, description: ctx.model?.desc ?? '' };
}

export async function embed(e: LoadedEmbedder, text: string): Promise<{ vector: number[]; ms: number }> {
  const t0 = Date.now();
  const res = await e.ctx.embedding(text, { embd_normalize: EMBEDDING_ENGINE.normalize });
  return { vector: res.embedding, ms: Date.now() - t0 };
}

export async function releaseEmbedder(e: LoadedEmbedder | null): Promise<void> {
  if (e) await e.ctx.release().catch(() => undefined);
}
