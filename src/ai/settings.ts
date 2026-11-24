// Réglages de l'IA locale (CLAUDE.md : tous ici, jamais en dur ailleurs).
// Lot 0 : banc d'essai des embeddings. Lot 3 : modèle retenu, calcul des vecteurs, notes liées, recherche.

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

// ——— Lot 3 : recherche par le sens et notes liées ———

/**
 * Modèle d'embeddings retenu au lot 0 (rapport, section 4). Seul ce fichier est accepté :
 * l'empreinte SHA-256 est le contrôle décisif ; la taille sert de premier tri rapide (calculer
 * l'empreinte de 313 Mo prend quelques secondes). Taille exacte à relever au premier import.
 */
export const EMBEDDING_MODEL = {
  /** Identifiant rangé avec chaque vecteur : changer de modèle fait tout recalculer. */
  id: 'embeddinggemma-300m-qat-q8_0',
  label: 'EmbeddingGemma 300M',
  fileName: 'embeddinggemma-300m-qat-Q8_0.gguf',
  sha256: '6fa0c02a9c302be6f977521d399b4de3a46310a4f2621ee0063747881b673f67',
  minBytes: 290_000_000,
  maxBytes: 340_000_000,
  /** Taille des vecteurs de ce modèle. */
  dimension: 768,
  /** Famille (préfixes) : voir MODEL_FAMILIES. */
  familyId: 'embeddinggemma',
} as const;

/** Place libre à garder sur le téléphone en plus du modèle, à l'import. */
export const MODEL_IMPORT_MARGIN_BYTES = 200 * 1024 * 1024;

/** Fichier (à côté des modèles) qui garde le résultat de la vérification, pour ne pas la refaire à chaque ouverture. */
export const EMBEDDING_MODEL_RECORD = 'embedding-model.json';

/**
 * Texte d'une note donné au modèle. Le moteur lit au plus EMBEDDING_ENGINE.contextTokens jetons
 * (512, soit environ 400 mots) : au-delà, la fin de la note n'est pas prise en compte.
 */
export const NOTE_TEXT = {
  /** Coupure en caractères, avant le moteur (en français, environ 3 caractères par jeton). */
  maxChars: 1500,
} as const;

/** Calcul des vecteurs (à l'enregistrement et en rattrapage). */
export const INDEXING = {
  /** Notes calculées d'affilée avant une pause. */
  batchSize: 5,
  /** Pause entre deux petits lots, pour laisser l'app fluide (ms). */
  pauseMs: 250,
  /** Attente après un changement avant de calculer (plusieurs enregistrements rapprochés = un seul calcul) (ms). */
  debounceMs: 1500,
  /** Le modèle est libéré après ce temps sans rien à calculer (ms). */
  releaseAfterMs: 60_000,
} as const;

/** Niveaux du seuil de proximité, au choix dans l'écran du modèle. */
export type ProximityLevel = 'large' | 'normal' | 'strict';
export const PROXIMITY_LEVELS: ProximityLevel[] = ['large', 'normal', 'strict'];
export const DEFAULT_PROXIMITY_LEVEL: ProximityLevel = 'normal';

/**
 * Seuils de proximité (cosinus, de -1 à 1) en dessous desquels une note n'est pas montrée.
 * Valeurs de départ, à caler sur le S21 avec de vraies notes (docs/TESTS_LOT_3.md).
 */
export const PROXIMITY_THRESHOLDS: Record<ProximityLevel, number> = {
  large: 0.35,
  normal: 0.45,
  strict: 0.55,
};

/** Bloc « Notes liées » sous une note. */
export const RELATED = {
  maxNotes: 5,
} as const;

/** Recherche par le sens (onglet Recherche). */
export const SEMANTIC_SEARCH = {
  maxResults: 10,
  /** Nombre de caractères avant de lancer la recherche par le sens. */
  minChars: 3,
  /** Pause de frappe avant de calculer le vecteur de la recherche (ms). */
  typingPauseMs: 500,
} as const;
