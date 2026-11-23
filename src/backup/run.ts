// Une sauvegarde complète, hors de l'interface : utilisée par « Sauvegarder maintenant »,
// par la sauvegarde automatique à l'ouverture et par la tâche de fond.
// Lit la configuration et l'état dans le coffre sécurisé, écrit l'état mis à jour.
import { afterPaint, secureStore } from '@/account/device';
import { ACCOUNT_KEY, DEFAULT_LOCK_DELAY_MIN } from '@/account/settings';
import { parseAccount } from '@/account/store';
import { openNotes } from '@/db/expoDb';
import { SCHEMA_VERSION } from '@/db/schema';

import { encryptWithKey } from './cipher';
import { parseConfig } from './config';
import { folderOps, waitMs } from './device';
import { buildPayload } from './payload';
import { BACKUP_CONFIG_KEY, BACKUP_KEEP, BACKUP_STATE_KEY, DELETE_DELAY_MS, VERIFY_DELAY_MS } from './settings';
import { sodiumEngine } from './sodium';
import {
  afterAccessCheck,
  autoBackupDue,
  backupFileName,
  type BackupProblem,
  type BackupStatus,
  parseStatus,
} from './status';
import { type FolderOps, rotateVerified, writeVerified } from './write';

export type RunOutcome = { ok: true } | { ok: false; problem: BackupProblem | 'busy' | 'not-configured' | 'not-due' };

export async function readStatus(): Promise<BackupStatus> {
  return parseStatus(await secureStore.get(BACKUP_STATE_KEY).catch(() => null));
}

async function writeStatus(next: BackupStatus): Promise<void> {
  await secureStore.set(BACKUP_STATE_KEY, JSON.stringify(next));
}

/**
 * Vérification légère de l'accès au dossier (lecture de la liste, sans écrire) : note le problème
 * « dossier inaccessible », ou l'efface quand l'accès est revenu.
 */
async function checkAccess(ops: FolderOps, status: BackupStatus): Promise<void> {
  const lost = await ops.names().then(
    () => false,
    () => true,
  );
  const next = afterAccessCheck(status, lost, Date.now());
  if (next) await writeStatus(next);
}

// Une seule action à la fois dans le dossier pCloud (écran, ouverture et tâche de fond confondus).
let busy = false;
export const isBackupRunning = () => busy;

/**
 * Sauvegarde : chiffrer avec la clé gardée, écrire dans le dossier, vérifier par la liste du dossier,
 * puis rotation. `auto` : seulement si aucune sauvegarde n'a réussi aujourd'hui (F7).
 */
export async function runBackup(auto: boolean): Promise<RunOutcome> {
  if (busy) return { ok: false, problem: 'busy' };
  busy = true;
  try {
    const config = parseConfig(await secureStore.get(BACKUP_CONFIG_KEY).catch(() => null));
    if (!config.folder || !config.key) return { ok: false, problem: 'not-configured' };
    let status = await readStatus();
    const now = new Date();
    if (auto) {
      if (!autoBackupDue(true, status, now)) {
        // Pas de sauvegarde à faire : on vérifie quand même que le dossier reste accessible
        // (permission perdue, app pCloud désinstallée ou déconnectée, téléphone redémarré).
        await checkAccess(folderOps(config.folder.uri), status);
        return { ok: false, problem: 'not-due' };
      }
      status = { ...status, lastAutoAttemptAt: now.getTime() };
      await writeStatus(status);
    }
    try {
      await afterPaint();
      const account = parseAccount(await secureStore.get(ACCOUNT_KEY));
      const notes = await (await openNotes()).exportAll();
      const json = buildPayload({
        createdAt: now.getTime(),
        schemaVersion: SCHEMA_VERSION,
        username: account?.username ?? '',
        authorId: account?.authorId || null,
        settings: { lockDelayMin: account?.lockDelayMin ?? DEFAULT_LOCK_DELAY_MIN },
        notes,
      });
      const bytes = encryptWithKey(json, config.key, sodiumEngine);
      const ops = folderOps(config.folder.uri);
      const result = await writeVerified(ops, backupFileName(now), bytes, waitMs(VERIFY_DELAY_MS));
      if (!result.ok) {
        await writeStatus({ ...status, lastProblem: result.problem, lastProblemAt: Date.now() });
        return { ok: false, problem: result.problem };
      }
      await writeStatus({ ...status, lastSuccessAt: Date.now(), lastFileName: result.name });
      // Rotation après la sauvegarde : une suppression refusée sera retentée la prochaine fois.
      await rotateVerified(ops, BACKUP_KEEP, waitMs(DELETE_DELAY_MS));
      return { ok: true };
    } catch {
      // Problème imprévu (lecture des notes, chiffrement) : la sauvegarde n'a pas eu lieu.
      await writeStatus({ ...status, lastProblem: 'write-failed', lastProblemAt: Date.now() });
      return { ok: false, problem: 'write-failed' };
    }
  } finally {
    busy = false;
  }
}
