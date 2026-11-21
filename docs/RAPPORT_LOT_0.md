# Rapport du lot 0 – Faisabilité

État : **app d'essai prête, mesures sur le téléphone à faire.** Les cases « à mesurer » seront remplies
avec les résultats relevés sur le Samsung Galaxy S21 (Android 14 ou plus récent).
Ce rapport ne contient que des mesures et des noms de bibliothèques, jamais de vraies notes : tous les
essais utilisent des notes fictives (`src/**/__fixtures__/`).

## Versions utilisées

| Élément | Version |
| --- | --- |
| Expo (SDK) | 58 (`expo` ~58.0.26), React Native 0.88.1 |
| Chiffrement | `react-native-libsodium` 1.7.0 |
| Rendu Markdown | `react-native-marked` 8.3.4 (moteur `marked` 18) |
| IA locale | `llama.rn` 0.12.9 (même version qu'Aube) |
| Accès au dossier | `expo-file-system` ~58.0.14 (sélecteur de dossiers d'Android) |
| Import du modèle | `expo-document-picker` ~58.0.5 |

## 1. Dossier pCloud (sélecteur de dossiers d'Android)

Méthode : écran « Dossier pCloud ». `Directory.pickDirectoryAsync()` (expo-file-system) ouvre le sélecteur
de dossiers d'Android et demande une **permission persistante** sur le dossier choisi (vérifié dans le code
natif : `takePersistableUriPermission`). L'adresse du dossier est gardée dans l'espace privé de l'app.
Fichier d'essai : 256 Kio d'octets aléatoires, nommé `sillon-essai-AAAAMMJJ-HHMMSS.sillon`.

| Vérification | Résultat |
| --- | --- |
| pCloud apparaît dans le sélecteur de dossiers | à mesurer |
| Écriture d'un fichier dans un dossier pCloud (temps) | à mesurer |
| Relecture du fichier écrit | à mesurer |
| Liste des fichiers du dossier | à mesurer |
| Suppression des plus anciens (rotation) | à mesurer |
| Accès conservé après redémarrage du téléphone | à mesurer |
| Fichier visible dans le cloud pCloud (site ou ordinateur) | à mesurer |
| Délai avant l'arrivée dans le cloud | à mesurer |
| Message obtenu si l'app pCloud est déconnectée | à mesurer |
| Message obtenu si la permission est retirée (Paramètres > Apps > Sillon) | à mesurer |

## 2. Chiffrement

### Bibliothèques étudiées

| Bibliothèque | Algorithmes | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **react-native-libsodium** (testée) | XChaCha20-Poly1305, Argon2id | Libsodium, référence reconnue ; code natif (rapide) ; module Expo prêt (plugin) | Code natif : build de développement obligatoire (déjà prévu) ; seule une partie de libsodium est exposée |
| @noble/ciphers + @noble/hashes | XChaCha20-Poly1305, AES-GCM, Argon2id, scrypt | JavaScript pur et audité, aucune dépendance native | Argon2id et scrypt lents en JavaScript sur téléphone : il faudrait affaiblir les réglages |
| react-native-quick-crypto | AES-256-GCM, scrypt | API identique à Node.js, natif | Installation plus lourde ; Argon2id moins bien pris en charge |

### Format prototype (à figer au lot 2)

En-tête en clair de 54 octets : signature `SILN`, version du format (1), algorithme de clé (1 = Argon2id),
réglages Argon2id, sel (16 octets), nonce (24 octets). Puis le texte chiffré par XChaCha20-Poly1305
avec étiquette d'authentification. L'en-tête est authentifié lui aussi (donnée associée) : toute
modification fait échouer le déchiffrement. Tests automatiques : `src/backup/format.test.ts`.

### Mesures sur le S21

Carnet fictif : 200 notes (≈ ? Kio) et 2 000 notes (≈ ? Kio).

| Réglage Argon2id | Notes | Dérivation de la clé | Chiffrement | Déchiffrement | Taille du fichier | Identique |
| --- | --- | --- | --- | --- | --- | --- |
| 2 passes, 64 Mo | 200 | à mesurer | | | | |
| 3 passes, 128 Mo | 200 | | | | | |
| 3 passes, 256 Mo | 200 | | | | | |
| 2 passes, 64 Mo | 2 000 | | | | | |
| 3 passes, 128 Mo | 2 000 | | | | | |
| 3 passes, 256 Mo | 2 000 | | | | | |

| Refus attendu | Résultat |
| --- | --- |
| Mauvais mot de passe | à mesurer |
| Contenu abîmé | à mesurer |
| En-tête abîmé | à mesurer |
| Fichier étranger | à mesurer |

## 3. Rendu Markdown

### Bibliothèques étudiées

| Bibliothèque | Avantages | Inconvénients |
| --- | --- | --- |
| **react-native-marked** (testée) | Maintenue (mise à jour en novembre 2026) ; JavaScript pur ; chaque élément peut être redessiné (titres, citations, liens) | N'affiche ni les cases à cocher ni `[[ ]]` : il faut préparer le texte avant (voir ci-dessous) |
| @ronradtke/react-native-markdown-display | Version maintenue de la bibliothèque la plus connue ; extensions markdown-it (cases à cocher) | Extensions anciennes et peu suivies |
| Rendu maison (découpage par `marked` ou `remark`) | Contrôle total | Plus de code à écrire et à maintenir |

### Constat à l'installation (avant essai sur le téléphone)

- `react-native-marked` utilise `marked` 18, qui reconnaît bien les cases `- [ ]`, mais son propre affichage
  les ignore : elles disparaissent du rendu.
- Solution testée : une **préparation du texte** (`src/editor/markdownPrep.ts`, testée automatiquement) :
  `- [ ]` devient un repère que le rendu remplace par une case, et `[[Titre]]` devient un lien interne
  `sillonnote:` que le rendu intercepte (ouverture de la note). Les blocs de code ne sont pas modifiés.

| Élément | Rendu sur le S21 |
| --- | --- |
| Titres, gras, italique, barré | à mesurer |
| Listes à puces et numérotées | à mesurer |
| Cases à cocher (cochée / non cochée) | à mesurer |
| Citation | à mesurer |
| Lien `[[ ]]` cliquable | à mesurer |
| Lien ordinaire | à mesurer |
| Bloc de code intact | à mesurer |
| Analyse d'une note longue (≈ 40 Kio) | à mesurer |

## 4. Embeddings (llama.rn, GGUF)

### Modèles proposés

| Modèle | Fichier conseillé | Taille | Dimension | Licence |
| --- | --- | --- | --- | --- |
| multilingual-e5-small | `TwinSunsLLC/multilingual-e5-small-gguf` (Q8_0) | ≈ 126 Mo | 384 | MIT |
| EmbeddingGemma 300M | `ggml-org/embeddinggemma-300M-GGUF` (Q8_0) | ≈ 330 Mo | 768 | Gemma |
| Qwen3-Embedding 0.6B | `Qwen/Qwen3-Embedding-0.6B-GGUF` (Q8_0) | ≈ 640 Mo | 1 024 | Apache 2.0 |

Chaque famille attend ses propres préfixes (réglés dans `src/ai/settings.ts`) : `query: ` / `passage: `
pour e5, `task: search result | query: ` / `title: none | text: ` pour EmbeddingGemma, une consigne avant
la question pour Qwen3.

### Méthode

10 notes fictives en français (`src/ai/__fixtures__/notes-fr.ts`) sur des sujets variés, et 10 questions
formulées **avec d'autres mots** que la note attendue (par exemple « Partir quelques jours au Portugal »
pour la note sur Lisbonne). Moteur : 4 cœurs, sans GPU (Exynos/Mali, comme Aube), textes limités à 512 jetons.

### Mesures sur le S21

| Modèle | Empreinte SHA-256 | Chargement | Temps par note | Temps par question | 1re place | Top 3 | MRR | Marge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| multilingual-e5-small Q8_0 | à mesurer | | | | /10 | /10 | | |
| EmbeddingGemma 300M Q8_0 | | | | | /10 | /10 | | |
| Qwen3-Embedding 0.6B Q8_0 | | | | | /10 | /10 | | |

## Recommandations

À rédiger après les mesures.

| Point | Recommandation |
| --- | --- |
| Dossier pCloud | à décider |
| Chiffrement | Pressenti : react-native-libsodium (Argon2id + XChaCha20-Poly1305), réglage à choisir selon le temps mesuré |
| Rendu Markdown | Pressenti : react-native-marked avec la préparation du texte |
| Embeddings | à décider |

## Mises à jour proposées pour le cahier des charges

À rédiger après les mesures. Pistes déjà identifiées :
- F7 : préciser le chiffrement retenu (XChaCha20-Poly1305 + Argon2id) et les réglages d'Argon2id.
- Section 2 : nommer le modèle d'embeddings retenu, sa taille et son empreinte SHA-256.
