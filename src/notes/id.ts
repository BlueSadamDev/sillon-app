// Identifiant unique d'une note (UUID version 4), fabriqué à partir de 16 octets aléatoires.
// Les octets viennent du générateur de libsodium dans l'app (voir src/db/notesRepo.ts).

export function uuidFromBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error('16 octets attendus');
  const b = Uint8Array.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
