// Test « sauvegarder des notes fictives, restaurer, comparer » (CLAUDE.md, Sauvegarde vers pCloud).
// À relancer à chaque modification du format de sauvegarde.
import { createNotesRepo } from '@/db/notesRepo';
import { migrate, SCHEMA_VERSION } from '@/db/schema';
import { memoryDb } from '@/db/testing/nodeDb';
import { FAKE_NOTES } from '@/notes/__fixtures__/notes';

import { BACKUP_V1_FILE, BACKUP_V1_PASSWORD } from './__fixtures__/backupV1';
import {
  createBackupKey,
  decryptWithKey,
  decryptWithPassword,
  encryptWithKey,
  fromBase64,
  toBase64,
  type CryptoEngine,
} from './cipher';
import { HEADER_BYTES } from './format';
import { buildPayload, parsePayload, summarize } from './payload';
import { openBackup } from './restore';
import { nobleEngine } from './testing/nobleEngine';

// Réglages Argon2id allégés pour que les tests restent rapides (l'app utilise 3 passes, 256 Mo).
const TEST_KDF = { opsLimit: 2, memLimit: 1024 * 1024 };
const PASSWORD = 'mot-de-passe-de-sauvegarde-fictif';

async function freshRepo() {
  const db = memoryDb();
  await migrate(db);
  let clock = 1_700_000_000_000;
  let counter = 0;
  const repo = createNotesRepo(db, { now: () => (clock += 1000), newId: () => `id-${++counter}` });
  return repo;
}

/** Un carnet fictif avec sous-notes, épingle, archive et corbeille. */
async function fakeNotebook() {
  const repo = await freshRepo();
  const voyage = await repo.create(FAKE_NOTES.voyage);
  const jardin = await repo.create(FAKE_NOTES.jardin);
  const tomates = await repo.create({ ...FAKE_NOTES.tomates, parentId: jardin.id });
  const lecture = await repo.create(FAKE_NOTES.lecture);
  const vide = await repo.create({ title: 'Accents et symboles', body: 'Œuvre, « guillemets », 日本, emoji 🌱.' });
  await repo.setPinned(voyage.id, true);
  await repo.archive(jardin.id);
  await repo.trash(lecture.id);
  return { repo, ids: { voyage: voyage.id, jardin: jardin.id, tomates: tomates.id, lecture: lecture.id, vide: vide.id } };
}

async function backup(repo: Awaited<ReturnType<typeof freshRepo>>) {
  const json = buildPayload({
    createdAt: 1_700_000_500_000,
    schemaVersion: SCHEMA_VERSION,
    username: 'camille',
    settings: { lockDelayMin: 15 },
    notes: await repo.exportAll(),
  });
  const key = createBackupKey(PASSWORD, TEST_KDF, nobleEngine);
  return { file: encryptWithKey(json, key, nobleEngine), key };
}

describe('sauvegarde puis restauration', () => {
  it('restaure exactement les mêmes notes, tags, archives et corbeille', async () => {
    const { repo, ids } = await fakeNotebook();
    const { file } = await backup(repo);

    const dec = decryptWithPassword(file, PASSWORD, nobleEngine);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    const parsed = parsePayload(dec.text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.content.username).toBe('camille');
    expect(parsed.content.settings).toEqual({ lockDelayMin: 15 });
    expect(summarize(parsed.content)).toEqual({ createdAt: 1_700_000_500_000, notes: 4, archived: 2, trashed: 1 });

    const target = await freshRepo();
    await target.create({ title: 'Note du nouveau téléphone, remplacée' });
    await target.replaceAll(parsed.content.notes);

    expect(await target.exportAll()).toEqual(await repo.exportAll());
    expect(await target.tags(ids.voyage)).toEqual(['été', 'voyage']);
    expect(await target.tags(ids.tomates)).toEqual(['jardin', 'potager']);
    expect((await target.search('azulejos')).map((n) => n.id)).toEqual([ids.voyage]);
    expect((await target.search('日本')).map((n) => n.id)).toEqual([ids.vide]);
    expect((await target.pinned()).map((n) => n.id)).toEqual([ids.voyage]);
    expect((await target.archived()).map((n) => n.id).sort()).toEqual([ids.jardin, ids.tomates].sort());
    expect((await target.trashed()).map((n) => n.id)).toEqual([ids.lecture]);
    expect((await target.get(ids.tomates))?.parentId).toBe(ids.jardin);
  });

  it('chiffre chaque sauvegarde différemment avec la même clé, et la relit avec la clé gardée', async () => {
    const { repo } = await fakeNotebook();
    const { file, key } = await backup(repo);
    const again = encryptWithKey('{}', key, nobleEngine);
    expect(toBase64(again.slice(14, 30))).toBe(toBase64(file.slice(14, 30))); // même sel
    expect(toBase64(again.slice(30, HEADER_BYTES))).not.toBe(toBase64(file.slice(30, HEADER_BYTES))); // nonce neuf
    expect(decryptWithKey(again, key.key, nobleEngine)).toEqual({ ok: true, text: '{}' });
  });

  it('refuse un mauvais mot de passe, un fichier abîmé ou étranger, sans rien restaurer', async () => {
    const { repo } = await fakeNotebook();
    const { file } = await backup(repo);
    expect(decryptWithPassword(file, 'autre-mot-de-passe', nobleEngine)).toEqual({
      ok: false,
      problem: 'wrong-password-or-damaged',
    });
    const damaged = file.slice();
    damaged[damaged.length - 20] ^= 1;
    expect(decryptWithPassword(damaged, PASSWORD, nobleEngine).ok).toBe(false);
    const badHeader = file.slice();
    badHeader[8] ^= 1; // nombre de passes modifié
    expect(decryptWithPassword(badHeader, PASSWORD, nobleEngine).ok).toBe(false);
    expect(decryptWithPassword(new Uint8Array(200), PASSWORD, nobleEngine)).toEqual({ ok: false, problem: 'not-sillon' });
  });
});

describe('ouverture d’un fichier pour la restauration', () => {
  it('donne l’aperçu, puis la restauration remplace les notes', async () => {
    const { repo } = await fakeNotebook();
    const { file } = await backup(repo);
    const opened = openBackup(file, PASSWORD, nobleEngine);
    expect(opened.ok && opened.summary).toEqual({ createdAt: 1_700_000_500_000, notes: 4, archived: 2, trashed: 1 });
    if (!opened.ok) return;
    const target = await freshRepo();
    await target.replaceAll(opened.content.notes);
    expect(await target.exportAll()).toEqual(await repo.exportAll());
  });

  it('dit pourquoi un fichier ne s’ouvre pas', async () => {
    const { repo } = await fakeNotebook();
    const { file } = await backup(repo);
    expect(openBackup(file, 'autre-mot-de-passe', nobleEngine)).toEqual({ ok: false, problem: 'wrong-password' });
    expect(openBackup(new Uint8Array(200), PASSWORD, nobleEngine)).toEqual({ ok: false, problem: 'not-sillon' });
    expect(openBackup(new Uint8Array(3), PASSWORD, nobleEngine)).toEqual({ ok: false, problem: 'not-sillon' });
    const future = file.slice();
    future[4] = 9; // version du format inconnue
    expect(openBackup(future, PASSWORD, nobleEngine)).toEqual({ ok: false, problem: 'unknown-version' });
    const key = createBackupKey(PASSWORD, TEST_KDF, nobleEngine);
    expect(openBackup(encryptWithKey('{"format":"autre"}', key, nobleEngine), PASSWORD, nobleEngine)).toEqual({
      ok: false,
      problem: 'not-sillon',
    });
    expect(openBackup(encryptWithKey('{"format":"sillon-backup","version":1}', key, nobleEngine), PASSWORD, nobleEngine)).toEqual({
      ok: false,
      problem: 'invalid',
    });
  });
});

describe('format version 1 figé', () => {
  it('relit un fichier de version 1 fabriqué une fois pour toutes', () => {
    const file = fromBase64(BACKUP_V1_FILE)!;
    const dec = decryptWithPassword(file, BACKUP_V1_PASSWORD, nobleEngine);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    const parsed = parsePayload(dec.text);
    expect(parsed.ok && parsed.content.notes.map((n) => n.title)).toEqual(['Voyage à Lisbonne', 'Jardin']);
  });

  it('produit toujours les mêmes octets pour les mêmes entrées', () => {
    let seed = 0;
    const fixed: CryptoEngine = {
      ...nobleEngine,
      random: (n) => Uint8Array.from({ length: n }, () => seed++ & 0xff),
    };
    const key = createBackupKey(BACKUP_V1_PASSWORD, TEST_KDF, fixed);
    const json = buildPayload({
      createdAt: 1_700_000_000_000,
      schemaVersion: 2,
      username: 'camille',
      settings: { lockDelayMin: 5 },
      notes: [
        { id: 'a', title: 'Voyage à Lisbonne', body: FAKE_NOTES.voyage.body, parentId: null, pinned: true, createdAt: 1, updatedAt: 2, deletedAt: null, archivedAt: null },
        { id: 'b', title: 'Jardin', body: FAKE_NOTES.jardin.body, parentId: 'a', pinned: false, createdAt: 3, updatedAt: 4, deletedAt: null, archivedAt: 5 },
      ],
    });
    expect(toBase64(encryptWithKey(json, key, fixed))).toBe(BACKUP_V1_FILE);
  });
});

describe('contenu de la sauvegarde', () => {
  it('refuse un contenu étranger, d’une version inconnue ou incohérent', () => {
    expect(parsePayload('pas du json')).toEqual({ ok: false, problem: 'not-backup' });
    expect(parsePayload('{"format":"autre"}')).toEqual({ ok: false, problem: 'not-backup' });
    expect(parsePayload('{"format":"sillon-backup","version":99}')).toEqual({ ok: false, problem: 'unknown-version' });
    const base = { createdAt: 1, schemaVersion: 2, username: 'x', settings: { lockDelayMin: 5 } };
    const note = { id: 'a', title: '', body: '', parentId: null, pinned: false, createdAt: 1, updatedAt: 1, deletedAt: null, archivedAt: null };
    expect(parsePayload(buildPayload({ ...base, notes: [note, note] }))).toEqual({ ok: false, problem: 'invalid' });
    expect(parsePayload(buildPayload({ ...base, notes: [{ ...note, pinned: 1 } as never] }))).toEqual({
      ok: false,
      problem: 'invalid',
    });
  });

  it('remet à la racine une note dont la parente manque', () => {
    const base = { createdAt: 1, schemaVersion: 2, username: 'x', settings: { lockDelayMin: 5 } };
    const note = { id: 'a', title: '', body: '', parentId: 'disparue', pinned: false, createdAt: 1, updatedAt: 1, deletedAt: null, archivedAt: null };
    const parsed = parsePayload(buildPayload({ ...base, notes: [note] }));
    expect(parsed.ok && parsed.content.notes[0].parentId).toBeNull();
  });

  it('écrit le base64 comme libsodium', () => {
    for (const len of [0, 1, 2, 3, 4, 5, 54]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff);
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      expect(fromBase64(toBase64(bytes))).toEqual(bytes);
    }
  });
});
