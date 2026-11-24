// Partage simple sur le téléphone (F10, lot 2.1) : prépare le texte ou le fichier, puis ouvre le menu
// de partage d'Android. Aucun accès à Internet : ce sont les apps choisies qui envoient la copie.
// Les fichiers sont préparés dans l'espace temporaire privé de l'app (dossier « partage »). Ils sont
// effacés au partage suivant et à l'ouverture de l'app, pas tout de suite : l'app choisie peut lire le
// fichier un peu après la fermeture du menu de partage.
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { openNotes } from '@/db/expoDb';
import { t } from '@/texts/fr';

import { collectShared, sharedFileName, sharedMarkdown } from './content';
import { SATOSHI_BOLD_BASE64, SATOSHI_REGULAR_BASE64 } from './fonts.generated';
import { A4, sharedHtml } from './html';

export type ShareFormat = 'text' | 'markdown' | 'pdf';
export type ShareResult = { ok: true } | { ok: false; problem: 'failed' | 'failed-pdf' };

const SHARE_DIR = 'partage';

function shareDir(): Directory {
  return new Directory(Paths.cache, SHARE_DIR);
}

/** Efface les copies laissées par un partage précédent (sans erreur si rien à effacer). */
export function clearSharedFiles(): void {
  try {
    const dir = shareDir();
    if (dir.exists) dir.delete();
  } catch {
    // Rien de grave : l'espace temporaire est aussi vidé par Android si besoin.
  }
}

function freshShareDir(): Directory {
  clearSharedFiles();
  const dir = shareDir();
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function shareNote(id: string, format: ShareFormat, withChildren: boolean): Promise<ShareResult> {
  const untitled = t.share.untitled;
  let list;
  try {
    list = collectShared(id, await (await openNotes()).exportAll(), withChildren);
  } catch {
    return { ok: false, problem: 'failed' };
  }
  if (list.length === 0) return { ok: false, problem: 'failed' };
  const title = list[0].title;

  if (format === 'text') {
    try {
      await Share.share({ message: sharedMarkdown(list, untitled) }, { dialogTitle: t.share.title });
      return { ok: true };
    } catch {
      return { ok: false, problem: 'failed' };
    }
  }

  let file: File;
  if (format === 'markdown') {
    try {
      file = new File(freshShareDir(), sharedFileName(title, untitled, 'md'));
      file.write(sharedMarkdown(list, untitled));
    } catch {
      return { ok: false, problem: 'failed' };
    }
  } else {
    try {
      const html = sharedHtml(list, untitled, { regular: SATOSHI_REGULAR_BASE64, bold: SATOSHI_BOLD_BASE64 });
      const printed = await Print.printToFileAsync({ html, width: A4.width, height: A4.height });
      file = new File(freshShareDir(), sharedFileName(title, untitled, 'pdf'));
      new File(printed.uri).move(file);
    } catch {
      return { ok: false, problem: 'failed-pdf' };
    }
  }

  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'pdf' ? 'application/pdf' : 'text/markdown',
      dialogTitle: t.share.title,
    });
    return { ok: true };
  } catch {
    return { ok: false, problem: 'failed' };
  }
}
