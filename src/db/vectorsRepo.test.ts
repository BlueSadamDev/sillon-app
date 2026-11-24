import { FAKE_NOTES } from '@/notes/__fixtures__/notes';

import { createNotesRepo } from './notesRepo';
import { migrate } from './schema';
import { memoryDb } from './testing/nodeDb';
import { decodeVector, encodeVector } from './vectorCodec';
import { createVectorsRepo } from './vectorsRepo';

const MODEL = 'modele-fictif';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  let clock = 1_000_000;
  let counter = 0;
  const notes = createNotesRepo(db, { now: () => clock, newId: () => `id-${++counter}` });
  const vectors = createVectorsRepo(db, { now: () => clock });
  return { db, notes, vectors, tick: () => (clock += 1000) };
}

describe('rangement des vecteurs', () => {
  it('écrit et relit un vecteur sans perte (Float32)', () => {
    const v = [0.5, -0.25, 1e-3, 0, -1, 3.14159];
    const back = Array.from(decodeVector(encodeVector(v)));
    back.forEach((x, i) => expect(x).toBeCloseTo(v[i], 5));
    expect(back).toHaveLength(v.length);
    expect(Array.from(decodeVector(encodeVector([1, 2])))).toEqual([1, 2]);
  });

  it('liste les notes à calculer, puis plus rien une fois calculées', async () => {
    const { notes, vectors } = await setup();
    const a = await notes.create(FAKE_NOTES.voyage);
    await notes.create(FAKE_NOTES.jardin);
    expect(await vectors.progress(MODEL)).toEqual({ total: 2, done: 0 });
    const pending = await vectors.pending(MODEL, 10);
    expect(pending.map((p) => p.knownHash)).toEqual([null, null]);
    for (const p of pending) await vectors.save(p.id, { modelId: MODEL, textHash: 'h', sourceUpdatedAt: p.updatedAt, vector: [1, 0] });
    expect(await vectors.pending(MODEL, 10)).toEqual([]);
    expect(await vectors.progress(MODEL)).toEqual({ total: 2, done: 2 });
    expect(Array.from((await vectors.get(a.id, MODEL))!)).toEqual([1, 0]);
  });

  it('redemande une note modifiée, avec l’empreinte connue', async () => {
    const { notes, vectors, tick } = await setup();
    const a = await notes.create(FAKE_NOTES.voyage);
    await vectors.save(a.id, { modelId: MODEL, textHash: 'h1', sourceUpdatedAt: a.updatedAt, vector: [1, 0] });
    tick();
    await notes.update(a.id, { title: 'Autre', body: 'Texte' });
    const [p] = await vectors.pending(MODEL, 10);
    expect(p).toMatchObject({ id: a.id, knownHash: 'h1', title: 'Autre' });
    expect(await vectors.get(a.id, MODEL)).toBeNull();
    await vectors.confirm(a.id, p.updatedAt);
    expect(await vectors.pending(MODEL, 10)).toEqual([]);
  });

  it('ignore la corbeille et nettoie les vecteurs des notes effacées ou d’un autre modèle', async () => {
    const { db, notes, vectors } = await setup();
    const a = await notes.create(FAKE_NOTES.voyage);
    const b = await notes.create(FAKE_NOTES.jardin);
    for (const n of [a, b]) await vectors.save(n.id, { modelId: MODEL, textHash: 'h', sourceUpdatedAt: n.updatedAt, vector: [1] });
    await notes.trash(b.id);
    const trashed = await notes.get(b.id);
    await vectors.confirm(b.id, trashed!.updatedAt);
    expect((await vectors.all(MODEL)).map((v) => v.id)).toEqual([a.id]);
    expect(await vectors.pending(MODEL, 10)).toEqual([]);
    await notes.deleteForever(b.id);
    await vectors.cleanup(MODEL);
    expect(await db.all('SELECT note_id FROM note_vectors')).toEqual([{ note_id: a.id }]);
    await vectors.cleanup('autre-modele');
    expect(await db.all('SELECT note_id FROM note_vectors')).toEqual([]);
  });

  it('sont effacés avec les données du téléphone, jamais exportés avec les notes', async () => {
    const { db, notes, vectors } = await setup();
    const a = await notes.create(FAKE_NOTES.voyage);
    await vectors.save(a.id, { modelId: MODEL, textHash: 'h', sourceUpdatedAt: a.updatedAt, vector: [1] });
    const exported = await notes.exportAll();
    expect(JSON.stringify(exported)).not.toContain('vector');
    await notes.wipe();
    expect(await db.all('SELECT * FROM note_vectors')).toEqual([]);
  });
});
