import { makeFakeBackupJson, makeFakeNotes } from './__fixtures__/fakeNotes';

describe('carnet fictif', () => {
  it('est déterministe et cohérent', () => {
    expect(makeFakeBackupJson(50)).toBe(makeFakeBackupJson(50));
    const notes = makeFakeNotes(30);
    const ids = new Set(notes.map((n) => n.id));
    expect(ids.size).toBe(30);
    for (const n of notes) if (n.parentId) expect(ids.has(n.parentId)).toBe(true);
  });
});
