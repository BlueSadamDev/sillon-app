// Corbeille (cahier des charges, F6) : notes gardées 30 jours, puis effacées.
import { TRASH_DAYS } from './settings';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Les notes mises à la corbeille avant cette date sont à effacer. */
export function purgeCutoff(now: number): number {
  return now - TRASH_DAYS * DAY_MS;
}

/** Jours restants avant l'effacement d'une note de la corbeille (au moins 0). */
export function daysLeft(deletedAt: number, now: number): number {
  return Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY_MS - now) / DAY_MS));
}
