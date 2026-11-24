// Identifiants du partage futur (CLAUDE.md, « Préparer le partage ») :
// - identifiant d'auteur : tiré au hasard à la création du compte, rangé avec le compte, repris d'une
//   sauvegarde restaurée sur un nouveau téléphone (même personne) ;
// - identifiant d'appareil : tiré au hasard une fois par installation, rangé à part, jamais sauvegardé.
import { DEVICE_ID_KEY } from './settings';
import type { Account, SecretStore } from './store';

/** Compte d'avant la préparation au partage : on lui donne son identifiant d'auteur. */
export function withAuthorId(account: Account, newId: () => string): { account: Account; changed: boolean } {
  if (account.authorId !== '') return { account, changed: false };
  return { account: { ...account, authorId: newId() }, changed: true };
}

/** Identifiant de cet appareil, créé à la première demande. */
export async function loadDeviceId(store: SecretStore, newId: () => string): Promise<string> {
  const saved = await store.get(DEVICE_ID_KEY);
  if (saved) return saved;
  const id = newId();
  await store.set(DEVICE_ID_KEY, id);
  return id;
}
