// Faux dossier pCloud pour les tests : il imite les défauts constatés au lot 0
// (erreur signalée sur une action réussie, suppression refusée, permission perdue).
import type { FolderOps } from '../write';

export type FakeFolderOptions = {
  /** Signale une erreur alors que le fichier est bien écrit. */
  errorButWrites?: boolean;
  /** Signale une erreur et n'écrit rien. */
  dropsWrite?: boolean;
  /** Dossier inaccessible (permission perdue, app pCloud déconnectée). */
  lost?: boolean;
  /** Signale une erreur alors que le fichier est bien supprimé. */
  errorButDeletes?: boolean;
  /** Noms dont la suppression est refusée (rien n'est supprimé). */
  refuseDelete?: string[];
};

export function fakeFolder(initial: string[] = ['photo.jpg'], opts: FakeFolderOptions = {}) {
  const files: string[] = [...initial];
  const actions: string[] = [];
  const ops: FolderOps = {
    async names() {
      if (opts.lost) throw new Error('permission perdue');
      return [...files];
    },
    async write(name) {
      actions.push(`write ${name}`);
      if (!opts.dropsWrite) files.push(name);
      if (opts.errorButWrites || opts.dropsWrite) throw new Error('pCloud : erreur');
    },
    async remove(name) {
      actions.push(`remove ${name}`);
      if (opts.refuseDelete?.includes(name)) throw new Error('Unable to delete');
      const i = files.indexOf(name);
      if (i < 0) throw new Error('introuvable');
      files.splice(i, 1);
      if (opts.errorButDeletes) throw new Error('pCloud : erreur');
    },
  };
  return { ops, files, actions };
}
