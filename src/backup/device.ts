// Accès au vrai dossier de sauvegarde (expo-file-system, sélecteur de dossiers d'Android).
import { Directory, File } from 'expo-file-system';

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
    async remove(name) {
      fileNamed(dir, name).delete();
    },
  };
}

/**
 * Retrouve le fichier qui porte ce nom. Avec pCloud, l'adresse ne contient pas le nom : on associe
 * Directory.list() et Directory.info().files, listés dans le même ordre (lot 0). Si les deux listes
 * ne concordent pas, on ne devine pas : rien n'est supprimé, la rotation réessaiera plus tard.
 */
function fileNamed(dir: Directory, name: string): File {
  const entries = dir.list();
  const names = dir.info().files ?? [];
  if (names.length !== entries.length) throw new Error('listes du dossier différentes');
  const matches = names.map((n, i) => (n === name ? entries[i] : null)).filter((e) => e !== null);
  const entry = matches.length === 1 ? matches[0] : null;
  if (!(entry instanceof File)) throw new Error('fichier introuvable');
  return entry;
}

export const waitMs = (ms: number) => () => new Promise<void>((resolve) => setTimeout(resolve, ms));
