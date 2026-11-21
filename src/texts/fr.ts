// Tous les textes affichés. Lot 0 : uniquement les écrans « Banc d'essai » (outil interne,
// sans travail graphique). Les textes de l'app réelle suivront la charte de DESIGN.md.

export const t = {
  home: {
    title: 'Sillon : bancs d’essai',
    intro: 'Quatre essais techniques du lot 0. Les notes utilisées sont fictives.',
    pcloud: 'Dossier pCloud',
    crypto: 'Chiffrement',
    markdown: 'Rendu Markdown',
    embeddings: 'Embeddings',
  },
  common: {
    running: 'Essai en cours…',
    log: 'Journal de l’essai',
    clearLog: 'Effacer le journal',
  },
  pcloud: {
    title: 'Banc d’essai : dossier pCloud',
    steps:
      '1. Choisis un dossier dans pCloud. 2. Écris un fichier. 3. Vérifie qu’il arrive dans pCloud (site ou ordinateur). 4. Redémarre le téléphone, puis « Écrire un fichier » à nouveau. 5. Teste la rotation.',
    folderNone: 'Aucun dossier choisi pour l’instant.',
    folder: (uri: string) => `Dossier gardé : ${uri}`,
    pick: 'Choisir le dossier',
    write: 'Écrire un fichier d’essai',
    list: 'Lister les fichiers',
    readLast: 'Relire le dernier fichier',
    rotate: (keep: number) => `Rotation : garder les ${keep} plus récents`,
    checkAccess: 'Vérifier l’accès au dossier',
  },
  crypto: {
    title: 'Banc d’essai : chiffrement',
    intro: 'Chiffre puis déchiffre un carnet de notes fictives avec libsodium (Argon2id + XChaCha20-Poly1305).',
    run: 'Lancer les mesures',
    checks: 'Vérifier les refus (mauvais mot de passe, fichier abîmé)',
  },
  markdown: {
    title: 'Banc d’essai : Markdown',
    measure: 'Mesurer l’analyse d’une longue note',
    noteLink: (title: string) => `Lien vers la note « ${title} »`,
  },
  embeddings: {
    title: 'Banc d’essai : embeddings',
    intro: 'Importe un fichier .gguf depuis le téléphone, puis lance la mesure sur 10 notes fictives et 10 questions.',
    import: 'Importer un modèle (.gguf)',
    none: 'Aucun modèle importé.',
    run: 'Mesurer',
    remove: 'Supprimer',
  },
} as const;
