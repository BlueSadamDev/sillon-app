// Écriture prudente d'une sauvegarde dans le dossier pCloud (cahier des charges, F7).
//
// pCloud signale parfois une erreur sur une écriture réussie (lot 0). On écrit donc, on attend quelques
// secondes, puis on relit la liste du dossier : seule la présence du fichier fait foi.
// Les accès au dossier passent par FolderOps : le vrai dossier dans l'app, un faux dans les tests.

import { filesToDelete } from './rotation';
import { BACKUP_PREFIX } from './settings';
import { type BackupProblem, isBackupName } from './status';

export interface FolderOps {
  /** Noms des fichiers du dossier ; lève une erreur si le dossier est inaccessible. */
  names(): Promise<string[]>;
  write(name: string, bytes: Uint8Array): Promise<void>;
  /** Supprime le fichier qui porte ce nom ; lève une erreur si pCloud refuse ou si le fichier est introuvable. */
  remove(name: string): Promise<void>;
}

export type WriteResult = { ok: true; name: string; reportedError: boolean } | { ok: false; problem: BackupProblem };

export async function writeVerified(
  ops: FolderOps,
  name: string,
  bytes: Uint8Array,
  wait: () => Promise<void>,
): Promise<WriteResult> {
  try {
    await ops.names();
  } catch {
    return { ok: false, problem: 'folder-lost' };
  }
  let reportedError = false;
  try {
    await ops.write(name, bytes);
  } catch {
    reportedError = true;
  }
  await wait();
  let after: string[];
  try {
    after = await ops.names();
  } catch {
    return { ok: false, problem: 'folder-lost' };
  }
  return after.includes(name) ? { ok: true, name, reportedError } : { ok: false, problem: 'write-failed' };
}

export type RotateResult = {
  /** Fichiers vraiment disparus de la liste du dossier. */
  deleted: string[];
  /** Fichiers toujours présents : la suppression sera retentée à la sauvegarde suivante. */
  kept: string[];
  /** Le dossier est devenu inaccessible pendant la rotation. */
  folderLost: boolean;
};

/**
 * Rotation prudente : ne garder que les `keep` sauvegardes les plus récentes (F7).
 * Une suppression à la fois, la plus ancienne d'abord, avec une attente avant chaque action ;
 * après chaque suppression, la liste du dossier fait foi (pCloud signale parfois une erreur
 * sur une suppression réussie, et en refuse d'autres). Seuls les fichiers « sillon-AAAAMMJJ-HHMMSS.bin »
 * sont concernés : un fichier inconnu n'est jamais supprimé.
 */
export async function rotateVerified(ops: FolderOps, keep: number, wait: () => Promise<void>): Promise<RotateResult> {
  const result: RotateResult = { deleted: [], kept: [], folderLost: false };
  let names: string[];
  try {
    names = await ops.names();
  } catch {
    return { ...result, folderLost: true };
  }
  const extra = filesToDelete(names.filter(isBackupName), BACKUP_PREFIX, keep).reverse();
  for (let i = 0; i < extra.length; i++) {
    const name = extra[i];
    await wait();
    try {
      await ops.remove(name);
    } catch {
      // Réponse peu fiable : seule la liste du dossier dira ce qui s'est passé.
    }
    await wait();
    try {
      names = await ops.names();
    } catch {
      return { ...result, kept: [...result.kept, ...extra.slice(i)], folderLost: true };
    }
    (names.includes(name) ? result.kept : result.deleted).push(name);
  }
  return result;
}
