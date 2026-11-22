// Dates affichées, en français (calcul pur, sans dépendre des réglages de langue du téléphone).

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const SHORT_MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];
const NBSP = ' ';

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** En-tête de l'accueil : « Dimanche 22 novembre ». */
export function longDate(now: Date): string {
  const day = DAYS[now.getDay()];
  return `${day[0].toUpperCase()}${day.slice(1)} ${now.getDate() === 1 ? '1er' : now.getDate()}${NBSP}${MONTHS[now.getMonth()]}`;
}

/** Date courte d'une ligne de note : « 14:05 » aujourd'hui, « Hier », « 12 nov. », « 12 nov. 2025 ». */
export function shortDate(time: number, now: Date): string {
  const d = new Date(time);
  if (sameDay(d, now)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Hier';
  const base = `${d.getDate()}${NBSP}${SHORT_MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Salutation de l'accueil selon l'heure. */
export function greeting(now: Date): string {
  const h = now.getHours();
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

/** Fin de la phrase « Modifiée … » : « aujourd’hui à 14:05 », « hier », « le 12 nov. ». */
export function modifiedWhen(time: number, now: Date): string {
  const short = shortDate(time, now);
  if (sameDay(new Date(time), now)) return `aujourd’hui à ${short}`;
  if (short === 'Hier') return 'hier';
  return `le ${short}`;
}
