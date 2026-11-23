// Export en clair sur le téléphone : l'utilisateur choisit un dossier (sélecteur d'Android),
// Sillon y écrit le fichier ZIP, puis vérifie sa présence dans la liste du dossier.
import { Directory } from 'expo-file-system';

import { openNotes } from '@/db/expoDb';
import { t } from '@/texts/fr';

import { folderDisplayName } from './config';
import { exportEntries } from './plainExport';
import { fileStamp } from './rotation';
import { buildZip } from './zip';

export type ExportResult = { ok: true; folder: string } | { ok: false; problem: 'cancelled' | 'failed' };

export async function exportPlainZip(): Promise<ExportResult> {
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return { ok: false, problem: 'cancelled' };
  }
  const name = `sillon-export-${fileStamp(new Date())}.zip`;
  try {
    const notes = await (await openNotes()).exportAll();
    const e = t.exportPlain;
    const zip = buildZip(
      exportEntries(notes, { root: e.zipRoot, archives: e.zipArchives, trash: e.zipTrash, untitled: e.untitled }),
    );
    try {
      const file = dir.createFile(name, 'application/zip');
      await file.write(zip);
    } catch {
      // Certains fournisseurs (pCloud) signalent une erreur sur une écriture réussie : la liste fait foi.
    }
    const present = (dir.info().files ?? []).includes(name);
    return present ? { ok: true, folder: folderDisplayName(dir.name, dir.uri) } : { ok: false, problem: 'failed' };
  } catch {
    return { ok: false, problem: 'failed' };
  }
}
