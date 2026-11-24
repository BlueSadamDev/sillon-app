// Export en clair : fichiers Markdown rangés selon l'arborescence, puis ZIP relisible.
import type { Note } from '@/notes/types';

import { exportEntries, safeName } from './plainExport';
import { buildZip, crc32 } from './zip';

const labels = { root: 'Sillon', archives: 'Archives', trash: 'Corbeille', untitled: 'Sans titre' };

function note(id: string, title: string, extra: Partial<Note> = {}): Note {
  return {
    id,
    title,
    body: `Texte fictif de ${title || id}.`,
    parentId: null,
    pinned: false,
    createdAt: Number(id.replace(/\D/g, '')) || 1,
    updatedAt: 1_700_000_000_000,
    deletedAt: null,
    archivedAt: null,
    authorId: null,
    deviceId: null,
    ...extra,
  };
}

/** Lecteur ZIP minimal pour le test : relit les en-têtes locaux. */
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const files: { path: string; text: string; crcOk: boolean }[] = [];
  let pos = 0;
  while (view.getUint32(pos, true) === 0x04034b50) {
    const crc = view.getUint32(pos + 14, true);
    const size = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const name = zip.slice(pos + 30, pos + 30 + nameLen);
    const data = zip.slice(pos + 30 + nameLen, pos + 30 + nameLen + size);
    files.push({ path: decoder.decode(name), text: decoder.decode(data), crcOk: crc32(data) === crc });
    pos += 30 + nameLen + size;
  }
  const centralCount = files.length;
  // Fin du répertoire central : 22 derniers octets.
  const end = zip.length - 22;
  return {
    files,
    endOk: view.getUint32(end, true) === 0x06054b50 && view.getUint16(end + 10, true) === centralCount,
    centralStart: view.getUint32(end + 16, true),
    centralOk: view.getUint32(view.getUint32(end + 16, true), true) === 0x02014b50,
  };
}

describe('export en clair', () => {
  it('range les notes selon l’arborescence, les archives et la corbeille', () => {
    const notes = [
      note('n1', 'Jardin'),
      note('n2', 'Tomates', { parentId: 'n1' }),
      note('n3', 'Variétés', { parentId: 'n2' }),
      note('n4', 'Voyage', { archivedAt: 5 }),
      note('n5', 'Lecture', { deletedAt: 5 }),
      note('n6', 'Jardin'),
      note('n7', ''),
    ];
    expect(exportEntries(notes, labels).map((e) => e.path)).toEqual([
      'Sillon/Jardin.md',
      'Sillon/Jardin/Tomates.md',
      'Sillon/Jardin/Tomates/Variétés.md',
      'Sillon/Archives/Voyage.md',
      'Sillon/Corbeille/Lecture.md',
      'Sillon/Jardin (2).md',
      'Sillon/Sans titre.md',
    ]);
  });

  it('écrit le titre puis le texte Markdown', () => {
    const [entry] = exportEntries([note('n1', 'Jardin')], labels);
    expect(new TextDecoder().decode(entry.data)).toBe('# Jardin\n\nTexte fictif de Jardin.\n');
  });

  it('nettoie les noms de fichiers', () => {
    expect(safeName('Plan: été / hiver?', 'Sans titre')).toBe('Plan été hiver');
    expect(safeName('  ...  ', 'Sans titre')).toBe('Sans titre');
    expect(safeName('x'.repeat(200), 'Sans titre')).toHaveLength(80);
    expect(safeName('Fin.', 'Sans titre')).toBe('Fin');
  });

  it('ne boucle pas sur une arborescence abîmée', () => {
    const notes = [note('n1', 'A', { parentId: 'n2' }), note('n2', 'B', { parentId: 'n1' })];
    expect(exportEntries(notes, labels)).toHaveLength(2);
  });
});

describe('fichier ZIP', () => {
  it('calcule le CRC-32 standard', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('se relit avec les mêmes fichiers, accents compris', () => {
    const entries = exportEntries([note('n1', 'Été à Lisbonne'), note('n2', 'Œuvres', { parentId: 'n1' })], labels);
    const zip = readZip(buildZip(entries));
    expect(zip.files.map((f) => f.path)).toEqual(['Sillon/Été à Lisbonne.md', 'Sillon/Été à Lisbonne/Œuvres.md']);
    expect(zip.files.every((f) => f.crcOk)).toBe(true);
    expect(zip.files[1].text).toBe('# Œuvres\n\nTexte fictif de Œuvres.\n');
    expect(zip.endOk && zip.centralOk).toBe(true);
  });

  it('fabrique un ZIP vide valide sans note', () => {
    const zip = buildZip([]);
    expect(zip).toHaveLength(22);
    expect(readZip(zip).endOk).toBe(true);
  });
});
