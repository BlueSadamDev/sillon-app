// Lecture et écriture des notes dans la base locale.
// Tout accès aux notes passe par ici (un futur module de synchronisation pourra s'y brancher).
import { RECENT_COUNT, SEARCH_LIMIT } from '@/notes/settings';
import { toFtsQuery } from '@/notes/search';
import { extractTags } from '@/notes/tags';
import { purgeCutoff } from '@/notes/trash';
import { canMove, descendantIds } from '@/notes/tree';
import type { Note } from '@/notes/types';

import type { Db } from './types';

type Row = {
  id: string;
  title: string;
  body: string;
  parent_id: string | null;
  pinned: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  archived_at: number | null;
  author_id: string | null;
  device_id: string | null;
};

const COLUMNS =
  'id, title, body, parent_id, pinned, created_at, updated_at, deleted_at, archived_at, author_id, device_id';
const ALIVE = 'deleted_at IS NULL';
/** Hors corbeille et hors archives (accueil). */
const ACTIVE = 'deleted_at IS NULL AND archived_at IS NULL';

function toNote(r: Row): Note {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    parentId: r.parent_id,
    pinned: r.pinned === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    archivedAt: r.archived_at,
    authorId: r.author_id,
    deviceId: r.device_id,
  };
}

export type NoteWithCount = Note & { childCount: number };
/** Compte et appareil du téléphone, notés sur chaque note écrite (préparation au partage). */
export type NoteIdentity = { authorId: string | null; deviceId: string | null };

export type Deps = {
  now: () => number;
  newId: () => string;
  /** Lu à chaque écriture : le compte n'est connu qu'après son chargement. */
  identity?: () => NoteIdentity;
};

const NO_IDENTITY: NoteIdentity = { authorId: null, deviceId: null };
const DRAFT_KEY = 'capture-draft';

export function createNotesRepo(db: Db, { now, newId, identity = () => NO_IDENTITY }: Deps) {
  /** Appareil de la dernière modification : noté à chaque écriture d'une note. */
  const device = () => identity().deviceId;

  async function writeIndex(id: string, title: string, body: string): Promise<void> {
    await db.run('DELETE FROM notes_fts WHERE id = ?', [id]);
    await db.run('INSERT INTO notes_fts (id, title, body) VALUES (?, ?, ?)', [id, title, body]);
    await db.run('DELETE FROM note_tags WHERE note_id = ?', [id]);
    for (const tag of extractTags(body)) {
      await db.run('INSERT INTO note_tags (note_id, tag) VALUES (?, ?)', [id, tag]);
    }
  }

  async function aliveTree(): Promise<Pick<Note, 'id' | 'title' | 'parentId'>[]> {
    const rows = await db.all<{ id: string; title: string; parent_id: string | null }>(
      `SELECT id, title, parent_id FROM notes WHERE ${ALIVE}`,
    );
    return rows.map((r) => ({ id: r.id, title: r.title, parentId: r.parent_id }));
  }

  async function withChildCount(rows: Row[]): Promise<NoteWithCount[]> {
    const counts = await db.all<{ parent_id: string; n: number }>(
      `SELECT parent_id, COUNT(*) AS n FROM notes WHERE ${ALIVE} AND parent_id IS NOT NULL GROUP BY parent_id`,
    );
    const byParent = new Map(counts.map((c) => [c.parent_id, c.n]));
    return rows.map((r) => ({ ...toNote(r), childCount: byParent.get(r.id) ?? 0 }));
  }

  async function get(id: string): Promise<Note | null> {
    const row = await db.first<Row>(`SELECT ${COLUMNS} FROM notes WHERE id = ?`, [id]);
    return row ? toNote(row) : null;
  }

  return {
    get,

    async create(input: { title?: string; body?: string; parentId?: string | null } = {}): Promise<Note> {
      const t = now();
      const note: Note = {
        id: newId(),
        title: input.title ?? '',
        body: input.body ?? '',
        parentId: input.parentId ?? null,
        pinned: false,
        createdAt: t,
        updatedAt: t,
        deletedAt: null,
        archivedAt: null,
        authorId: identity().authorId,
        deviceId: device(),
      };
      await db.transaction(async () => {
        await db.run(
          `INSERT INTO notes (${COLUMNS}) VALUES (?, ?, ?, ?, 0, ?, ?, NULL, NULL, ?, ?)`,
          [note.id, note.title, note.body, note.parentId, t, t, note.authorId, note.deviceId],
        );
        await writeIndex(note.id, note.title, note.body);
      });
      return note;
    },

    /** Enregistrement automatique de l'éditeur : titre et contenu. */
    async update(id: string, changes: { title: string; body: string }): Promise<void> {
      await db.transaction(async () => {
        await db.run('UPDATE notes SET title = ?, body = ?, updated_at = ?, device_id = ? WHERE id = ?', [
          changes.title,
          changes.body,
          now(),
          device(),
          id,
        ]);
        await writeIndex(id, changes.title, changes.body);
      });
    },

    async setPinned(id: string, pinned: boolean): Promise<void> {
      await db.run('UPDATE notes SET pinned = ?, device_id = ? WHERE id = ?', [pinned ? 1 : 0, device(), id]);
    },

    /** Range une note dans une autre (ou à la racine). Refusé si cela créerait une boucle. */
    async move(id: string, newParentId: string | null): Promise<boolean> {
      if (!canMove(id, newParentId, await aliveTree())) return false;
      await db.run('UPDATE notes SET parent_id = ?, updated_at = ?, device_id = ? WHERE id = ?', [
        newParentId,
        now(),
        device(),
        id,
      ]);
      return true;
    },

    async recent(limit: number = RECENT_COUNT): Promise<Note[]> {
      const rows = await db.all<Row>(`SELECT ${COLUMNS} FROM notes WHERE ${ACTIVE} ORDER BY updated_at DESC LIMIT ?`, [
        limit,
      ]);
      return rows.map(toNote);
    },

    async pinned(): Promise<NoteWithCount[]> {
      const rows = await db.all<Row>(
        `SELECT ${COLUMNS} FROM notes WHERE ${ACTIVE} AND pinned = 1 ORDER BY title COLLATE NOCASE`,
      );
      return withChildCount(rows);
    },

    /** Toutes les notes hors corbeille (archivées comprises), pour l'arborescence. */
    async all(): Promise<NoteWithCount[]> {
      const rows = await db.all<Row>(`SELECT ${COLUMNS} FROM notes WHERE ${ALIVE}`);
      return withChildCount(rows);
    },

    async tags(id: string): Promise<string[]> {
      const rows = await db.all<{ tag: string }>('SELECT tag FROM note_tags WHERE note_id = ?', [id]);
      return rows.map((r) => r.tag).sort((a, b) => a.localeCompare(b, 'fr'));
    },

    /** Note visée par un lien [[Titre]] (sans tenir compte des majuscules). */
    async findByTitle(title: string): Promise<Note | null> {
      const row = await db.first<Row>(
        `SELECT ${COLUMNS} FROM notes WHERE ${ALIVE} AND title = ? COLLATE NOCASE ORDER BY updated_at DESC LIMIT 1`,
        [title.trim()],
      );
      return row ? toNote(row) : null;
    },

    /** Recherche par mots dans les titres et contenus, hors corbeille. */
    async search(input: string, limit: number = SEARCH_LIMIT): Promise<Note[]> {
      const query = toFtsQuery(input);
      if (query === null) return [];
      const rows = await db.all<Row>(
        `SELECT ${COLUMNS.split(', ').map((c) => `n.${c}`).join(', ')}
         FROM notes_fts f JOIN notes n ON n.id = f.id
         WHERE notes_fts MATCH ? AND n.deleted_at IS NULL
         ORDER BY bm25(notes_fts, 0, 5, 1), n.updated_at DESC
         LIMIT ?`,
        [query, limit],
      );
      return rows.map(toNote);
    },

    /** Met une note et toutes ses sous-notes à la corbeille. Renvoie le nombre de notes déplacées. */
    async trash(id: string): Promise<number> {
      const ids = [id, ...descendantIds(id, await aliveTree())];
      const t = now();
      await db.transaction(async () => {
        for (const n of ids) {
          await db.run(`UPDATE notes SET deleted_at = ?, device_id = ? WHERE id = ? AND ${ALIVE}`, [t, device(), n]);
        }
      });
      return ids.length;
    },

    /** Archive une note et ses sous-notes. Renvoie le nombre de notes archivées. */
    async archive(id: string): Promise<number> {
      const ids = [id, ...descendantIds(id, await aliveTree())];
      const t = now();
      await db.transaction(async () => {
        for (const n of ids) {
          await db.run('UPDATE notes SET archived_at = ?, device_id = ? WHERE id = ? AND archived_at IS NULL', [
            t,
            device(),
            n,
          ]);
        }
      });
      return ids.length;
    },

    /** Sort une note des archives, avec les sous-notes archivées en même temps qu'elle. */
    async unarchive(id: string): Promise<void> {
      const note = await get(id);
      if (!note || note.archivedAt === null) return;
      const batch = await db.all<{ id: string; title: string; parent_id: string | null }>(
        'SELECT id, title, parent_id FROM notes WHERE archived_at = ?',
        [note.archivedAt],
      );
      const ids = [id, ...descendantIds(id, batch.map((r) => ({ id: r.id, title: r.title, parentId: r.parent_id })))];
      await db.transaction(async () => {
        for (const n of ids) await db.run('UPDATE notes SET archived_at = NULL, device_id = ? WHERE id = ?', [device(), n]);
      });
    },

    async archived(): Promise<Note[]> {
      const rows = await db.all<Row>(
        `SELECT ${COLUMNS} FROM notes WHERE ${ALIVE} AND archived_at IS NOT NULL ORDER BY archived_at DESC, title COLLATE NOCASE`,
      );
      return rows.map(toNote);
    },

    async trashed(): Promise<Note[]> {
      const rows = await db.all<Row>(`SELECT ${COLUMNS} FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
      return rows.map(toNote);
    },

    /**
     * Sort une note de la corbeille, avec les sous-notes supprimées en même temps qu'elle.
     * Si sa note parente n'existe plus hors corbeille, elle revient à la racine.
     */
    async restore(id: string): Promise<void> {
      const note = await get(id);
      if (!note || note.deletedAt === null) return;
      const all = await db.all<{ id: string; title: string; parent_id: string | null; deleted_at: number | null }>(
        'SELECT id, title, parent_id, deleted_at FROM notes',
      );
      const sameBatch = all
        .filter((r) => r.deleted_at === note.deletedAt)
        .map((r) => ({ id: r.id, title: r.title, parentId: r.parent_id }));
      const ids = [id, ...descendantIds(id, sameBatch)];
      const parent = note.parentId ? all.find((r) => r.id === note.parentId) : undefined;
      const parentAlive = parent !== undefined && parent.deleted_at === null;
      await db.transaction(async () => {
        for (const n of ids) await db.run('UPDATE notes SET deleted_at = NULL, device_id = ? WHERE id = ?', [device(), n]);
        if (!parentAlive) await db.run('UPDATE notes SET parent_id = NULL WHERE id = ?', [id]);
      });
    },

    /**
     * Efface une note laissée vide (ni titre ni contenu, sans sous-note) quand on la quitte.
     * Renvoie true si elle a été effacée.
     */
    async removeIfEmpty(id: string): Promise<boolean> {
      const note = await get(id);
      if (!note || note.title.trim() !== '' || note.body.trim() !== '') return false;
      const child = await db.first<{ id: string }>('SELECT id FROM notes WHERE parent_id = ? LIMIT 1', [id]);
      if (child) return false;
      await db.transaction(async () => {
        await db.run('DELETE FROM notes WHERE id = ?', [id]);
        await db.run('DELETE FROM notes_fts WHERE id = ?', [id]);
        await db.run('DELETE FROM note_tags WHERE note_id = ?', [id]);
      });
      return true;
    },

    /** Efface définitivement une note de la corbeille. */
    async deleteForever(id: string): Promise<void> {
      await db.transaction(async () => {
        await db.run('DELETE FROM notes WHERE id = ? AND deleted_at IS NOT NULL', [id]);
        await db.run('DELETE FROM notes_fts WHERE id = ? AND id NOT IN (SELECT id FROM notes)', [id]);
        await db.run('DELETE FROM note_tags WHERE note_id = ? AND note_id NOT IN (SELECT id FROM notes)', [id]);
      });
    },

    /** Efface les notes restées plus de 30 jours dans la corbeille. Renvoie leur nombre. */
    async purgeTrash(): Promise<number> {
      const cutoff = purgeCutoff(now());
      const old = await db.all<{ id: string }>('SELECT id FROM notes WHERE deleted_at IS NOT NULL AND deleted_at <= ?', [
        cutoff,
      ]);
      if (old.length === 0) return 0;
      await db.transaction(async () => {
        await db.run('DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at <= ?', [cutoff]);
        await db.run('DELETE FROM notes_fts WHERE id NOT IN (SELECT id FROM notes)');
        await db.run('DELETE FROM note_tags WHERE note_id NOT IN (SELECT id FROM notes)');
      });
      return old.length;
    },

    /** Toutes les notes, corbeille et archives comprises (sauvegarde). */
    async exportAll(): Promise<Note[]> {
      const rows = await db.all<Row>(`SELECT ${COLUMNS} FROM notes ORDER BY created_at, id`);
      return rows.map(toNote);
    },

    /**
     * Remplace toutes les notes par celles d'une sauvegarde (restauration), d'un seul bloc :
     * en cas de problème, rien n'est changé. Les tags et l'index de recherche sont recalculés.
     */
    async replaceAll(notes: Note[]): Promise<void> {
      await db.transaction(async () => {
        await db.run('DELETE FROM notes');
        await db.run('DELETE FROM notes_fts');
        await db.run('DELETE FROM note_tags');
        for (const n of notes) {
          await db.run(`INSERT INTO notes (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            n.id,
            n.title,
            n.body,
            n.parentId,
            n.pinned ? 1 : 0,
            n.createdAt,
            n.updatedAt,
            n.deletedAt,
            n.archivedAt,
            n.authorId,
            n.deviceId,
          ]);
          await writeIndex(n.id, n.title, n.body);
        }
      });
    },

    /**
     * Attribue le compte et l'appareil du téléphone aux notes qui n'en ont pas encore : notes créées
     * avant la version 3 de la base, ou venues d'une sauvegarde de version 1. Renvoie leur nombre.
     */
    async adoptUnowned(): Promise<number> {
      const { authorId, deviceId } = identity();
      if (authorId === null || deviceId === null) return 0;
      const row = await db.first<{ n: number }>(
        'SELECT COUNT(*) AS n FROM notes WHERE author_id IS NULL OR device_id IS NULL',
      );
      if (!row || row.n === 0) return 0;
      await db.run(
        `UPDATE notes SET author_id = COALESCE(author_id, ?), device_id = COALESCE(device_id, ?)
         WHERE author_id IS NULL OR device_id IS NULL`,
        [authorId, deviceId],
      );
      return row.n;
    },

    /**
     * Brouillon de la capture rapide (lot 1.1) : gardé dans la base du téléphone, jamais sauvegardé.
     * Un texte vide efface le brouillon.
     */
    async captureDraft(): Promise<string> {
      const row = await db.first<{ value: string }>('SELECT value FROM local_state WHERE key = ?', [DRAFT_KEY]);
      return row?.value ?? '';
    },

    async setCaptureDraft(text: string): Promise<void> {
      if (text === '') await db.run('DELETE FROM local_state WHERE key = ?', [DRAFT_KEY]);
      else
        await db.run(
          'INSERT INTO local_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
          [DRAFT_KEY, text],
        );
    },

    /** Efface toutes les notes et les états du téléphone (écran Compte, « Effacer toutes les données »). */
    async wipe(): Promise<void> {
      await db.transaction(async () => {
        await db.run('DELETE FROM notes');
        await db.run('DELETE FROM notes_fts');
        await db.run('DELETE FROM note_tags');
        await db.run('DELETE FROM local_state');
      });
    },
  };
}

export type NotesRepo = ReturnType<typeof createNotesRepo>;
