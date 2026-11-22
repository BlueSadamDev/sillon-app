import { FAKE_NOTES } from '@/notes/__fixtures__/notes';

import { createNotesRepo } from './notesRepo';
import { migrate, SCHEMA_VERSION } from './schema';
import { memoryDb } from './testing/nodeDb';

const DAY = 86_400_000;

async function setup() {
  const db = memoryDb();
  await migrate(db);
  let clock = 1_000_000;
  let counter = 0;
  const repo = createNotesRepo(db, { now: () => clock, newId: () => `id-${++counter}` });
  return { db, repo, tick: (ms = 1000) => (clock += ms) };
}

describe('base des notes', () => {
  it('crée la structure une seule fois', async () => {
    const db = memoryDb();
    await migrate(db);
    await migrate(db);
    expect(await db.first<{ user_version: number }>('PRAGMA user_version')).toEqual({ user_version: SCHEMA_VERSION });
  });

  it('crée, relit et modifie une note, avec ses tags', async () => {
    const { repo, tick } = await setup();
    const note = await repo.create(FAKE_NOTES.voyage);
    expect(await repo.get(note.id)).toMatchObject({ title: 'Voyage à Lisbonne', pinned: false, deletedAt: null });
    expect(await repo.tags(note.id)).toEqual(['été', 'voyage']);
    tick();
    await repo.update(note.id, { title: 'Lisbonne', body: 'Sans tag' });
    const after = await repo.get(note.id);
    expect(after?.title).toBe('Lisbonne');
    expect(after!.updatedAt).toBeGreaterThan(note.updatedAt);
    expect(await repo.tags(note.id)).toEqual([]);
  });

  it('liste les récentes et les épinglées avec leur nombre de sous-notes', async () => {
    const { repo, tick } = await setup();
    const jardin = await repo.create(FAKE_NOTES.jardin);
    tick();
    await repo.create({ ...FAKE_NOTES.tomates, parentId: jardin.id });
    tick();
    await repo.create(FAKE_NOTES.lecture);
    await repo.setPinned(jardin.id, true);
    expect((await repo.recent()).map((n) => n.title)).toEqual(['Lecture du soir', 'Tomates', 'Jardin']);
    expect(await repo.pinned()).toEqual([expect.objectContaining({ title: 'Jardin', childCount: 1 })]);
  });

  it('cherche par mots, sans accents, par début de mot, hors corbeille', async () => {
    const { repo } = await setup();
    const voyage = await repo.create(FAKE_NOTES.voyage);
    await repo.create(FAKE_NOTES.jardin);
    await repo.create(FAKE_NOTES.tomates);
    expect((await repo.search('lisb')).map((n) => n.title)).toEqual(['Voyage à Lisbonne', 'Jardin']);
    expect((await repo.search('ETE')).map((n) => n.id)).toEqual([voyage.id]);
    expect((await repo.search('jardin radis')).map((n) => n.title)).toEqual(['Jardin']);
    expect(await repo.search('  ')).toEqual([]);
    await repo.trash(voyage.id);
    expect((await repo.search('lisb')).map((n) => n.title)).toEqual(['Jardin']);
  });

  it('retrouve la note d’un lien [[ ]] sans tenir compte des majuscules', async () => {
    const { repo } = await setup();
    const voyage = await repo.create(FAKE_NOTES.voyage);
    expect((await repo.findByTitle(' voyage à lisbonne '))?.id).toBe(voyage.id);
    expect(await repo.findByTitle('Inconnue')).toBeNull();
  });

  it('range une note dans une autre, sans boucle possible', async () => {
    const { repo } = await setup();
    const a = await repo.create({ title: 'A' });
    const b = await repo.create({ title: 'B', parentId: a.id });
    expect(await repo.move(a.id, b.id)).toBe(false);
    const c = await repo.create({ title: 'C' });
    expect(await repo.move(c.id, b.id)).toBe(true);
    expect((await repo.get(c.id))?.parentId).toBe(b.id);
  });

  it('met une note et ses sous-notes à la corbeille, puis les restaure', async () => {
    const { repo, tick } = await setup();
    const parent = await repo.create({ title: 'Parent' });
    const child = await repo.create({ title: 'Enfant', parentId: parent.id });
    tick();
    expect(await repo.trash(parent.id)).toBe(2);
    expect(await repo.all()).toEqual([]);
    expect((await repo.trashed()).length).toBe(2);
    await repo.restore(parent.id);
    expect((await repo.all()).map((n) => n.title).sort()).toEqual(['Enfant', 'Parent']);
    expect((await repo.get(child.id))?.parentId).toBe(parent.id);
  });

  it('restaure à la racine une sous-note dont la note parente est encore à la corbeille', async () => {
    const { repo, tick } = await setup();
    const parent = await repo.create({ title: 'Parent' });
    const child = await repo.create({ title: 'Enfant', parentId: parent.id });
    await repo.trash(child.id);
    tick();
    await repo.trash(parent.id);
    await repo.restore(child.id);
    expect(await repo.get(child.id)).toMatchObject({ deletedAt: null, parentId: null });
    expect((await repo.get(parent.id))?.deletedAt).not.toBeNull();
  });

  it('efface les notes restées plus de 30 jours dans la corbeille', async () => {
    const { repo, tick } = await setup();
    const old = await repo.create(FAKE_NOTES.lecture);
    await repo.trash(old.id);
    tick(10 * DAY);
    const recent = await repo.create(FAKE_NOTES.tomates);
    await repo.trash(recent.id);
    tick(21 * DAY);
    expect(await repo.purgeTrash()).toBe(1);
    expect(await repo.get(old.id)).toBeNull();
    expect((await repo.trashed()).map((n) => n.id)).toEqual([recent.id]);
    expect(await repo.search('sommeil')).toEqual([]);
  });

  it('efface une note définitivement, seulement si elle est à la corbeille', async () => {
    const { repo } = await setup();
    const n = await repo.create(FAKE_NOTES.jardin);
    await repo.deleteForever(n.id);
    expect(await repo.get(n.id)).not.toBeNull();
    await repo.trash(n.id);
    await repo.deleteForever(n.id);
    expect(await repo.get(n.id)).toBeNull();
    expect(await repo.tags(n.id)).toEqual([]);
  });

  it('efface une note laissée vide, mais pas une note écrite ni une note avec sous-notes', async () => {
    const { repo } = await setup();
    const empty = await repo.create();
    expect(await repo.removeIfEmpty(empty.id)).toBe(true);
    expect(await repo.get(empty.id)).toBeNull();
    const written = await repo.create({ body: 'texte' });
    expect(await repo.removeIfEmpty(written.id)).toBe(false);
    const parent = await repo.create();
    await repo.create({ title: 'Enfant', parentId: parent.id });
    expect(await repo.removeIfEmpty(parent.id)).toBe(false);
  });

  it('archive une note et ses sous-notes : hors de l’accueil, mais dans Pages et la recherche', async () => {
    const { repo, tick } = await setup();
    const parent = await repo.create(FAKE_NOTES.jardin);
    await repo.create({ ...FAKE_NOTES.tomates, parentId: parent.id });
    await repo.setPinned(parent.id, true);
    tick();
    expect(await repo.archive(parent.id)).toBe(2);
    expect(await repo.recent()).toEqual([]);
    expect(await repo.pinned()).toEqual([]);
    expect((await repo.all()).length).toBe(2);
    expect((await repo.archived()).map((n) => n.title).sort()).toEqual(['Jardin', 'Tomates']);
    expect((await repo.search('radis')).map((n) => n.title)).toEqual(['Jardin']);
    await repo.unarchive(parent.id);
    expect((await repo.recent()).length).toBe(2);
    expect(await repo.archived()).toEqual([]);
  });

  it('une note archivée n’est jamais effacée toute seule', async () => {
    const { repo, tick } = await setup();
    const n = await repo.create(FAKE_NOTES.lecture);
    await repo.archive(n.id);
    tick(400 * DAY);
    expect(await repo.purgeTrash()).toBe(0);
    expect((await repo.get(n.id))?.archivedAt).not.toBeNull();
  });

  it('met à jour une base de la version 1 sans perdre de note', async () => {
    const db = memoryDb();
    await db.exec(`CREATE TABLE notes (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      parent_id TEXT, pinned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER);
      CREATE TABLE note_tags (note_id TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (note_id, tag));
      CREATE VIRTUAL TABLE notes_fts USING fts5 (id UNINDEXED, title, body, tokenize = 'unicode61 remove_diacritics 2');
      INSERT INTO notes VALUES ('ancienne', 'Note fictive', 'texte', NULL, 0, 1, 1, NULL);
      PRAGMA user_version = 1;`);
    await migrate(db);
    const repo = createNotesRepo(db, { now: () => 2, newId: () => 'x' });
    expect(await repo.get('ancienne')).toMatchObject({ title: 'Note fictive', archivedAt: null });
  });

  it('efface toutes les notes', async () => {
    const { repo } = await setup();
    await repo.create(FAKE_NOTES.jardin);
    await repo.wipe();
    expect(await repo.recent()).toEqual([]);
    expect(await repo.search('jardin')).toEqual([]);
  });
});
