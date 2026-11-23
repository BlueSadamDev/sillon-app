// Base locale de l'app (expo-sqlite), rangée dans l'espace privé de l'app.
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { randombytes_buf } from 'react-native-libsodium';

import { uuidFromBytes } from '@/notes/id';

import { noteIdentity } from './identity';
import { createNotesRepo, type NotesRepo } from './notesRepo';
import { migrate } from './schema';
import type { Db } from './types';

const DB_NAME = 'sillon.db';

function wrap(sqlite: SQLiteDatabase): Db {
  return {
    exec: (sql) => sqlite.execAsync(sql),
    run: async (sql, params = []) => {
      await sqlite.runAsync(sql, params);
    },
    all: (sql, params = []) => sqlite.getAllAsync(sql, params),
    first: (sql, params = []) => sqlite.getFirstAsync(sql, params),
    transaction: (task) => sqlite.withTransactionAsync(task),
  };
}

let ready: Promise<NotesRepo> | null = null;

/** Ouvre la base (une seule fois), la met à jour si besoin et renvoie l'accès aux notes. */
export function openNotes(): Promise<NotesRepo> {
  ready ??= (async () => {
    const sqlite = await openDatabaseAsync(DB_NAME);
    await sqlite.execAsync('PRAGMA journal_mode = WAL');
    const db = wrap(sqlite);
    await migrate(db);
    const repo = createNotesRepo(db, {
      now: () => Date.now(),
      newId: () => uuidFromBytes(randombytes_buf(16)),
      identity: noteIdentity,
    });
    // Les notes restées plus de 30 jours dans la corbeille sont effacées à l'ouverture.
    await repo.purgeTrash();
    return repo;
  })();
  return ready;
}
