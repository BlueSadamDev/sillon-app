# Sillon

Application Android personnelle de prise de notes en Markdown. Une IA locale en tire des insights.
Tout se passe sur le téléphone : seule une sauvegarde chiffrée sort, dans un dossier pCloud.
Référence : [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md).

## État actuel : lot 1 (socle)

- Compte local créé au premier lancement (seule l'empreinte du mot de passe est gardée, dans le coffre
  sécurisé du téléphone), déverrouillage par empreinte digitale ou mot de passe, délai de verrouillage réglable.
- Accueil : capture rapide, notes épinglées et récentes, emplacement du « Sillon de la semaine » (lot 4).
- Éditeur Markdown (barre d'outils, mode lecture, enregistrement automatique, liens `[[ ]]`, tags `#mot`).
- Pages : arborescence des notes et sous-notes, corbeille de 30 jours.
- Recherche par mots (sans accents, par début de mot).
- Écran Compte : mot de passe, empreinte, délai de verrouillage, effacement de toutes les données.
- Les bancs d'essai du lot 0 restent accessibles depuis l'écran Compte. Résultats :
  [docs/RAPPORT_LOT_0.md](docs/RAPPORT_LOT_0.md).

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

Disponible à partir du lot 2 (sauvegarde chiffrée vers un dossier pCloud).

## Vérifications avant chaque build

`npx expo-doctor`, `npx expo lint`, `npx tsc --noEmit`, `npx jest`.
