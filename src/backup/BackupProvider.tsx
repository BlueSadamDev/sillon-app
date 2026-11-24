// État de la sauvegarde pour toute l'app : dossier choisi, clé créée, dernière sauvegarde.
// Le dossier est choisi avec le sélecteur de dossiers d'Android (permission persistante).
// La sauvegarde elle-même est dans run.ts (partagée avec la tâche de fond).
import { Directory } from 'expo-file-system';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAccount } from '@/account/AccountProvider';
import { afterPaint, secureStore } from '@/account/device';

import { createBackupKey } from './cipher';
import { type BackupConfig, EMPTY_CONFIG, folderDisplayName, isConfigured, parseConfig, serializeConfig } from './config';
import { checkFolderAccess, readStatus, runBackup, type RunOutcome } from './run';
import { AUTO_START_DELAY_MS, BACKUP_CONFIG_KEY, BACKUP_KDF, BACKUP_KDF_FALLBACK, BACKUP_STATE_KEY } from './settings';
import { sodiumEngine } from './sodium';
import { cancelBackgroundBackup, scheduleBackgroundBackup } from './task';
import { type BackupProblem, type BackupStatus, EMPTY_STATUS, pendingProblem } from './status';

export type { RunOutcome } from './run';

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
  /** Sauvegarde maintenant : chiffrer, écrire dans le dossier, vérifier par la liste du dossier, rotation. */
  backupNow(): Promise<RunOutcome>;
  /** Relit l'état enregistré (après une sauvegarde faite en tâche de fond, par exemple). */
  refresh(): Promise<void>;
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
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    Promise.all([
      secureStore.get(BACKUP_CONFIG_KEY).then(parseConfig).catch(() => EMPTY_CONFIG),
      readStatus(),
    ]).then(([c, s]) => {
      setConfig(c);
      setStatus(s);
      setLoading(false);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const save = useCallback(async (next: BackupConfig) => {
    await secureStore.set(BACKUP_CONFIG_KEY, serializeConfig(next));
    setConfig(next);
  }, []);

  const refresh = useCallback(async () => {
    const s = await readStatus();
    if (mounted.current) setStatus(s);
  }, []);

  const run = useCallback(
    async (auto: boolean): Promise<RunOutcome> => {
      setRunning(true);
      try {
        return await runBackup(auto);
      } finally {
        await refresh();
        if (mounted.current) setRunning(false);
      }
    },
    [refresh],
  );

  // Sauvegarde automatique (F7) : au déverrouillage et à chaque retour dans l'app,
  // si aucune sauvegarde n'a réussi aujourd'hui. Filet de sécurité de la tâche de fond.
  const configured = isConfigured(config);
  const unlocked = account.status === 'unlocked';
  useEffect(() => {
    if (loading || !configured || !unlocked) return;
    // Petit délai : l'accueil s'affiche d'abord, la sauvegarde suit sans gêner.
    const timer = setTimeout(() => run(true), AUTO_START_DELAY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run(true);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [loading, configured, unlocked, run]);

  // Tâche de fond inscrite dès que la sauvegarde est configurée.
  useEffect(() => {
    if (!loading && configured) scheduleBackgroundBackup();
  }, [loading, configured]);

  const value = useMemo<BackupState>(
    () => ({
      loading,
      configured,
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
        const current = await readStatus();
        if (current.lastProblem) {
          const next = { ...current, lastProblem: null, lastProblemAt: null };
          await secureStore.set(BACKUP_STATE_KEY, JSON.stringify(next));
          setStatus(next);
        }
        // Puis on vérifie tout de suite que le nouveau dossier répond.
        await checkFolderAccess();
        await refresh();
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

      backupNow: () => run(false),
      refresh,

      async forget() {
        await cancelBackgroundBackup();
        await secureStore.remove(BACKUP_CONFIG_KEY);
        await secureStore.remove(BACKUP_STATE_KEY);
        setConfig(EMPTY_CONFIG);
        setStatus(EMPTY_STATUS);
      },
    }),
    [config, configured, status, loading, running, save, run, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
