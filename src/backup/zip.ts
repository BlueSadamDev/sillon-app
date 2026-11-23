// Fabrication d'un fichier ZIP simple (sans compression, méthode « stored »), pour l'export en clair.
// Calcul pur, sans dépendance : en-têtes locaux, répertoire central, fin de répertoire (APPNOTE 6.3).
// Noms en UTF-8 (bit 11). Limites : moins de 65 535 fichiers et moins de 4 Go au total (largement assez).

export type ZipEntry = { path: string; data: Uint8Array; modifiedAt: number };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Date et heure au format MS-DOS (heure locale, à 2 secondes près, à partir de 1980). */
function dosDateTime(time: number): { date: number; time: number } {
  const d = new Date(Math.max(time, new Date(1980, 0, 1).getTime()));
  return {
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  };
}

const UTF8_FLAG = 0x0800;

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const prepared = entries.map((e) => ({
    name: encoder.encode(e.path),
    data: e.data,
    crc: crc32(e.data),
    dos: dosDateTime(e.modifiedAt),
  }));
  const localSize = prepared.reduce((sum, e) => sum + 30 + e.name.length + e.data.length, 0);
  const centralSize = prepared.reduce((sum, e) => sum + 46 + e.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let pos = 0;
  const u16 = (v: number) => {
    view.setUint16(pos, v, true);
    pos += 2;
  };
  const u32 = (v: number) => {
    view.setUint32(pos, v >>> 0, true);
    pos += 4;
  };
  const bytes = (b: Uint8Array) => {
    out.set(b, pos);
    pos += b.length;
  };

  const offsets: number[] = [];
  for (const e of prepared) {
    offsets.push(pos);
    u32(0x04034b50); // en-tête local
    u16(20); // version nécessaire (2.0)
    u16(UTF8_FLAG);
    u16(0); // sans compression
    u16(e.dos.time);
    u16(e.dos.date);
    u32(e.crc);
    u32(e.data.length);
    u32(e.data.length);
    u16(e.name.length);
    u16(0);
    bytes(e.name);
    bytes(e.data);
  }
  const centralStart = pos;
  prepared.forEach((e, i) => {
    u32(0x02014b50); // répertoire central
    u16(20); // créé par (2.0)
    u16(20);
    u16(UTF8_FLAG);
    u16(0);
    u16(e.dos.time);
    u16(e.dos.date);
    u32(e.crc);
    u32(e.data.length);
    u32(e.data.length);
    u16(e.name.length);
    u16(0); // champ supplémentaire
    u16(0); // commentaire
    u16(0); // disque
    u16(0); // attributs internes
    u32(0); // attributs externes
    u32(offsets[i]);
    bytes(e.name);
  });
  u32(0x06054b50); // fin du répertoire central
  u16(0);
  u16(0);
  u16(prepared.length);
  u16(prepared.length);
  u32(centralSize);
  u32(centralStart);
  u16(0);
  return out;
}
