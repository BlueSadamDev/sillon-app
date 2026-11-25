# Rapport du lot 0 – Faisabilité

État au 22 novembre 2026 : **lot 0 terminé.** Chiffrement, Markdown et embeddings mesurés ; dossier
pCloud jugé suffisant par l'utilisateur pour passer à la suite. Trois vérifications pCloud n'ont pas été
faites au lot 0 et sont reportées au lot 2 : accès après redémarrage, suppressions espacées, relecture
d'un fichier déjà envoyé. Les deux premières sont **confirmées au lot 2** (voir « Vérifications du lot 2 »
à la fin de la section 1) ; la relecture d'un fichier déjà envoyé reste à faire.
Toutes les mesures viennent du Samsung Galaxy S21 (8 Go), APK de production (sans permission Internet).
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
Fichier d'essai : 256 Kio d'octets aléatoires.

| Vérification | Résultat |
| --- | --- |
| pCloud apparaît dans le sélecteur de dossiers | **oui** (`content://com.pcloud.pcloud.documents/tree/<identifiant>`) |
| Écriture d'un fichier (méthode 1 : nouvelle API `Directory.createFile` + `File.write`) | **oui**, 790 à 910 ms pour 256 Kio |
| Écriture (méthode 2 : ancienne API `StorageAccessFramework`) | **non** : « Location … isn't writable » (vérification interne de l'ancienne API, incompatible avec pCloud) |
| Fichiers arrivés dans le cloud | **oui**, complets (262 144 octets), visibles dans l'app pCloud |
| Nom du fichier | gardé si l'extension correspond au type : avec `application/octet-stream`, pCloud ajoute « .bin » à un nom en « .sillon » ; un nom en « .bin » reste tel quel |
| Liste du dossier, vrais noms, tailles, dates | **oui**, par `Directory.info().files` (les adresses, elles, portent un identifiant pCloud, `f113371187787`) |
| Fichier juste écrit | taille 0 pendant l'envoi par pCloud ; il apparaît ensuite complet |
| Relecture du fichier juste écrit | **non** pendant l'envoi (`FileNotFoundException`) ; relecture d'un fichier déjà envoyé : à faire (lot 2, test 7) |
| Écritures rapprochées (moins de 30 s) | pCloud **crée le fichier complet mais renvoie une erreur** à l'app |
| Suppression (rotation) | **1 sur 3** : la première réussit, les deux suivantes, lancées dans la même seconde, sont refusées (« Unable to delete ») ; suppressions espacées : **oui** au lot 2 |
| Accès conservé après redémarrage du téléphone | **oui** (lot 2) |
| Message si la permission est retirée / app pCloud déconnectée | **oui** (lot 2, app pCloud déconnectée) |

Constat : **l'écriture directe dans pCloud fonctionne**, ce qui est le point le plus risqué. L'app pCloud
supporte mal plusieurs opérations à la suite : elle exécute l'opération puis signale parfois une erreur.
Dans l'usage réel (une sauvegarde par jour, puis une seule suppression), les opérations sont espacées.

### Vérifications du lot 2

Samsung S21, APK de production du lot 2 (run GitHub 45237032195, sans permission Internet), novembre 2026.
Sauvegardes réelles de l'app (chiffrées), pas de fichier d'essai. Liste des tests : `docs/TESTS_LOT_2.md`.

| Vérification | Résultat |
| --- | --- |
| « Sauvegarder maintenant » : fichier `sillon-AAAAMMJJ-HHMMSS.bin` dans pCloud, pastille « À jour » | **oui** |
| Accès au dossier après redémarrage du téléphone (sans rechoisir le dossier) | **oui** |
| Rotation : 12 sauvegardes espacées d'environ 30 s (une écriture, puis une suppression 5 s plus tard, chacune vérifiée par la liste du dossier) | **oui** : 10 fichiers restants, sans message d'erreur |
| App pCloud déconnectée : message « Sillon n'a plus accès… » sur l'accueil et dans Compte, puis retour à la normale après avoir rechoisi le dossier | **oui** |
| Export en clair (ZIP, dossier Téléchargements, avec avertissement) | **oui** |
| Sauvegarde automatique le lendemain (tâche de fond ou ouverture) | à faire |
| Restauration d'un fichier déjà envoyé par pCloud (fichier de la veille) | à faire |

Constat : avec une action à la fois et quelques secondes d'écart, pCloud accepte écritures et suppressions ;
la permission persistante sur le dossier survit au redémarrage.

## 2. Chiffrement

### Bibliothèques étudiées

| Bibliothèque | Algorithmes | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **react-native-libsodium** (testée) | XChaCha20-Poly1305, Argon2id | Libsodium, référence reconnue ; code natif (rapide) ; module Expo prêt (plugin) | Code natif : build de développement obligatoire (déjà prévu) ; certaines formes d'entrée et de sortie non implémentées (voir plus bas) |
| @noble/ciphers + @noble/hashes | XChaCha20-Poly1305, AES-GCM, Argon2id, scrypt | JavaScript pur et audité, aucune dépendance native | Argon2id et scrypt lents en JavaScript sur téléphone : il faudrait affaiblir les réglages |
| react-native-quick-crypto | AES-256-GCM, scrypt | API identique à Node.js, natif | Installation plus lourde ; Argon2id moins bien pris en charge |

### Limites trouvées dans react-native-libsodium 1.7.0

- La donnée associée (en-tête authentifié) doit être du texte : l'en-tête est passé en base64, il reste
  authentifié octet par octet.
- La sortie « texte » du déchiffrement n'est pas implémentée : le déchiffré est décodé par `to_string`.

### Format prototype (à figer au lot 2)

En-tête en clair de 54 octets : signature `SILN`, version du format (1), algorithme de clé (1 = Argon2id),
réglages Argon2id, sel (16 octets), nonce (24 octets). Puis le texte chiffré par XChaCha20-Poly1305
avec étiquette d'authentification. L'en-tête est authentifié lui aussi : toute modification fait échouer
le déchiffrement. Tests automatiques : `src/backup/format.test.ts`.

### Mesures sur le S21

| Réglage Argon2id | Carnet fictif | Clé (chiffrement / déchiffrement) | Chiffrement | Déchiffrement | Écriture + lecture | Fichier | Identique |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 passes, 64 Mo | 200 notes, 129 Kio | 199 / 190 ms | 1 ms | 3 ms | 5 + 2 ms | 131 Kio | oui |
| 3 passes, 128 Mo | 200 notes | 579 / 578 ms | 1 ms | 2 ms | 4 + 3 ms | 131 Kio | oui |
| 3 passes, 256 Mo | 200 notes | 1 197 / 1 182 ms | 4 ms | 2 ms | 3 + 3 ms | 131 Kio | oui |
| 2 passes, 64 Mo | 2 000 notes, 1 296 Kio | 189 / 189 ms | 17 ms | 16 ms | 6 + 8 ms | 1 315 Kio | oui |
| 3 passes, 128 Mo | 2 000 notes | 564 / 567 ms | 17 ms | 16 ms | 5 + 12 ms | 1 315 Kio | oui |
| 3 passes, 256 Mo | 2 000 notes | 1 186 / 1 184 ms | 17 ms | 17 ms | 6 + 8 ms | 1 315 Kio | oui |

| Refus attendu | Résultat |
| --- | --- |
| Mauvais mot de passe | refusé |
| Contenu abîmé | refusé |
| En-tête abîmé | refusé |
| Fichier étranger | refusé (« pas un fichier Sillon ») |

Constat : le temps dépend presque seulement du calcul de la clé (Argon2id) ; le chiffrement lui-même est
négligeable, même pour 2 000 notes. Le fichier chiffré ne fait que 70 octets de plus que le texte
(54 octets d'en-tête et 16 octets d'étiquette d'authentification).

## 3. Rendu Markdown

### Bibliothèques étudiées

| Bibliothèque | Avantages | Inconvénients |
| --- | --- | --- |
| **react-native-marked** (testée) | Maintenue (mise à jour en novembre 2026) ; JavaScript pur ; chaque élément peut être redessiné (titres, citations, liens) | N'affiche ni les cases à cocher ni `[[ ]]` : il faut préparer le texte avant |
| @ronradtke/react-native-markdown-display | Version maintenue de la bibliothèque la plus connue ; extensions markdown-it (cases à cocher) | Extensions anciennes et peu suivies |
| Rendu maison (découpage par `marked` ou `remark`) | Contrôle total | Plus de code à écrire et à maintenir |

Solution testée : une **préparation du texte** (`src/editor/markdownPrep.ts`, testée automatiquement) :
`- [ ]` devient un repère que le rendu remplace par une case, et `[[Titre]]` devient un lien interne
`sillonnote:` que le rendu intercepte. Les blocs de code ne sont pas modifiés.

| Élément | Rendu sur le S21 |
| --- | --- |
| Titres, gras, italique | corrects |
| Listes à puces et numérotées | correctes |
| Cases à cocher (cochée / non cochée) | correctes (☐ / ☑) |
| Citation | correcte (trait vertical à gauche) |
| Lien `[[ ]]` cliquable | oui |
| Analyse d'une note longue (29 Kio, 1 199 blocs) | 78 ms |

## 4. Embeddings (llama.rn, GGUF)

### Modèles

| Modèle | Fichier | Taille | Dimension | Licence | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| multilingual-e5-small | `multilingual-e5-small-q8_0.gguf` (TwinSunsLLC/multilingual-e5-small-gguf) | 126 Mo | 384 | MIT | à relever |
| EmbeddingGemma 300M (QAT) | `embeddinggemma-300m-qat-Q8_0.gguf` (ggml-org/embeddinggemma-300m-qat-q8_0-GGUF) | 313 Mo (329 Mo affichés par l'app au lot 3) | 768 | Gemma | `6fa0c02a9c302be6f977521d399b4de3a46310a4f2621ee0063747881b673f67` (relevé au lot 3) |
| Qwen3-Embedding 0.6B | `Qwen3-Embedding-0.6B-Q8_0.gguf` (Qwen/Qwen3-Embedding-0.6B-GGUF) | 610 Mo | 1 024 | Apache 2.0 | `06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439` |

Préfixes (réglés dans `src/ai/settings.ts`) : `query: ` / `passage: ` pour e5,
`task: search result | query: ` / `title: none | text: ` pour EmbeddingGemma, une consigne avant la
question pour Qwen3.

### Méthode

10 notes fictives en français (`src/ai/__fixtures__/notes-fr.ts`) et 10 questions formulées **avec
d'autres mots** que la note attendue. Moteur : 4 cœurs, sans GPU, textes limités à 512 jetons.
Chaque modèle est mesuré juste après l'ouverture de l'app (voir le défaut ci-dessous).

### Mesures sur le S21

| Modèle | Chargement | Temps par note | Temps par question | 1re place | Top 3 | MRR | Marge moyenne |
| --- | --- | --- | --- | --- | --- | --- | --- |
| multilingual-e5-small Q8_0 | 1 321 ms | 30 ms (19 à 72) | 6 ms | 6/10 | 10/10 | 0,78 | 0,015 |
| **EmbeddingGemma 300M QAT Q8_0** | 1 724 ms | **93 ms** (58 à 201) | 22 ms | **9/10** | 10/10 | **0,95** | **0,132** |
| Qwen3-Embedding 0.6B Q8_0 | 1 542 à 2 563 ms | 494 ms (383 à 642) | 82 à 146 ms | 8/10 | 10/10 | 0,90 | 0,086 |

(MRR : 1 = la bonne note toujours première. Marge : écart de proximité entre la bonne note et la
meilleure mauvaise ; plus elle est grande, plus le classement est net.)

### Défaut trouvé dans llama.rn 0.12.9

La taille des vecteurs est retenue au premier modèle chargé (`static const int n_embd` dans
`cpp/rn-completion.cpp`) et réutilisée pour les suivants tant que l'app tourne : un deuxième modèle de
taille différente donne des vecteurs faux. Corrigé dans llama.rn 0.13 (`llama_model_n_embd_out`).
Sans effet pour Sillon, qui n'utilisera qu'un modèle d'embeddings. Attention au lot 4 : si le modèle de
rédaction (LFM2.5) et le modèle d'embeddings tournent dans la même session de l'app, ce défaut pourrait
les toucher ; à vérifier, ou passer à llama.rn 0.13 quand elle sera stable.

## Recommandations

| Point | Recommandation |
| --- | --- |
| Dossier pCloud | **Écriture directe retenue** (méthode 1, `expo-file-system` nouvelle API). Au lot 2 : noms en `.bin` (ou type adapté) ; une opération à la fois, avec quelques secondes entre deux ; après une erreur, relister le dossier pour vérifier ce qui a vraiment été fait ; une suppression refusée est retentée à la sauvegarde suivante. Le partage manuel (repli F7) reste prévu en secours. |
| Chiffrement | **react-native-libsodium** : Argon2id **3 passes, 256 Mo** (≈ 1,2 s par sauvegarde) et XChaCha20-Poly1305. Si la tâche de fond manque de mémoire au lot 2 : 3 passes, 128 Mo (≈ 0,6 s). |
| Rendu Markdown | **react-native-marked** avec la préparation du texte (cases à cocher, liens `[[ ]]`). |
| Embeddings | **EmbeddingGemma 300M QAT Q8_0** : la meilleure qualité (9/10, marge la plus nette), 5 fois plus rapide que Qwen3 et deux fois plus léger. e5-small est plus rapide mais moins précis. |

## Mises à jour proposées pour le cahier des charges

- **Section 2 (Architecture)** : modèle d'embeddings EmbeddingGemma 300M QAT Q8_0 (313 Mo, dimension 768),
  bibliothèque de chiffrement react-native-libsodium, rendu Markdown react-native-marked.
- **F7 (Sauvegarde)** : préciser XChaCha20-Poly1305 et Argon2id (3 passes, 256 Mo) ; fichier en `.bin` ;
  écriture directe confirmée dans le dossier pCloud ; une suppression refusée par pCloud est retentée plus tard.
- **Section 8 (Risques)** : pCloud signale parfois une erreur sur une opération réussie ; la vérification
  par une nouvelle liste du dossier devient la règle. Le risque « pCloud comme dossier Android » est levé.
- **Section 5 (IA)** : vérifier au lot 4 la cohabitation du modèle de rédaction et du modèle d'embeddings
  (défaut de llama.rn 0.12.9).
