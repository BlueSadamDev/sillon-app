/// <reference types="node" />
// Base SQLite en mémoire pour les tests sur l'ordinateur (SQLite intégré à Node.js, avec FTS5).
// Jamais utilisée par l'app.
import { DatabaseSync } from 'node:sqlite';

import type { Db } from '../types';

export function memoryDb(): Db {
  const sqlite = new DatabaseSync(':memory:');
  let depth = 0;
  return {
    exec: async (sql) => {
      sqlite.exec(sql);
    },
    run: async (sql, params = []) => {
      sqlite.prepare(sql).run(...params);
    },
    all: async <T>(sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).all(...params) as T[],
    first: async <T>(sql: string, params: (string | number | null)[] = []) =>
      (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (task) => {
      if (depth > 0) return task();
      depth++;
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
  };
}
