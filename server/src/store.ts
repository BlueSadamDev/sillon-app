// Base du relais (SQLite intégré à Node.js) : appareils autorisés, codes d'installation, messages.
// Les messages sont rangés tels quels : contenu chiffré illisible pour le relais.
import { createHash, randomInt } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import type { Envelope, Kind } from './envelope.ts';

export type Stored = Envelope & { receivedAt: number };

const CODE_LIFETIME_MS = 15 * 60 * 1000;
const hash = (code: string) => createHash('sha256').update(code).digest('hex');

export class Store {
  readonly db: DatabaseSync;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        added_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS install_codes (
        code_hash TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        doc_id TEXT NOT NULL,
        epoch INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload BLOB NOT NULL,
        sig TEXT NOT NULL,
        received_at INTEGER NOT NULL,
        UNIQUE (device_id, seq)
      );
    `);
  }

  /** Nouveau code d'installation à usage unique (8 chiffres, valable 15 minutes). */
  newInstallCode(now = Date.now()): string {
    const code = String(randomInt(0, 100_000_000)).padStart(8, '0');
    this.db.prepare('DELETE FROM install_codes WHERE expires_at < ?').run(now);
    this.db.prepare('INSERT INTO install_codes (code_hash, expires_at) VALUES (?, ?)').run(hash(code), now + CODE_LIFETIME_MS);
    return code;
  }

  /** Utilise un code d'installation : vrai s'il était valable (il ne l'est plus ensuite). */
  useInstallCode(code: string, now = Date.now()): boolean {
    const res = this.db.prepare('DELETE FROM install_codes WHERE code_hash = ? AND expires_at >= ?').run(hash(code), now);
    return res.changes === 1;
  }

  addDevice(deviceId: string, now = Date.now()) {
    this.db.prepare('INSERT OR IGNORE INTO devices (device_id, added_at) VALUES (?, ?)').run(deviceId, now);
  }

  isDevice(deviceId: string): boolean {
    return this.db.prepare('SELECT 1 FROM devices WHERE device_id = ?').get(deviceId) !== undefined;
  }

  lastSeq(deviceId: string): number {
    const row = this.db.prepare('SELECT MAX(seq) AS s FROM messages WHERE device_id = ?').get(deviceId) as { s: number | null };
    return row.s ?? 0;
  }

  /** Range un message. « double » : déjà reçu (renvoi après une coupure) ; « trou » : il en manque avant. */
  put(env: Envelope, payload: Uint8Array, now = Date.now()): 'ok' | 'double' | 'trou' {
    const last = this.lastSeq(env.deviceId);
    if (env.seq <= last) return 'double';
    if (env.seq !== last + 1) return 'trou';
    this.db
      .prepare('INSERT INTO messages (device_id, seq, doc_id, epoch, kind, payload, sig, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(env.deviceId, env.seq, env.docId, env.epoch, env.kind, payload, env.sig, now);
    return 'ok';
  }

  /** Messages des autres appareils au-delà de ce que `reader` a déjà reçu de chacun, dans l'ordre d'arrivée. */
  since(reader: string, known: Record<string, number>, limit = 500): Stored[] {
    const devices = this.db.prepare('SELECT device_id FROM devices WHERE device_id != ?').all(reader) as { device_id: string }[];
    const query = this.db.prepare('SELECT * FROM messages WHERE device_id = ? AND seq > ? ORDER BY seq LIMIT ?');
    const rows: Row[] = [];
    for (const { device_id } of devices) rows.push(...(query.all(device_id, known[device_id] ?? 0, limit) as Row[]));
    return rows
      .sort((a, b) => a.id - b.id)
      .slice(0, limit)
      .map(toStored);
  }

  stats(): { devices: number; messages: number; payloadBytes: number } {
    const d = this.db.prepare('SELECT COUNT(*) AS n FROM devices').get() as { n: number };
    const m = this.db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(payload)), 0) AS b FROM messages').get() as { n: number; b: number };
    return { devices: d.n, messages: m.n, payloadBytes: m.b };
  }

  close() {
    this.db.close();
  }
}

type Row = {
  id: number;
  device_id: string;
  seq: number;
  doc_id: string;
  epoch: number;
  kind: Kind;
  payload: Uint8Array;
  sig: string;
  received_at: number;
};

function toStored(r: Row): Stored {
  return {
    docId: r.doc_id,
    deviceId: r.device_id,
    seq: r.seq,
    epoch: r.epoch,
    kind: r.kind,
    payload: Buffer.from(r.payload).toString('base64'),
    sig: r.sig,
    receivedAt: r.received_at,
  };
}
