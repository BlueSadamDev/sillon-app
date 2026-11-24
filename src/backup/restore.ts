// Ouverture d'un fichier de sauvegarde pour la restauration (F7) : déchiffrer avec le mot de passe,
// vérifier le contenu, préparer l'aperçu. Calcul pur : le moteur de chiffrement est fourni.
// Rien n'est remplacé ici : le remplacement des notes n'a lieu qu'après la confirmation.
import { type CryptoEngine, decryptWithPassword } from './cipher';
import { type BackupContent, type BackupSummary, parsePayload, summarize } from './payload';

/**
 * not-sillon : pas un fichier de sauvegarde Sillon ; unknown-version : sauvegarde d'une version plus
 * récente de Sillon ; wrong-password : mot de passe incorrect ou fichier abîmé (impossible à distinguer) ;
 * invalid : fichier déchiffré mais contenu incohérent.
 */
export type OpenProblem = 'not-sillon' | 'unknown-version' | 'wrong-password' | 'invalid';

export type OpenResult = { ok: true; content: BackupContent; summary: BackupSummary } | { ok: false; problem: OpenProblem };

export function openBackup(file: Uint8Array, password: string, engine: CryptoEngine): OpenResult {
  const decrypted = decryptWithPassword(file, password, engine);
  if (!decrypted.ok) {
    switch (decrypted.problem) {
      case 'wrong-password-or-damaged':
        return { ok: false, problem: 'wrong-password' };
      case 'unknown-version':
      case 'unknown-kdf':
        return { ok: false, problem: 'unknown-version' };
      default:
        return { ok: false, problem: 'not-sillon' };
    }
  }
  const parsed = parsePayload(decrypted.text);
  if (!parsed.ok) {
    const problem = parsed.problem === 'not-backup' ? 'not-sillon' : parsed.problem;
    return { ok: false, problem };
  }
  return { ok: true, content: parsed.content, summary: summarize(parsed.content) };
}
