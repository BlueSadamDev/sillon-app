// Recherche par le sens pour toute l'app (lot 3) : état du modèle, calcul des vecteurs en rattrapage,
// notes liées et recherche. Le calcul ne tourne que quand l'app est affichée ; le modèle est chargé à
// la demande puis libéré. Rien ne sort du téléphone.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { openVectors } from '@/db/expoDb';
import { onNotesChanged } from '@/db/events';
import type { StoredVector, VectorProgress } from '@/db/vectorsRepo';

import { createLazyEngine } from './embedder';
import {
  deleteEmbeddingModel,
  importEmbeddingModel,
  type InstalledModel,
  installedModel,
  type ModelImport,
} from './embeddingModel';
import { createIndexer, type Indexer, isValidVector } from './indexer';
import { queryText } from './noteText';
import { relatedNotes, semanticResults } from './semantic';
import {
  DEFAULT_PROXIMITY_LEVEL,
  EMBEDDING_MODEL,
  INDEXING,
  PROXIMITY_LEVELS,
  PROXIMITY_THRESHOLDS,
  type ProximityLevel,
  RELATED,
  SEMANTIC_SEARCH,
} from './settings';
import type { Ranked } from './similarity';

export type ModelStatus = 'absent' | 'ready';

/** Résultat d'une demande : prêt, modèle absent, ou vecteur pas encore calculé. */
export type SemanticAnswer = { kind: 'absent' } | { kind: 'pending' } | { kind: 'ready'; notes: Ranked[] };

type SemanticState = {
  modelStatus: ModelStatus;
  modelSizeBytes: number | null;
  progress: VectorProgress;
  /** Vrai tant que des notes restent à calculer. */
  indexing: boolean;
  /** Le dernier calcul n'a pas pu aller au bout (il sera retenté au prochain changement). */
  failed: boolean;
  level: ProximityLevel;
  setLevel(level: ProximityLevel): void;
  importModel(): Promise<ModelImport>;
  removeModel(): Promise<void>;
  /** Change à chaque nouveau vecteur : les écrans ouverts relisent leurs résultats. */
  version: number;
  related(noteId: string): Promise<SemanticAnswer>;
  search(query: string, alreadyFound: string[]): Promise<SemanticAnswer>;
};

const LEVEL_KEY = 'proximity-level';
const Ctx = createContext<SemanticState | null>(null);

export function useSemantic(): SemanticState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSemantic hors de SemanticProvider');
  return value;
}

export function SemanticProvider({ children }: { children: ReactNode }) {
  // Le modèle déjà installé est lu à l'ouverture (sans recalculer son empreinte).
  const [model, setModel] = useState<InstalledModel | null>(() => installedModel());
  const modelUri = model?.uri ?? null;
  const modelSizeBytes = model?.sizeBytes ?? null;
  const modelStatus: ModelStatus = model ? 'ready' : 'absent';
  const [progress, setProgress] = useState<VectorProgress>({ done: 0, total: 0 });
  const [failed, setFailed] = useState(false);
  const [level, setLevelState] = useState<ProximityLevel>(DEFAULT_PROXIMITY_LEVEL);
  const [version, setVersion] = useState(0);
  const indexer = useRef<Indexer | null>(null);
  const engine = useRef<ReturnType<typeof createLazyEngine> | null>(null);
  const cache = useRef<Promise<StoredVector[]> | null>(null);

  // Réglage du seuil, à l'ouverture.
  useEffect(() => {
    void openVectors()
      .then((v) => v.localSetting(LEVEL_KEY))
      .then((saved) => {
        if (saved && (PROXIMITY_LEVELS as string[]).includes(saved)) setLevelState(saved as ProximityLevel);
      });
  }, []);

  // Moteur et calcul, créés quand le modèle est là.
  useEffect(() => {
    if (!modelUri) return;
    let alive = true;
    const lazy = createLazyEngine(modelUri, EMBEDDING_MODEL.dimension, INDEXING.releaseAfterMs);
    engine.current = lazy;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const start = async () => {
      const vectors = await openVectors();
      if (!alive) return;
      indexer.current ??= createIndexer({
        vectors,
        engine: lazy,
        modelId: EMBEDDING_MODEL.id,
        dimension: EMBEDDING_MODEL.dimension,
        onProgress: (p) => {
          if (!alive) return;
          cache.current = null;
          setProgress(p);
          setVersion((n) => n + 1);
        },
      });
      const outcome = await indexer.current.run();
      if (!alive) return;
      setFailed(outcome === 'failed');
      setProgress(await vectors.progress(EMBEDDING_MODEL.id));
    };

    const schedule = () => {
      cache.current = null;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (AppState.currentState === 'active') void start();
      }, INDEXING.debounceMs);
    };

    void start();
    const offNotes = onNotesChanged(schedule);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') schedule();
      else indexer.current?.stop();
    });
    return () => {
      alive = false;
      if (debounce) clearTimeout(debounce);
      offNotes();
      appState.remove();
      indexer.current?.stop();
      indexer.current = null;
      engine.current = null;
      cache.current = null;
      void lazy.release();
    };
  }, [modelUri]);

  const loadAll = useCallback(async () => {
    cache.current ??= openVectors().then((v) => v.all(EMBEDDING_MODEL.id));
    return cache.current;
  }, []);

  const threshold = PROXIMITY_THRESHOLDS[level];

  const related = useCallback(
    async (noteId: string): Promise<SemanticAnswer> => {
      if (!modelUri) return { kind: 'absent' };
      const own = await (await openVectors()).get(noteId, EMBEDDING_MODEL.id);
      if (!own) return { kind: 'pending' };
      return { kind: 'ready', notes: relatedNotes(noteId, own, await loadAll(), threshold, RELATED.maxNotes) };
    },
    [modelUri, loadAll, threshold],
  );

  const search = useCallback(
    async (query: string, alreadyFound: string[]): Promise<SemanticAnswer> => {
      const lazy = engine.current;
      if (!modelUri || !lazy) return { kind: 'absent' };
      const vector = await lazy.embed(queryText(query));
      if (!isValidVector(vector, EMBEDDING_MODEL.dimension)) return { kind: 'ready', notes: [] };
      const notes = semanticResults(vector, await loadAll(), threshold, SEMANTIC_SEARCH.maxResults, alreadyFound);
      return { kind: 'ready', notes };
    },
    [modelUri, loadAll, threshold],
  );

  const setLevel = useCallback((next: ProximityLevel) => {
    setLevelState(next);
    void openVectors().then((v) => v.setLocalSetting(LEVEL_KEY, next));
  }, []);

  const importModel = useCallback(async () => {
    const result = await importEmbeddingModel();
    if (result.kind === 'installed') setModel(result.model);
    return result;
  }, []);

  const removeModel = useCallback(async () => {
    indexer.current?.stop();
    await engine.current?.release();
    deleteEmbeddingModel();
    setModel(null);
    setFailed(false);
  }, []);

  const value = useMemo<SemanticState>(
    () => ({
      modelStatus,
      modelSizeBytes,
      progress,
      indexing: modelStatus === 'ready' && progress.done < progress.total && !failed,
      failed,
      level,
      setLevel,
      importModel,
      removeModel,
      version,
      related,
      search,
    }),
    [modelStatus, modelSizeBytes, progress, failed, level, setLevel, importModel, removeModel, version, related, search],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
