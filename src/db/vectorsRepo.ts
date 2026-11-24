// Vecteurs des notes (lot 3) : données calculées, propres au téléphone, jamais sauvegardées.
// Ils sont toujours recalculés à partir de la table « notes », qui reste la référence. Ce module
// n'écrit jamais dans les notes.
import type { Db } from './types';
import { decodeVector, encodeVector } from './vectorCodec';

/** Une note dont le vecteur manque ou date d'avant sa dernière modification. */
export type PendingNote = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
  /** Empreinte du texte qui a servi au vecteur actuel (null si aucun vecteur pour ce modèle). */
  knownHash: string | null;
};

export type StoredVector = { id: string; vector: Float32Array };

export type VectorProgress = { done: number; total: number };

/** Notes prises en compte : hors corbeille (les archives restent cherchables). */
const ALIVE = 'n.deleted_at IS NULL';

export function createVectorsRepo(db: Db, { now }: { now: () => number }) {
  return {
    /** Notes à (re)calculer pour ce modèle, les plus récentes d'abord. */
    async pending(modelId: string, limit: number): Promise<PendingNote[]> {
      const rows = await db.all<{
        id: string;
        title: string;
        body: string;
        updated_at: number;
        model_id: string | null;
        text_hash: string | null;
      }>(
        `SELECT n.id, n.title, n.body, n.updated_at, v.model_id, v.text_hash
         FROM notes n LEFT JOIN note_vectors v ON v.note_id = n.id
         WHERE ${ALIVE} AND (v.note_id IS NULL OR v.model_id != ? OR v.source_updated_at != n.updated_at)
         ORDER BY n.updated_at DESC LIMIT ?`,
        [modelId, limit],
      );
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        updatedAt: r.updated_at,
        knownHash: r.model_id === modelId ? r.text_hash : null,
      }));
    },

    async progress(modelId: string): Promise<VectorProgress> {
      const row = await db.first<{ total: number; done: number }>(
        `SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN v.model_id = ? AND v.source_updated_at = n.updated_at THEN 1 ELSE 0 END), 0) AS done
         FROM notes n LEFT JOIN note_vectors v ON v.note_id = n.id WHERE ${ALIVE}`,
        [modelId],
      );
      return { total: row?.total ?? 0, done: row?.done ?? 0 };
    },

    async save(
      noteId: string,
      input: { modelId: string; textHash: string; sourceUpdatedAt: number; vector: ArrayLike<number> },
    ): Promise<void> {
      await db.run(
        `INSERT INTO note_vectors (note_id, model_id, text_hash, source_updated_at, dims, vector, computed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (note_id) DO UPDATE SET model_id = excluded.model_id, text_hash = excluded.text_hash,
           source_updated_at = excluded.source_updated_at, dims = excluded.dims, vector = excluded.vector,
           computed_at = excluded.computed_at`,
        [noteId, input.modelId, input.textHash, input.sourceUpdatedAt, input.vector.length, encodeVector(input.vector), now()],
      );
    },

    /** Le texte n'a pas changé (déplacement, archive…) : le vecteur reste valable. */
    async confirm(noteId: string, sourceUpdatedAt: number): Promise<void> {
      await db.run('UPDATE note_vectors SET source_updated_at = ? WHERE note_id = ?', [sourceUpdatedAt, noteId]);
    },

    /** Vecteurs à jour des notes hors corbeille, pour ce modèle. */
    async all(modelId: string): Promise<StoredVector[]> {
      const rows = await db.all<{ id: string; vector: string }>(
        `SELECT n.id, v.vector FROM notes n JOIN note_vectors v ON v.note_id = n.id
         WHERE ${ALIVE} AND v.model_id = ? AND v.source_updated_at = n.updated_at`,
        [modelId],
      );
      return rows.map((r) => ({ id: r.id, vector: decodeVector(r.vector) }));
    },

    async get(noteId: string, modelId: string): Promise<Float32Array | null> {
      const row = await db.first<{ vector: string }>(
        `SELECT v.vector FROM note_vectors v JOIN notes n ON n.id = v.note_id
         WHERE v.note_id = ? AND v.model_id = ? AND v.source_updated_at = n.updated_at`,
        [noteId, modelId],
      );
      return row ? decodeVector(row.vector) : null;
    },

    /** Retire les vecteurs des notes effacées définitivement et ceux d'un autre modèle. */
    async cleanup(modelId: string): Promise<void> {
      await db.run('DELETE FROM note_vectors WHERE note_id NOT IN (SELECT id FROM notes) OR model_id != ?', [modelId]);
    },

    async clear(): Promise<void> {
      await db.run('DELETE FROM note_vectors');
    },
  };
}

export type VectorsRepo = ReturnType<typeof createVectorsRepo>;
