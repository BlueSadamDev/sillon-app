// Écriture prudente d'une sauvegarde dans le dossier pCloud (cahier des charges, F7).
//
// pCloud signale parfois une erreur sur une écriture réussie (lot 0). On écrit donc, on attend quelques
// secondes, puis on relit la liste du dossier : seule la présence du fichier fait foi.
// Les accès au dossier passent par FolderOps : le vrai dossier dans l'app, un faux dans les tests.

import type { BackupProblem } from './status';

export interface FolderOps {
  /** Noms des fichiers du dossier ; lève une erreur si le dossier est inaccessible. */
  names(): Promise<string[]>;
  write(name: string, bytes: Uint8Array): Promise<void>;
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
