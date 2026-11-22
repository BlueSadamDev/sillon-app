// Contenu d'une sauvegarde (version 1, figée au lot 2), tel qu'il est chiffré.
// Calcul pur, sans accès au téléphone.
//
// Contenu (cahier des charges, F7) : toutes les notes, y compris archives et corbeille ; l'arborescence
// (note parente) et les épingles sont des champs de chaque note ; les tags sont écrits dans le texte
// (#mot) et recalculés à la restauration, comme l'index de recherche. Réglages : délai de verrouillage.
// Jamais dedans : le mot de passe du compte, la clé de sauvegarde, les fichiers de modèle IA.

import type { Note } from '@/notes/types';

export const PAYLOAD_FORMAT = 'sillon-backup';
export const PAYLOAD_VERSION = 1;

export type BackupSettings = { lockDelayMin: number };

export type BackupContent = {
  format: typeof PAYLOAD_FORMAT;
  version: number;
  /** Date de la sauvegarde (millisecondes depuis 1970). */
  createdAt: number;
  /** Version de la base au moment de la sauvegarde (pour information). */
  schemaVersion: number;
  /** Identifiant du compte, proposé à la création du compte après une restauration. */
  username: string;
  settings: BackupSettings;
  notes: Note[];
};

export function buildPayload(input: Omit<BackupContent, 'format' | 'version'>): string {
  const content: BackupContent = { format: PAYLOAD_FORMAT, version: PAYLOAD_VERSION, ...input };
  return JSON.stringify(content);
}

export type PayloadProblem = 'not-backup' | 'unknown-version' | 'invalid';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = (v: unknown) => v === null || isNum(v);
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string';

function isNote(v: unknown): v is Note {
  if (typeof v !== 'object' || v === null) return false;
  const n = v as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    n.id !== '' &&
    typeof n.title === 'string' &&
    typeof n.body === 'string' &&
    isStrOrNull(n.parentId) &&
    typeof n.pinned === 'boolean' &&
    isNum(n.createdAt) &&
    isNum(n.updatedAt) &&
    isNumOrNull(n.deletedAt) &&
    isNumOrNull(n.archivedAt)
  );
}

/** Relit et vérifie le contenu déchiffré. Une sauvegarde incohérente est refusée en entier. */
export function parsePayload(text: string): { ok: true; content: BackupContent } | { ok: false; problem: PayloadProblem } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'not-backup' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, problem: 'not-backup' };
  const d = data as Record<string, unknown>;
  if (d.format !== PAYLOAD_FORMAT) return { ok: false, problem: 'not-backup' };
  if (d.version !== PAYLOAD_VERSION) return { ok: false, problem: 'unknown-version' };
  const settings = d.settings as Record<string, unknown> | null | undefined;
  if (
    !isNum(d.createdAt) ||
    !isNum(d.schemaVersion) ||
    typeof d.username !== 'string' ||
    typeof settings !== 'object' ||
    settings === null ||
    !isNum(settings.lockDelayMin) ||
    !Array.isArray(d.notes) ||
    !d.notes.every(isNote)
  ) {
    return { ok: false, problem: 'invalid' };
  }
  const notes = d.notes as Note[];
  const ids = new Set(notes.map((n) => n.id));
  if (ids.size !== notes.length) return { ok: false, problem: 'invalid' };
  // Une note dont la parente manque revient à la racine plutôt que de rester introuvable.
  const fixed = notes.map((n) => (n.parentId !== null && !ids.has(n.parentId) ? { ...n, parentId: null } : n));
  return {
    ok: true,
    content: {
      format: PAYLOAD_FORMAT,
      version: PAYLOAD_VERSION,
      createdAt: d.createdAt,
      schemaVersion: d.schemaVersion,
      username: d.username,
      settings: { lockDelayMin: settings.lockDelayMin },
      notes: fixed,
    },
  };
}

/** Aperçu affiché avant la restauration. */
export type BackupSummary = { createdAt: number; notes: number; archived: number; trashed: number };

export function summarize(content: BackupContent): BackupSummary {
  let archived = 0;
  let trashed = 0;
  for (const n of content.notes) {
    if (n.deletedAt !== null) trashed++;
    else if (n.archivedAt !== null) archived++;
  }
  return { createdAt: content.createdAt, notes: content.notes.length - trashed, archived, trashed };
}
