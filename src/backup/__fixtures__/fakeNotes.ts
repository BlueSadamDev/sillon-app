// Carnet FICTIF pour mesurer le chiffrement (aucune vraie note).
// Les notes sont fabriquées à partir des notes fictives du banc d'essai des embeddings.

import { FIXTURE_NOTES } from '@/ai/__fixtures__/notes-fr';

export type FakeNote = {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** Fabrique `count` notes fictives, toujours les mêmes pour un même nombre (pas d'aléatoire). */
export function makeFakeNotes(count: number): FakeNote[] {
  const notes: FakeNote[] = [];
  const base = Date.UTC(2026, 0, 1);
  for (let i = 0; i < count; i++) {
    const src = FIXTURE_NOTES[i % FIXTURE_NOTES.length];
    const date = new Date(base + i * 3_600_000).toISOString();
    notes.push({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      title: `${src.title} (${i + 1})`,
      content: `# ${src.title}\n\n${src.body}\n\n- [ ] Relire cette note\n- [x] Noter l'idée\n\n> ${src.body.slice(0, 80)}\n\nVoir aussi [[${FIXTURE_NOTES[(i + 1) % FIXTURE_NOTES.length].title}]].`,
      parentId: i % 7 === 0 ? null : notes[i - (i % 7)].id,
      tags: [src.id, i % 2 === 0 ? 'pair' : 'impair'],
      pinned: i % 50 === 0,
      createdAt: date,
      updatedAt: date,
      deletedAt: i % 97 === 0 && i > 0 ? date : null,
    });
  }
  return notes;
}

/** Contenu d'une sauvegarde fictive, tel qu'il serait chiffré. */
export function makeFakeBackupJson(count: number): string {
  return JSON.stringify({ format: 'sillon-backup', version: 1, notes: makeFakeNotes(count) });
}
