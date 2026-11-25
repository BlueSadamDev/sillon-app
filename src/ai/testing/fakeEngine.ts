// Modèle d'embeddings SIMULÉ pour les tests (jamais utilisé par l'app) : chaque mot du texte
// allume une case du vecteur. Deux notes qui partagent des mots sont donc « proches ».
import type { EmbeddingEngine } from '../indexer';

export const FAKE_DIMENSION = 64;

function slot(word: string): number {
  let h = 7;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) % FAKE_DIMENSION;
  return h;
}

export function fakeVector(text: string): number[] {
  const v = new Array<number>(FAKE_DIMENSION).fill(0);
  // Les préfixes du modèle (« title: none | text: »…) sont retirés, comme un vrai modèle les ignore.
  const words = text
    .toLowerCase()
    .replace(/^.*?(text|query): /, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 3);
  for (const w of words) v[slot(w)] += 1;
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export function fakeEngine(): EmbeddingEngine & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async embed(text) {
      calls.push(text);
      return fakeVector(text);
    },
  };
}
