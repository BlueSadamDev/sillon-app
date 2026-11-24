// Compte et appareil du téléphone, notés sur chaque note écrite (préparation au partage, CLAUDE.md).
// Fixés par le compte (src/account/AccountProvider.tsx) dès qu'il est chargé ; lus par la base à chaque
// écriture. Tant qu'aucun compte n'existe, ils valent null (les notes seront adoptées plus tard).
import type { NoteIdentity } from './notesRepo';

let current: NoteIdentity = { authorId: null, deviceId: null };

export function setNoteIdentity(next: NoteIdentity): void {
  current = next;
}

export function noteIdentity(): NoteIdentity {
  return current;
}
