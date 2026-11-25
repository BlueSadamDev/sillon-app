// Recherche par le sens et notes liées, avec un modèle simulé et des notes fictives.
import { createNotesRepo } from '@/db/notesRepo';
import { migrate } from '@/db/schema';
import { memoryDb } from '@/db/testing/nodeDb';
import { createVectorsRepo } from '@/db/vectorsRepo';

import { FIXTURE_NOTES } from './__fixtures__/notes-fr';
import { createIndexer } from './indexer';
import { checkCandidate, checkDigest, isInstalledModelValid, parseRecord } from './modelCheck';
import { documentText, queryText, textHash } from './noteText';
import { relatedNotes, semanticResults } from './semantic';
import { EMBEDDING_MODEL, NOTE_TEXT } from './settings';
import { FAKE_DIMENSION, fakeEngine, fakeVector } from './testing/fakeEngine';

const MODEL = 'modele-simule';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  let clock = 1_000_000;
  let counter = 0;
  const notes = createNotesRepo(db, { now: () => clock, newId: () => `id-${++counter}` });
  const vectors = createVectorsRepo(db, { now: () => clock });
  const engine = fakeEngine();
  const pauses: number[] = [];
  const indexer = createIndexer({
    vectors,
    engine,
    modelId: MODEL,
    dimension: FAKE_DIMENSION,
    sleep: async (ms) => {
      pauses.push(ms);
    },
    batchSize: 3,
  });
  return { db, notes, vectors, engine, indexer, pauses, tick: () => (clock += 1000) };
}

describe('texte donné au modèle', () => {
  it('ajoute les préfixes d’EmbeddingGemma du rapport du lot 0', () => {
    expect(documentText({ title: 'Titre', body: 'Texte' })).toBe('title: none | text: Titre\nTexte');
    expect(queryText(' sommeil ')).toBe('task: search result | query: sommeil');
  });

  it('coupe une note trop longue', () => {
    const text = documentText({ title: '', body: 'a'.repeat(NOTE_TEXT.maxChars + 500) });
    expect(text.length).toBe('title: none | text: '.length + NOTE_TEXT.maxChars);
  });

  it('donne une empreinte stable qui change avec le texte', () => {
    expect(textHash('abc')).toBe(textHash('abc'));
    expect(textHash('abc')).not.toBe(textHash('abd'));
  });
});

describe('vérification du modèle', () => {
  const okSize = Math.round((EMBEDDING_MODEL.minBytes + EMBEDDING_MODEL.maxBytes) / 2);

  it('refuse un fichier qui n’est pas un .gguf ou n’a pas la bonne taille', () => {
    expect(checkCandidate({ name: 'modele.bin', sizeBytes: okSize })).toBe('not-gguf');
    expect(checkCandidate({ name: 'petit.gguf', sizeBytes: 126_000_000 })).toBe('wrong-size');
    expect(checkCandidate({ name: 'gros.gguf', sizeBytes: 610_000_000 })).toBe('wrong-size');
    expect(checkCandidate({ name: 'EmbeddingGemma.GGUF', sizeBytes: okSize })).toBeNull();
  });

  it('n’accepte que la bonne empreinte SHA-256', () => {
    expect(checkDigest(EMBEDDING_MODEL.sha256.toUpperCase())).toBeNull();
    expect(checkDigest('0'.repeat(64))).toBe('wrong-file');
  });

  it('reconnaît le modèle déjà vérifié tant que le fichier n’a pas changé', () => {
    const record = parseRecord(JSON.stringify({ modelId: EMBEDDING_MODEL.id, sha256: EMBEDDING_MODEL.sha256, sizeBytes: okSize }));
    expect(isInstalledModelValid(record, okSize)).toBe(true);
    expect(isInstalledModelValid(record, okSize - 1)).toBe(false);
    expect(isInstalledModelValid(record, null)).toBe(false);
    expect(isInstalledModelValid(parseRecord('pas du json'), okSize)).toBe(false);
  });
});

describe('calcul des vecteurs', () => {
  it('rattrape toutes les notes par petits lots, avec une pause entre deux', async () => {
    const { notes, vectors, engine, indexer, pauses } = await setup();
    for (const n of FIXTURE_NOTES) await notes.create({ title: n.title, body: n.body });
    expect(await indexer.run()).toBe('done');
    expect(engine.calls).toHaveLength(FIXTURE_NOTES.length);
    expect(pauses.length).toBe(Math.ceil(FIXTURE_NOTES.length / 3));
    expect(await vectors.progress(MODEL)).toEqual({ total: FIXTURE_NOTES.length, done: FIXTURE_NOTES.length });
  });

  it('ne recalcule que les notes dont le texte a changé', async () => {
    const { notes, engine, indexer, tick } = await setup();
    const a = await notes.create({ title: 'Jardin', body: 'Semer les tomates' });
    const b = await notes.create({ title: 'Cuisine', body: 'Curry de lentilles' });
    await indexer.run();
    engine.calls.length = 0;
    tick();
    await notes.update(a.id, { title: 'Jardin', body: 'Semer les tomates et les radis' });
    tick();
    await notes.move(b.id, a.id);
    await indexer.run();
    expect(engine.calls).toEqual(['title: none | text: Jardin\nSemer les tomates et les radis']);
  });

  it('ignore la corbeille et les notes vides, sans boucler', async () => {
    const { notes, vectors, engine, indexer } = await setup();
    const a = await notes.create({ title: 'Jardin', body: 'Semer les tomates' });
    await notes.create({ title: '', body: '' });
    await notes.trash(a.id);
    expect(await indexer.run()).toBe('done');
    expect(engine.calls).toEqual([]);
    expect(await vectors.pending(MODEL, 10)).toEqual([]);
  });

  it('refuse de ranger un vecteur de mauvaise taille (défaut de llama.rn 0.12.9)', async () => {
    const { db, notes, vectors } = await setup();
    await notes.create({ title: 'Jardin', body: 'Semer les tomates' });
    const wrong = createIndexer({
      vectors,
      engine: { embed: async () => new Array(FAKE_DIMENSION * 2).fill(0.1) },
      modelId: MODEL,
      dimension: FAKE_DIMENSION,
      sleep: async () => undefined,
    });
    expect(await wrong.run()).toBe('failed');
    expect(await db.all('SELECT * FROM note_vectors')).toEqual([]);
  });

  it('s’arrête sur demande, puis reprend où il en était', async () => {
    const { notes, vectors, engine, indexer } = await setup();
    for (const n of FIXTURE_NOTES) await notes.create({ title: n.title, body: n.body });
    const first = indexer.run();
    indexer.stop();
    expect(await first).toBe('stopped');
    const done = (await vectors.progress(MODEL)).done;
    expect(done).toBeLessThan(FIXTURE_NOTES.length);
    expect(await indexer.run()).toBe('done');
    expect(engine.calls).toHaveLength(FIXTURE_NOTES.length);
  });

  it('passe la note qui échoue et continue avec les autres', async () => {
    const { notes, vectors } = await setup();
    await notes.create({ title: 'Jardin', body: 'Semer les tomates' });
    await notes.create({ title: 'Panne', body: 'Ce texte fait échouer le moteur' });
    const indexer = createIndexer({
      vectors,
      engine: {
        embed: async (text) => {
          if (text.includes('Panne')) throw new Error('simulé');
          return fakeVector(text);
        },
      },
      modelId: MODEL,
      dimension: FAKE_DIMENSION,
      sleep: async () => undefined,
    });
    expect(await indexer.run()).toBe('failed');
    expect(await vectors.progress(MODEL)).toEqual({ total: 2, done: 1 });
  });
});

describe('notes liées et recherche par le sens', () => {
  async function indexed() {
    const s = await setup();
    const ids: Record<string, string> = {};
    for (const n of FIXTURE_NOTES) ids[n.id] = (await s.notes.create({ title: n.title, body: n.body })).id;
    const extra = await s.notes.create({
      title: 'Encore le potager',
      body: 'Repiquer les tomates en mai, arroser les courgettes et le basilic.',
    });
    await s.indexer.run();
    return { ...s, ids, extra };
  }

  it('propose les notes les plus proches, sans la note elle-même ni celles sous le seuil', async () => {
    const { vectors, ids, extra } = await indexed();
    const all = await vectors.all(MODEL);
    const own = (await vectors.get(extra.id, MODEL))!;
    const related = relatedNotes(extra.id, own, all, 0.2, 5);
    expect(related[0].id).toBe(ids.jardin);
    expect(related.map((r) => r.id)).not.toContain(extra.id);
    expect(related.every((r) => r.score >= 0.2)).toBe(true);
    expect(relatedNotes(extra.id, own, all, 0.99, 5)).toEqual([]);
  });

  it('trouve une note par le sens, sans répéter les résultats par mots', async () => {
    const { vectors, ids } = await indexed();
    const all = await vectors.all(MODEL);
    const q = fakeVector(queryText('arroser les courgettes du potager'));
    const found = semanticResults(q, all, 0.1, 10);
    expect(found.slice(0, 2).map((r) => r.id)).toContain(ids.jardin);
    const withoutJardin = semanticResults(q, all, 0.1, 10, [ids.jardin]);
    expect(withoutJardin.map((r) => r.id)).not.toContain(ids.jardin);
  });

  it('n’utilise pas les notes de la corbeille', async () => {
    const { notes, vectors, ids, extra } = await indexed();
    await notes.trash(ids.jardin);
    const all = await vectors.all(MODEL);
    const own = (await vectors.get(extra.id, MODEL))!;
    expect(relatedNotes(extra.id, own, all, 0.1, 5).map((r) => r.id)).not.toContain(ids.jardin);
  });
});
