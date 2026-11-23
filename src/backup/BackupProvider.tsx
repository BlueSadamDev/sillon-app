// État de la sauvegarde pour toute l'app : dossier choisi, clé créée, dernière sauvegarde.
// Le dossier est choisi avec le sélecteur de dossiers d'Android (permission persistante).
import { Directory } from 'expo-file-system';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAccount } from '@/account/AccountProvider';
import { afterPaint, secureStore } from '@/account/device';
import { openNotes } from '@/db/expoDb';
import { SCHEMA_VERSION } from '@/db/schema';

import { createBackupKey, encryptWithKey } from './cipher';
import { type BackupConfig, EMPTY_CONFIG, folderDisplayName, isConfigured, parseConfig, serializeConfig } from './config';
import { folderOps, waitMs } from './device';
import { buildPayload } from './payload';
import { BACKUP_CONFIG_KEY, BACKUP_KDF, BACKUP_KDF_FALLBACK, BACKUP_STATE_KEY, VERIFY_DELAY_MS } from './settings';
import { sodiumEngine } from './sodium';
import { backupFileName, type BackupProblem, type BackupStatus, EMPTY_STATUS, parseStatus, pendingProblem } from './status';
import { writeVerified } from './write';

export type RunOutcome = { ok: true } | { ok: false; problem: BackupProblem | 'busy' | 'not-configured' };

type BackupState = {
  loading: boolean;
  configured: boolean;
  folderName: string | null;
  hasPassword: boolean;
  status: BackupStatus;
  /** Problème à régler (plus récent que la dernière réussite), ou null. */
  problem: BackupProblem | null;
  running: boolean;
  /** Ouvre le sélecteur de dossiers. Renvoie false si l'utilisateur annule. */
  chooseFolder(): Promise<boolean>;
  /** Calcule la clé à partir du nouveau mot de passe (environ 1 s) et la range dans le coffre. */
  setPassword(password: string): Promise<void>;
  /** Sauvegarde maintenant : chiffrer, écrire dans le dossier, vérifier par la liste du dossier. */
  backupNow(): Promise<RunOutcome>;
  /** Oublie le dossier, la clé et l'état (« Effacer toutes les données ») ; les fichiers dans pCloud restent. */
  forget(): Promise<void>;
};

const Ctx = createContext<BackupState | null>(null);

export function useBackup(): BackupState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useBackup hors de BackupProvider');
  return value;
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const [config, setConfig] = useState<BackupConfig>(EMPTY_CONFIG);
  const [status, setStatus] = useState<BackupStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  // Une seule action à la fois dans le dossier pCloud.
  const busy = useRef(false);

  useEffect(() => {
    Promise.all([
      secureStore.get(BACKUP_CONFIG_KEY).then(parseConfig).catch(() => EMPTY_CONFIG),
      secureStore.get(BACKUP_STATE_KEY).then(parseStatus).catch(() => EMPTY_STATUS),
    ]).then(([c, s]) => {
      setConfig(c);
      setStatus(s);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (next: BackupConfig) => {
    await secureStore.set(BACKUP_CONFIG_KEY, serializeConfig(next));
    setConfig(next);
  }, []);

  const saveStatus = useCallback(async (next: BackupStatus) => {
    await secureStore.set(BACKUP_STATE_KEY, JSON.stringify(next));
    setStatus(next);
  }, []);

  const { username, lockDelayMin } = account;

  const value = useMemo<BackupState>(
    () => ({
      loading,
      configured: isConfigured(config),
      folderName: config.folder?.name ?? null,
      hasPassword: config.key !== null,
      status,
      problem: pendingProblem(status),
      running,

      async chooseFolder() {
        let dir: Directory;
        try {
          dir = await Directory.pickDirectoryAsync();
        } catch {
          return false; // sélecteur fermé sans choix
        }
        await save({ ...config, folder: { uri: dir.uri, name: folderDisplayName(dir.name, dir.uri) } });
        // Nouveau dossier : l'ancien problème d'accès ne vaut plus.
        if (status.lastProblem) await saveStatus({ ...status, lastProblem: null, lastProblemAt: null });
        return true;
      },

      async setPassword(password) {
        await afterPaint();
        let key;
        try {
          key = createBackupKey(password, BACKUP_KDF, sodiumEngine);
        } catch {
          // Mémoire insuffisante : réglage de repli (cahier des charges, F7).
          key = createBackupKey(password, BACKUP_KDF_FALLBACK, sodiumEngine);
        }
        await save({ ...config, key });
      },

      async backupNow() {
        if (!config.folder || !config.key) return { ok: false, problem: 'not-configured' };
        if (busy.current) return { ok: false, problem: 'busy' };
        busy.current = true;
        setRunning(true);
        try {
          await afterPaint();
          const now = new Date();
          const notes = await (await openNotes()).exportAll();
          const json = buildPayload({
            createdAt: now.getTime(),
            schemaVersion: SCHEMA_VERSION,
            username,
            settings: { lockDelayMin },
            notes,
          });
          const bytes = encryptWithKey(json, config.key, sodiumEngine);
          const result = await writeVerified(
            folderOps(config.folder.uri),
            backupFileName(now),
            bytes,
            waitMs(VERIFY_DELAY_MS),
          );
          if (result.ok) {
            await saveStatus({ ...status, lastSuccessAt: Date.now(), lastFileName: result.name });
            return { ok: true };
          }
          await saveStatus({ ...status, lastProblem: result.problem, lastProblemAt: Date.now() });
          return { ok: false, problem: result.problem };
        } catch {
          // Problème imprévu (lecture des notes, chiffrement) : la sauvegarde n'a pas eu lieu.
          await saveStatus({ ...status, lastProblem: 'write-failed', lastProblemAt: Date.now() });
          return { ok: false, problem: 'write-failed' };
        } finally {
          busy.current = false;
          setRunning(false);
        }
      },

      async forget() {
        await secureStore.remove(BACKUP_CONFIG_KEY);
        await secureStore.remove(BACKUP_STATE_KEY);
        setConfig(EMPTY_CONFIG);
        setStatus(EMPTY_STATUS);
      },
    }),
    [config, status, loading, running, save, saveStatus, username, lockDelayMin],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
