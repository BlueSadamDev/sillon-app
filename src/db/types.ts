// Accès minimal à une base SQLite, commun à l'app (expo-sqlite) et aux tests (SQLite de Node.js).
// Un futur module de synchronisation pourra passer par la même interface.

export type SqlValue = string | number | null;

export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  /** Exécute plusieurs écritures d'un seul bloc : toutes réussissent ou aucune. */
  transaction(task: () => Promise<void>): Promise<void>;
}
