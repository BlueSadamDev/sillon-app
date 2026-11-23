// Accès au vrai dossier de sauvegarde (expo-file-system, sélecteur de dossiers d'Android).
import { Directory } from 'expo-file-system';

import { BACKUP_MIME } from './settings';
import type { FolderOps } from './write';

/**
 * Avec pCloud, l'adresse d'un fichier ne contient pas son nom : les vrais noms viennent de
 * Directory.info().files (constaté au lot 0).
 */
export function folderOps(uri: string): FolderOps {
  const dir = new Directory(uri);
  return {
    async names() {
      const info = dir.info();
      if (!info.exists) throw new Error('dossier inaccessible');
      return info.files ?? [];
    },
    async write(name, bytes) {
      const file = dir.createFile(name, BACKUP_MIME);
      await file.write(bytes);
    },
  };
}

export const waitMs = (ms: number) => () => new Promise<void>((resolve) => setTimeout(resolve, ms));
