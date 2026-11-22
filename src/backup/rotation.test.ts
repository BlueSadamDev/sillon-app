import { fileStamp, filesToDelete, stampOf } from './rotation';

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
