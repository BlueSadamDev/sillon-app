// Réglages de l'IA locale. Lot 0 : seulement le banc d'essai des embeddings.

/** Paramètres du moteur llama.rn pour les embeddings. */
export const EMBEDDING_ENGINE = {
  /** Longueur maximale d'un texte (en jetons) : une note longue est tronquée au-delà. */
  contextTokens: 512,
  /** Cœurs du processeur utilisés (le S21 en a 8 ; 4 laisse l'app fluide). */
  threads: 4,
  /** Le S21 (Exynos, GPU Mali) n'a pas l'accélération GPU prise en charge par llama.rn. */
  gpuLayers: 0,
  /** Normalisation des vecteurs (2 = norme euclidienne), pour comparer par cosinus. */
  normalize: 2,
} as const;

/** Nombre de notes considérées comme « trouvées » pour la mesure top-3. */
export const BENCH_TOP_K = 3;

/** Dossier (dans l'espace privé de l'app) où sont rangés les modèles importés. */
export const MODELS_DIR = 'models';

/**
 * Chaque famille de modèles attend ses propres préfixes (indiqués par leurs auteurs).
 * La famille est reconnue d'après le nom du fichier importé.
 */
export type ModelFamily = {
  id: string;
  label: string;
  /** Morceau de nom de fichier qui identifie la famille (en minuscules). */
  match: string;
  queryPrefix: string;
  documentPrefix: string;
};

export const MODEL_FAMILIES: ModelFamily[] = [
  {
    id: 'e5',
    label: 'multilingual-e5',
    match: 'e5',
    queryPrefix: 'query: ',
    documentPrefix: 'passage: ',
  },
  {
    id: 'embeddinggemma',
    label: 'EmbeddingGemma',
    match: 'gemma',
    queryPrefix: 'task: search result | query: ',
    documentPrefix: 'title: none | text: ',
  },
  {
    id: 'qwen3',
    label: 'Qwen3-Embedding',
    match: 'qwen3',
    queryPrefix: 'Instruct: Given a search query, retrieve relevant personal notes\nQuery: ',
    documentPrefix: '',
  },
];

/** Famille par défaut si le nom du fichier n'est pas reconnu : aucun préfixe. */
export const UNKNOWN_FAMILY: ModelFamily = {
  id: 'unknown',
  label: 'Modèle non reconnu (sans préfixe)',
  match: '',
  queryPrefix: '',
  documentPrefix: '',
};

export function familyForFile(fileName: string): ModelFamily {
  const lower = fileName.toLowerCase();
  // Qwen3 et Gemma avant e5 : « e5 » est un morceau trop court, testé en dernier.
  const ordered = [...MODEL_FAMILIES].sort((a, b) => b.match.length - a.match.length);
  return ordered.find((f) => lower.includes(f.match)) ?? UNKNOWN_FAMILY;
}
