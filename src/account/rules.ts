// Règles du compte (calcul pur) : validation de la création, délai de verrouillage.
import { MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH } from './settings';

export type AccountProblem = 'username-empty' | 'username-long' | 'password-short' | 'password-mismatch';

export function checkNewAccount(username: string, password: string, confirm: string): AccountProblem | null {
  const name = username.trim();
  if (name.length === 0) return 'username-empty';
  if (name.length > MAX_USERNAME_LENGTH) return 'username-long';
  return checkNewPassword(password, confirm);
}

export function checkNewPassword(password: string, confirm: string): AccountProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'password-short';
  if (password !== confirm) return 'password-mismatch';
  return null;
}

/** L'app se verrouille si elle est restée en arrière-plan au moins le délai choisi. */
export function shouldLock(backgroundSince: number | null, now: number, delayMin: number): boolean {
  if (backgroundSince === null) return false;
  return now - backgroundSince >= delayMin * 60_000;
}
