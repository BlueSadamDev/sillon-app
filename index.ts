// Point d'entrée de l'app. La tâche de fond de sauvegarde est déclarée ici, avant tout écran :
// Android peut lancer la tâche alors qu'aucun écran n'est ouvert.
import './src/backup/task';
import 'expo-router/entry';
