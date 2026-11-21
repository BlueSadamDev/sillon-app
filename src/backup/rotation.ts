// Rotation des sauvegardes : garder les N plus récentes, désigner les autres à supprimer.
// Calcul pur : la date est lue dans le nom du fichier (…-AAAAMMJJ-HHMMSS…).

const STAMP = /(\d{8}-\d{6})/;

/** Horodatage pour un nom de fichier : 20261121-223000 (heure locale). */
export function fileStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** Horodatage trouvé dans un nom (éventuellement encodé dans une adresse content://), ou null. */
export function stampOf(name: string): string | null {
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // nom non encodé : on le garde tel quel
  }
  const m = STAMP.exec(decoded);
  return m ? m[1] : null;
}

/**
 * Parmi les noms donnés, ceux à supprimer pour n'en garder que `keep`.
 * Seuls les fichiers qui portent le préfixe et un horodatage sont concernés :
 * un fichier inconnu dans le dossier n'est jamais supprimé.
 */
export function filesToDelete(names: string[], prefix: string, keep: number): string[] {
  const ours = names
    .map((name) => ({ name, stamp: stampOf(name) }))
    .filter((f): f is { name: string; stamp: string } => {
      let decoded = f.name;
      try {
        decoded = decodeURIComponent(f.name);
      } catch {
        // idem
      }
      return f.stamp !== null && decoded.includes(prefix);
    })
    .sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0));
  return ours.slice(Math.max(keep, 0)).map((f) => f.name);
}
