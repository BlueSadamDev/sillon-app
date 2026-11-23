import { fileStamp, filesToDelete, stampOf } from './rotation';
import { fakeFolder } from './testing/fakeFolder';
import { rotateVerified } from './write';

describe('rotation des sauvegardes', () => {
  it('fabrique un horodatage triable', () => {
    expect(fileStamp(new Date(2026, 10, 21, 9, 5, 7))).toBe('20261121-090507');
  });

  it('lit l’horodatage même dans une adresse content:// encodée', () => {
    expect(stampOf('primary%3ApCloud%2Fsillon-essai-20261121-090507.sillon')).toBe('20261121-090507');
    expect(stampOf('notes.txt')).toBeNull();
  });

  it('garde les plus récentes et ne touche jamais aux fichiers inconnus', () => {
    const names = [
      'sillon-essai-20261101-120000.sillon',
      'sillon-essai-20261121-120000.sillon',
      'photo.jpg',
      'sillon-essai-20261110-120000.sillon',
      'autre-20261001-120000.sillon',
      'sillon-essai-20261120-120000.sillon',
    ];
    expect(filesToDelete(names, 'sillon-essai-', 2)).toEqual([
      'sillon-essai-20261110-120000.sillon',
      'sillon-essai-20261101-120000.sillon',
    ]);
    expect(filesToDelete(names, 'sillon-essai-', 10)).toEqual([]);
  });
});

describe('rotation vérifiée dans le dossier', () => {
  const noWait = async () => {};
  const day = (d: number) => `sillon-202611${String(d).padStart(2, '0')}-120000.bin`;
  const twelve = Array.from({ length: 12 }, (_, i) => day(i + 1));

  it('supprime les plus anciennes, une à la fois, et ne touche pas aux autres fichiers', async () => {
    const { ops, files, actions } = fakeFolder(['photo.jpg', 'sillon-essai-20261101-120000.bin', ...twelve]);
    const r = await rotateVerified(ops, 10, noWait);
    expect(r).toEqual({ deleted: [day(1), day(2)], kept: [], folderLost: false });
    expect(actions).toEqual([`remove ${day(1)}`, `remove ${day(2)}`]);
    expect(files).toContain('photo.jpg');
    expect(files).toContain('sillon-essai-20261101-120000.bin');
    expect(files.filter((f) => f.startsWith('sillon-2026'))).toHaveLength(10);
  });

  it('attend avant chaque action', async () => {
    let waits = 0;
    const { ops } = fakeFolder(twelve);
    await rotateVerified(ops, 10, async () => {
      waits++;
    });
    expect(waits).toBe(4);
  });

  it('croit la liste du dossier plutôt que la réponse de pCloud', async () => {
    const { ops } = fakeFolder(twelve, { errorButDeletes: true });
    expect((await rotateVerified(ops, 10, noWait)).deleted).toEqual([day(1), day(2)]);
  });

  it('garde une suppression refusée pour la prochaine fois', async () => {
    const folder = fakeFolder(twelve, { refuseDelete: [day(1)] });
    expect(await rotateVerified(folder.ops, 10, noWait)).toEqual({ deleted: [day(2)], kept: [day(1)], folderLost: false });
    expect(await rotateVerified(fakeFolder(folder.files).ops, 10, noWait)).toEqual({
      deleted: [day(1)],
      kept: [],
      folderLost: false,
    });
  });

  it('ne fait rien sans fichier en trop, ou si le dossier est perdu', async () => {
    expect(await rotateVerified(fakeFolder(twelve.slice(0, 10)).ops, 10, noWait)).toEqual({
      deleted: [],
      kept: [],
      folderLost: false,
    });
    expect((await rotateVerified(fakeFolder(twelve, { lost: true }).ops, 10, noWait)).folderLost).toBe(true);
  });
});
