/// <reference types="node" />
import { createHash } from 'crypto';

import { fromHex, hashPassword, sameBytes, toHex, verifyPassword, type Kdf } from './password';
import { checkNewAccount, checkNewPassword, shouldLock } from './rules';
import { PASSWORD_KDF } from './settings';
import { loadDeviceId, withAuthorId } from './identity';
import { parseAccount, type SecretStore } from './store';

// Argon2id simulé (le vrai calcul est natif) : même forme d'entrée et de sortie.
const fakeKdf: Kdf = (password, salt, ops, mem, bytes) =>
  new Uint8Array(createHash('sha256').update(`${password}|${toHex(salt)}|${ops}|${mem}`).digest()).slice(0, bytes);

const SALT = new Uint8Array(16).fill(7);

describe('mot de passe du compte', () => {
  it('ne garde qu’une empreinte, jamais le mot de passe', () => {
    const record = hashPassword('mot-de-passe-fictif', fakeKdf, SALT);
    expect(JSON.stringify(record)).not.toContain('mot-de-passe-fictif');
    expect(record).toMatchObject({ alg: 'argon2id', opsLimit: PASSWORD_KDF.opsLimit, memLimit: PASSWORD_KDF.memLimit });
  });
  it('reconnaît le bon mot de passe et refuse les autres', () => {
    const record = hashPassword('mot-de-passe-fictif', fakeKdf, SALT);
    expect(verifyPassword('mot-de-passe-fictif', record, fakeKdf)).toBe(true);
    expect(verifyPassword('Mot-de-passe-fictif', record, fakeKdf)).toBe(false);
    expect(verifyPassword('', record, fakeKdf)).toBe(false);
  });
  it('convertit et compare les octets', () => {
    expect(toHex(fromHex('00ff10'))).toBe('00ff10');
    expect(sameBytes(fromHex('0102'), fromHex('0102'))).toBe(true);
    expect(sameBytes(fromHex('0102'), fromHex('0103'))).toBe(false);
    expect(sameBytes(fromHex('01'), fromHex('0102'))).toBe(false);
  });
});

describe('création du compte', () => {
  it('vérifie identifiant et mot de passe', () => {
    expect(checkNewAccount('  ', 'abcdefgh', 'abcdefgh')).toBe('username-empty');
    expect(checkNewAccount('x'.repeat(41), 'abcdefgh', 'abcdefgh')).toBe('username-long');
    expect(checkNewAccount('Camille', 'court', 'court')).toBe('password-short');
    expect(checkNewAccount('Camille', 'abcdefgh', 'abcdefgi')).toBe('password-mismatch');
    expect(checkNewAccount('Camille', 'abcdefgh', 'abcdefgh')).toBeNull();
    expect(checkNewPassword('abcdefgh', 'abcdefgh')).toBeNull();
  });
});

describe('verrouillage', () => {
  it('verrouille après le délai passé en arrière-plan', () => {
    expect(shouldLock(null, 1e9, 5)).toBe(false);
    expect(shouldLock(0, 4 * 60_000, 5)).toBe(false);
    expect(shouldLock(0, 5 * 60_000, 5)).toBe(true);
    expect(shouldLock(1000, 1000, 0)).toBe(true);
  });
});

describe('lecture du compte', () => {
  it('relit un compte enregistré et ignore une donnée abîmée', () => {
    const password = hashPassword('mot-de-passe-fictif', fakeKdf, SALT);
    const saved = JSON.stringify({ username: 'Camille', password, biometrics: true });
    expect(parseAccount(saved)).toEqual({ username: 'Camille', password, biometrics: true, lockDelayMin: 5, authorId: '' });
    expect(parseAccount(JSON.stringify({ username: 'Camille', password, authorId: 'auteur-1' }))?.authorId).toBe('auteur-1');
    expect(parseAccount('{abîmé')).toBeNull();
    expect(parseAccount(null)).toBeNull();
  });
});

describe('identifiants du partage futur', () => {
  const ids = () => {
    let n = 0;
    return () => `id-${++n}`;
  };

  it('donne un identifiant d’auteur à un compte d’avant, une seule fois', () => {
    const old = parseAccount(JSON.stringify({ username: 'Camille', password: hashPassword('mot-de-passe-fictif', fakeKdf, SALT) }))!;
    const first = withAuthorId(old, ids());
    expect(first).toMatchObject({ changed: true, account: { authorId: 'id-1' } });
    expect(withAuthorId(first.account, ids())).toEqual({ account: first.account, changed: false });
  });

  it('crée l’identifiant de l’appareil une fois, puis le garde', async () => {
    const data = new Map<string, string>();
    const store: SecretStore = {
      get: async (k) => data.get(k) ?? null,
      set: async (k, v) => void data.set(k, v),
      remove: async (k) => void data.delete(k),
    };
    const newId = ids();
    expect(await loadDeviceId(store, newId)).toBe('id-1');
    expect(await loadDeviceId(store, newId)).toBe('id-1');
  });
});
