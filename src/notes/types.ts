// Forme d'une note (cahier des charges, 3.1). Les dates sont en millisecondes depuis 1970.

export type Note = {
  id: string;
  title: string;
  /** Contenu en Markdown. */
  body: string;
  /** Note qui contient celle-ci, ou null pour une note à la racine. */
  parentId: string | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** Date de mise à la corbeille, ou null si la note n'est pas à la corbeille. */
  deletedAt: number | null;
  /**
   * Date d'archivage, ou null. Une note archivée quitte l'accueil (récentes, épinglées) mais reste
   * dans Pages (groupe « Archives ») et dans la recherche ; elle n'est jamais effacée toute seule.
   */
  archivedAt: number | null;
  /**
   * Préparation au partage (cahier des charges, 3.1) : identifiant d'auteur, celui du compte local qui a
   * créé la note ; il ne change plus. null seulement pour une note venue d'une sauvegarde de version 1,
   * le temps de lui attribuer le compte du téléphone.
   */
  authorId: string | null;
  /** Identifiant de l'appareil de la dernière modification (même remarque pour null). */
  deviceId: string | null;
};
