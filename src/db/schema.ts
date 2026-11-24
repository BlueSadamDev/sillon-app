// Structure de la base locale et ses évolutions (migrations).
// Le numéro de version de la base est rangé dans « PRAGMA user_version ».
import type { Db } from './types';

const MIGRATIONS: string[] = [
  // Version 1 : notes, tags, index de recherche par mots.
  `
  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    parent_id TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX notes_parent ON notes (parent_id);
  CREATE INDEX notes_updated ON notes (updated_at);
  CREATE TABLE note_tags (
    note_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (note_id, tag)
  );
  CREATE INDEX note_tags_tag ON note_tags (tag);
  CREATE VIRTUAL TABLE notes_fts USING fts5 (
    id UNINDEXED,
    title,
    body,
    tokenize = 'unicode61 remove_diacritics 2'
  );
  `,
  // Version 2 : archive des notes.
  `
  ALTER TABLE notes ADD COLUMN archived_at INTEGER;
  `,
  // Version 3 : préparation au partage (auteur et appareil de la dernière modification).
  // Les notes existantes reçoivent le compte et l'appareil du téléphone à l'ouverture (adoptUnowned).
  `
  ALTER TABLE notes ADD COLUMN author_id TEXT;
  ALTER TABLE notes ADD COLUMN device_id TEXT;
  `,
  // Version 4 : réglages et états propres au téléphone, hors des notes et hors de la sauvegarde
  // (lot 1.1 : brouillon de la capture rapide).
  `
  CREATE TABLE local_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: Db): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
