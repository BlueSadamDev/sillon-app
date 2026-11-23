// Sauvegarde en tâche de fond (F7) : Android réveille Sillon de temps en temps, même fermée.
// La tâche ne sauvegarde que si aucune sauvegarde n'a réussi aujourd'hui (même règle qu'à l'ouverture).
// Pas de mot de passe ici : la clé de sauvegarde est déjà dans le coffre sécurisé (pas d'Argon2id).
// Ce fichier doit être importé au démarrage de l'app (src/app/_layout.tsx) : Android peut lancer
// la tâche sans ouvrir d'écran.
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { runBackup } from './run';
import { BACKGROUND_INTERVAL_MIN, BACKGROUND_TASK_NAME } from './settings';

TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  const outcome = await runBackup(true);
  const fine = outcome.ok || outcome.problem === 'not-due' || outcome.problem === 'busy';
  return fine ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
});

/** Inscrit la tâche auprès d'Android (sans effet si elle l'est déjà). */
export async function scheduleBackgroundBackup(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME)) return;
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, { minimumInterval: BACKGROUND_INTERVAL_MIN });
  } catch {
    // Tâches de fond indisponibles : la sauvegarde à l'ouverture reste le filet.
  }
}

/** Retire la tâche (« Effacer toutes les données »). */
export async function cancelBackgroundBackup(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME)) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    }
  } catch {
    // rien à retirer
  }
}
