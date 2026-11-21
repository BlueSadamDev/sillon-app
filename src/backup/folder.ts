// Accès au dossier de sauvegarde (pCloud) par le sélecteur de dossiers d'Android
// (Storage Access Framework). expo-file-system demande à Android une permission
// persistante sur le dossier choisi ; l'adresse du dossier est gardée dans l'espace privé.

import { Directory, File, Paths } from 'expo-file-system';

const SAVED = 'backup-folder.json';

function savedFile(): File {
  return new File(Paths.document, SAVED);
}

export function getSavedFolderUri(): string | null {
  try {
    const f = savedFile();
    if (!f.exists) return null;
    const data = JSON.parse(f.textSync()) as { uri?: string };
    return typeof data.uri === 'string' ? data.uri : null;
  } catch {
    return null;
  }
}

function saveFolderUri(uri: string): void {
  const f = savedFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify({ uri, savedAt: new Date().toISOString() }));
}

export async function pickFolder(): Promise<Directory> {
  const dir = await Directory.pickDirectoryAsync();
  saveFolderUri(dir.uri);
  return dir;
}

export function savedFolder(): Directory | null {
  const uri = getSavedFolderUri();
  return uri ? new Directory(uri) : null;
}

/** Décode un nom de fichier venant d'une adresse content:// (pour l'affichage). */
export function readableName(name: string): string {
  let n = name;
  try {
    n = decodeURIComponent(name);
  } catch {
    // déjà lisible
  }
  const slash = n.lastIndexOf('/');
  return slash >= 0 ? n.slice(slash + 1) : n;
}

export function listFiles(dir: Directory): File[] {
  return dir.list().filter((e): e is File => e instanceof File);
}

/** Message d'erreur court (texte technique, réservé au banc d'essai). */
export function errorText(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`.slice(0, 300);
  return String(e).slice(0, 300);
}
