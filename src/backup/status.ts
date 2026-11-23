// État de la sauvegarde (calcul pur) : nom des fichiers, dernière réussite, pastille de l'accueil.
import { fileStamp } from './rotation';
import { BACKUP_EXTENSION, BACKUP_OLD_AFTER_DAYS, BACKUP_PREFIX } from './settings';

/** folder-lost : dossier inaccessible ou permission perdue ; write-failed : fichier absent après l'écriture. */
export type BackupProblem = 'folder-lost' | 'write-failed';

export type BackupStatus = {
  lastSuccessAt: number | null;
  lastFileName: string | null;
  lastProblem: BackupProblem | null;
  lastProblemAt: number | null;
};

export const EMPTY_STATUS: BackupStatus = { lastSuccessAt: null, lastFileName: null, lastProblem: null, lastProblemAt: null };

export function parseStatus(raw: string | null): BackupStatus {
  if (raw === null) return EMPTY_STATUS;
  try {
    const d = JSON.parse(raw) as Partial<BackupStatus>;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
      lastSuccessAt: num(d.lastSuccessAt),
      lastFileName: typeof d.lastFileName === 'string' ? d.lastFileName : null,
      lastProblem: d.lastProblem === 'folder-lost' || d.lastProblem === 'write-failed' ? d.lastProblem : null,
      lastProblemAt: num(d.lastProblemAt),
    };
  } catch {
    return EMPTY_STATUS;
  }
}

/** Nom d'un nouveau fichier : « sillon-20261123-140500.bin » (heure locale). */
export function backupFileName(now: Date): string {
  return `${BACKUP_PREFIX}${fileStamp(now)}${BACKUP_EXTENSION}`;
}

const OURS = new RegExp(`^${BACKUP_PREFIX}\\d{8}-\\d{6}\\${BACKUP_EXTENSION}$`);

/** Fichier de sauvegarde de Sillon (les fichiers d'essai du lot 0 et les autres ne le sont pas). */
export function isBackupName(name: string): boolean {
  return OURS.test(name);
}

/** Nombre de jours de calendrier entre deux instants (heure locale). */
export function daysBetween(earlier: number, now: Date): number {
  const a = new Date(earlier);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((startB - startA) / 86_400_000));
}

/** Un problème plus récent que la dernière réussite reste à régler. */
export function pendingProblem(s: BackupStatus): BackupProblem | null {
  if (s.lastProblem === null) return null;
  if (s.lastSuccessAt !== null && (s.lastProblemAt ?? 0) <= s.lastSuccessAt) return null;
  return s.lastProblem;
}

export type Badge =
  | { tone: 'warn'; kind: 'setup' | 'never' }
  | { tone: 'error'; kind: 'check' }
  | { tone: 'ok' | 'warn'; kind: 'days'; days: number };

/** Pastille d'état de l'accueil (DESIGN.md, « Pastille d'état de la sauvegarde »). */
export function badgeFor(configured: boolean, s: BackupStatus, now: Date): Badge {
  if (!configured) return { tone: 'warn', kind: 'setup' };
  if (pendingProblem(s)) return { tone: 'error', kind: 'check' };
  if (s.lastSuccessAt === null) return { tone: 'warn', kind: 'never' };
  const days = daysBetween(s.lastSuccessAt, now);
  return { tone: days > BACKUP_OLD_AFTER_DAYS ? 'warn' : 'ok', kind: 'days', days };
}
