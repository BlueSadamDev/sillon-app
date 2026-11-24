import { checkBackupPassword, EMPTY_CONFIG, folderDisplayName, isConfigured, parseConfig, serializeConfig } from './config';
import { MIN_BACKUP_PASSWORD_LENGTH } from './settings';

const key = {
  opsLimit: 3,
  memLimit: 256 * 1024 * 1024,
  salt: Uint8Array.from({ length: 16 }, (_, i) => i),
  key: Uint8Array.from({ length: 32 }, (_, i) => 200 - i),
};
const folder = { uri: 'content://com.pcloud.pcloud.documents/tree/d123', name: 'Sillon' };

describe('configuration de la sauvegarde', () => {
  it('se relit à l’identique et ne contient jamais le mot de passe', () => {
    const raw = serializeConfig({ folder, key });
    expect(parseConfig(raw)).toEqual({ folder, key });
    expect(isConfigured(parseConfig(raw))).toBe(true);
  });

  it('n’est complète qu’avec le dossier et la clé', () => {
    expect(isConfigured(EMPTY_CONFIG)).toBe(false);
    expect(isConfigured(parseConfig(serializeConfig({ folder, key: null })))).toBe(false);
    expect(isConfigured(parseConfig(serializeConfig({ folder: null, key })))).toBe(false);
  });

  it('ignore une configuration illisible ou abîmée', () => {
    expect(parseConfig(null)).toEqual(EMPTY_CONFIG);
    expect(parseConfig('pas du json')).toEqual(EMPTY_CONFIG);
    expect(parseConfig('{"v":9}')).toEqual(EMPTY_CONFIG);
    const raw = JSON.parse(serializeConfig({ folder, key }));
    raw.key.key = 'AAAA';
    expect(parseConfig(JSON.stringify(raw))).toEqual({ folder, key: null });
  });

  it('vérifie le mot de passe de sauvegarde', () => {
    const ok = 'x'.repeat(MIN_BACKUP_PASSWORD_LENGTH);
    expect(checkBackupPassword(ok, ok)).toBeNull();
    expect(checkBackupPassword('court', 'court')).toBe('short');
    expect(checkBackupPassword(ok, `${ok}y`)).toBe('mismatch');
  });

  it('donne un nom lisible au dossier', () => {
    expect(folderDisplayName('Sillon', folder.uri)).toBe('Sillon');
    expect(folderDisplayName('primary%3ADocuments%2FSillon', '')).toBe('Sillon');
    expect(folderDisplayName('', 'content://x/tree/primary%3ASauvegardes')).toBe('Sauvegardes');
  });
});
