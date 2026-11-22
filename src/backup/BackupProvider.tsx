// État de la sauvegarde pour toute l'app : dossier choisi, clé créée.
// Le dossier est choisi avec le sélecteur de dossiers d'Android (permission persistante).
import { Directory } from 'expo-file-system';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { afterPaint, secureStore } from '@/account/device';

import { createBackupKey } from './cipher';
import { type BackupConfig, EMPTY_CONFIG, folderDisplayName, isConfigured, parseConfig, serializeConfig } from './config';
import { BACKUP_CONFIG_KEY, BACKUP_KDF, BACKUP_KDF_FALLBACK } from './settings';
import { sodiumEngine } from './sodium';

type BackupState = {
  loading: boolean;
  configured: boolean;
  folderName: string | null;
  hasPassword: boolean;
  /** Ouvre le sélecteur de dossiers. Renvoie false si l'utilisateur annule. */
  chooseFolder(): Promise<boolean>;
  /** Calcule la clé à partir du nouveau mot de passe (environ 1 s) et la range dans le coffre. */
  setPassword(password: string): Promise<void>;
  /** Oublie le dossier et la clé (« Effacer toutes les données ») ; les fichiers dans pCloud restent. */
  forget(): Promise<void>;
};

const Ctx = createContext<BackupState | null>(null);

export function useBackup(): BackupState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useBackup hors de BackupProvider');
  return value;
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BackupConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    secureStore
      .get(BACKUP_CONFIG_KEY)
      .then(parseConfig)
      .catch(() => EMPTY_CONFIG)
      .then((c) => {
        setConfig(c);
        setLoading(false);
      });
  }, []);

  const save = useCallback(async (next: BackupConfig) => {
    await secureStore.set(BACKUP_CONFIG_KEY, serializeConfig(next));
    setConfig(next);
  }, []);

  const value = useMemo<BackupState>(
    () => ({
      loading,
      configured: isConfigured(config),
      folderName: config.folder?.name ?? null,
      hasPassword: config.key !== null,

      async chooseFolder() {
        let dir: Directory;
        try {
          dir = await Directory.pickDirectoryAsync();
        } catch {
          return false; // sélecteur fermé sans choix
        }
        await save({ ...config, folder: { uri: dir.uri, name: folderDisplayName(dir.name, dir.uri) } });
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

      async forget() {
        await secureStore.remove(BACKUP_CONFIG_KEY);
        setConfig(EMPTY_CONFIG);
      },
    }),
    [config, loading, save],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
