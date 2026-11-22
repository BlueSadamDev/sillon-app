# Sillon

Application Android personnelle de prise de notes en Markdown. Une IA locale en tire des insights.
Tout se passe sur le téléphone : seule une sauvegarde chiffrée sort, dans un dossier pCloud.
Référence : [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md).

## État actuel : lot 0 (faisabilité)

L'app ne contient pour l'instant que quatre écrans « Banc d'essai » (dossier pCloud, chiffrement,
rendu Markdown, embeddings), avec des notes fictives. Résultats : [docs/RAPPORT_LOT_0.md](docs/RAPPORT_LOT_0.md).

## Lancer l'app (build de développement)

1. Installer l'APK de développement (voir plus bas), une seule fois.
2. Sur l'ordinateur : `npm ci`, puis `npx expo start`.
3. Ouvrir « Sillon (dev) » sur le téléphone, puis se connecter à l'ordinateur.

## Construire les APK (GitHub Actions, déclenchement manuel)

- **Développement** (`build-dev-apk.yml`) : onglet Actions > « Build APK de développement » > Run workflow.
  Aucun secret nécessaire. À reconstruire seulement quand une bibliothèque native ou une permission change.
- **Production** (`build-apk.yml`) : onglet Actions > « Build APK de production » > Run workflow.
  Il demande les 4 secrets de signature (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`). Le build échoue si l'APK contient la permission Internet.

Installer l'APK : à la fin du build, télécharger l'« artifact » (un fichier ZIP), l'ouvrir et copier le
fichier `.apk` sur le téléphone, puis l'ouvrir pour l'installer.

## Restaurer une sauvegarde

Disponible à partir du lot 2.

## Vérifications avant chaque build

`npx expo-doctor`, `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
