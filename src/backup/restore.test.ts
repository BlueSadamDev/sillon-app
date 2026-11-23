// Test « sauvegarder des notes fictives, restaurer, comparer » (CLAUDE.md, Sauvegarde vers pCloud).
// À relancer à chaque modification du format de sauvegarde.
import { createNotesRepo, type NoteIdentity } from '@/db/notesRepo';
import { migrate, SCHEMA_VERSION } from '@/db/schema';
import { memoryDb } from '@/db/testing/nodeDb';
import { FAKE_NOTES } from '@/notes/__fixtures__/notes';

import { BACKUP_V1_FILE, BACKUP_V1_PASSWORD } from './__fixtures__/backupV1';
import { BACKUP_V2_FILE, BACKUP_V2_PASSWORD } from './__fixtures__/backupV2';
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
  const repo = createNotesRepo(db, {
    now: () => (clock += 1000),
    newId: () => `id-${++counter}`,
    identity: () => identity,
  });
  return repo;
}

// Compte et appareil fictifs (préparation au partage).
const AUTHOR = 'auteur-fictif-1';
let identity: NoteIdentity = { authorId: AUTHOR, deviceId: 'telephone-a' };
beforeEach(() => {
  identity = { authorId: AUTHOR, deviceId: 'telephone-a' };
});

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
    authorId: AUTHOR,
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
    expect(parsed.content.authorId).toBe(AUTHOR);
    expect(parsed.content.version).toBe(2);
    expect(parsed.content.settings).toEqual({ lockDelayMin: 15 });
    expect(summarize(parsed.content)).toEqual({ createdAt: 1_700_000_500_000, notes: 4, archived: 2, trashed: 1 });

    // Le nouveau téléphone a son propre appareil : les notes restaurées gardent ceux de la sauvegarde.
    identity = { authorId: AUTHOR, deviceId: 'telephone-b' };
    const target = await freshRepo();
    await target.create({ title: 'Note du nouveau téléphone, remplacée' });
    await target.replaceAll(parsed.content.notes);
    expect(await target.adoptUnowned()).toBe(0);

    const restored = await target.exportAll();
    expect(restored).toEqual(await repo.exportAll());
    expect(restored.every((n) => n.authorId === AUTHOR && n.deviceId === 'telephone-a')).toBe(true);
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

/** Moteur au hasard prévisible : mêmes octets à chaque fois (fichiers de référence). */
function fixedEngine(): CryptoEngine {
  let seed = 0;
  return { ...nobleEngine, random: (n) => Uint8Array.from({ length: n }, () => seed++ & 0xff) };
}

const FROZEN_NOTES = [
  { id: 'a', title: 'Voyage à Lisbonne', body: FAKE_NOTES.voyage.body, parentId: null, pinned: true, createdAt: 1, updatedAt: 2, deletedAt: null, archivedAt: null },
  { id: 'b', title: 'Jardin', body: FAKE_NOTES.jardin.body, parentId: 'a', pinned: false, createdAt: 3, updatedAt: 4, deletedAt: null, archivedAt: 5 },
];

describe('format version 1 figé', () => {
  it('relit un fichier de version 1 fabriqué une fois pour toutes, sans auteur ni appareil', () => {
    const opened = openBackup(fromBase64(BACKUP_V1_FILE)!, BACKUP_V1_PASSWORD, nobleEngine);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.content.version).toBe(1);
    expect(opened.content.authorId).toBeNull();
    expect(opened.content.notes.map((n) => [n.title, n.authorId, n.deviceId])).toEqual([
      ['Voyage à Lisbonne', null, null],
      ['Jardin', null, null],
    ]);
  });

  it('produit toujours les mêmes octets pour les mêmes entrées (couche de chiffrement inchangée)', () => {
    const engine = fixedEngine();
    const key = createBackupKey(BACKUP_V1_PASSWORD, TEST_KDF, engine);
    const json = JSON.stringify({
      format: 'sillon-backup',
      version: 1,
      createdAt: 1_700_000_000_000,
      schemaVersion: 2,
      username: 'camille',
      settings: { lockDelayMin: 5 },
      notes: FROZEN_NOTES,
    });
    expect(toBase64(encryptWithKey(json, key, engine))).toBe(BACKUP_V1_FILE);
  });

  it('restaure une sauvegarde de version 1 : les notes reçoivent le compte et l’appareil du téléphone', async () => {
    const opened = openBackup(fromBase64(BACKUP_V1_FILE)!, BACKUP_V1_PASSWORD, nobleEngine);
    if (!opened.ok) throw new Error('sauvegarde de version 1 illisible');
    const target = await freshRepo();
    await target.replaceAll(opened.content.notes);
    expect(await target.adoptUnowned()).toBe(2);
    const notes = await target.exportAll();
    expect(notes.map((n) => [n.authorId, n.deviceId])).toEqual([
      [AUTHOR, 'telephone-a'],
      [AUTHOR, 'telephone-a'],
    ]);
    expect(notes.map((n) => n.updatedAt)).toEqual([2, 4]); // dates de modification intactes
  });
});

describe('format version 2 figé', () => {
  function v2Payload() {
    return buildPayload({
      createdAt: 1_700_000_000_000,
      schemaVersion: 3,
      username: 'camille',
      authorId: 'auteur-fictif-1',
      settings: { lockDelayMin: 5 },
      notes: FROZEN_NOTES.map((n, i) => ({ ...n, authorId: 'auteur-fictif-1', deviceId: `appareil-fictif-${i + 1}` })),
    });
  }

  it('relit un fichier de version 2 fabriqué une fois pour toutes', () => {
    const opened = openBackup(fromBase64(BACKUP_V2_FILE)!, BACKUP_V2_PASSWORD, nobleEngine);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.content.version).toBe(2);
    expect(opened.content.authorId).toBe('auteur-fictif-1');
    expect(opened.content.notes.map((n) => [n.title, n.authorId, n.deviceId])).toEqual([
      ['Voyage à Lisbonne', 'auteur-fictif-1', 'appareil-fictif-1'],
      ['Jardin', 'auteur-fictif-1', 'appareil-fictif-2'],
    ]);
  });

  it('produit toujours les mêmes octets pour les mêmes entrées', () => {
    const engine = fixedEngine();
    const key = createBackupKey(BACKUP_V2_PASSWORD, TEST_KDF, engine);
    expect(toBase64(encryptWithKey(v2Payload(), key, engine))).toBe(BACKUP_V2_FILE);
  });
});

describe('contenu de la sauvegarde', () => {
  it('refuse un contenu étranger, d’une version inconnue ou incohérent', () => {
    expect(parsePayload('pas du json')).toEqual({ ok: false, problem: 'not-backup' });
    expect(parsePayload('{"format":"autre"}')).toEqual({ ok: false, problem: 'not-backup' });
    expect(parsePayload('{"format":"sillon-backup","version":99}')).toEqual({ ok: false, problem: 'unknown-version' });
    const base = { createdAt: 1, schemaVersion: 3, username: 'x', authorId: 'u', settings: { lockDelayMin: 5 } };
    const note = { id: 'a', title: '', body: '', parentId: null, pinned: false, createdAt: 1, updatedAt: 1, deletedAt: null, archivedAt: null, authorId: 'u', deviceId: 'd' };
    expect(parsePayload(buildPayload({ ...base, notes: [note, note] }))).toEqual({ ok: false, problem: 'invalid' });
    expect(parsePayload(buildPayload({ ...base, notes: [{ ...note, pinned: 1 } as never] }))).toEqual({
      ok: false,
      problem: 'invalid',
    });
    // Version 2 : une note sans auteur ni appareil est incohérente.
    const { authorId: _a, deviceId: _d, ...withoutIds } = note;
    expect(parsePayload(buildPayload({ ...base, notes: [withoutIds as never] }))).toEqual({ ok: false, problem: 'invalid' });
    expect(parsePayload('{"format":"sillon-backup","version":3}')).toEqual({ ok: false, problem: 'unknown-version' });
  });

  it('remet à la racine une note dont la parente manque', () => {
    const base = { createdAt: 1, schemaVersion: 3, username: 'x', authorId: 'u', settings: { lockDelayMin: 5 } };
    const note = { id: 'a', title: '', body: '', parentId: 'disparue', pinned: false, createdAt: 1, updatedAt: 1, deletedAt: null, archivedAt: null, authorId: 'u', deviceId: 'd' };
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
