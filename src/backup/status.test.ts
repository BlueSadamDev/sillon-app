import { autoBackupDue, backupFileName, badgeFor, daysBetween, EMPTY_STATUS, isBackupName, parseStatus, pendingProblem } from './status';
import { fakeFolder } from './testing/fakeFolder';
import { writeVerified } from './write';

const now = new Date(2026, 10, 23, 14, 5, 0);
const at = (d: number, h = 10) => new Date(2026, 10, d, h).getTime();

describe('nom des fichiers de sauvegarde', () => {
  it('est daté et reconnu, sans confondre les fichiers d’essai ou étrangers', () => {
    expect(backupFileName(now)).toBe('sillon-20261123-140500.bin');
    expect(isBackupName('sillon-20261123-140500.bin')).toBe(true);
    expect(isBackupName('sillon-essai-20261121-090507.bin')).toBe(false);
    expect(isBackupName('sillon-20261123-140500.bin.bin')).toBe(false);
    expect(isBackupName('photo.jpg')).toBe(false);
  });
});

describe('pastille de sauvegarde', () => {
  it('demande la configuration, puis une première sauvegarde', () => {
    expect(badgeFor(false, EMPTY_STATUS, now)).toEqual({ tone: 'warn', kind: 'setup' });
    expect(badgeFor(true, EMPTY_STATUS, now)).toEqual({ tone: 'warn', kind: 'never' });
  });

  it('compte les jours de calendrier', () => {
    expect(daysBetween(at(23, 0), now)).toBe(0);
    expect(daysBetween(at(22, 23), now)).toBe(1);
    const s = (d: number) => ({ ...EMPTY_STATUS, lastSuccessAt: at(d) });
    expect(badgeFor(true, s(23), now)).toEqual({ tone: 'ok', kind: 'days', days: 0 });
    expect(badgeFor(true, s(20), now)).toEqual({ tone: 'ok', kind: 'days', days: 3 });
    expect(badgeFor(true, s(19), now)).toEqual({ tone: 'warn', kind: 'days', days: 4 });
  });

  it('signale un problème plus récent que la dernière réussite, puis l’oublie après une réussite', () => {
    const failed = { ...EMPTY_STATUS, lastSuccessAt: at(20), lastProblem: 'folder-lost' as const, lastProblemAt: at(23) };
    expect(pendingProblem(failed)).toBe('folder-lost');
    expect(badgeFor(true, failed, now)).toEqual({ tone: 'error', kind: 'check' });
    const fixed = { ...failed, lastSuccessAt: at(23, 12) };
    expect(pendingProblem(fixed)).toBeNull();
  });

  it('relit un état enregistré et ignore un état abîmé', () => {
    const s = { lastSuccessAt: 5, lastFileName: 'sillon-20261123-140500.bin', lastProblem: 'write-failed' as const, lastProblemAt: 6, lastAutoAttemptAt: 7 };
    expect(parseStatus(JSON.stringify(s))).toEqual(s);
    expect(parseStatus('{"lastProblem":"autre"}')).toEqual(EMPTY_STATUS);
    expect(parseStatus('pas du json')).toEqual(EMPTY_STATUS);
  });
});

describe('sauvegarde automatique', () => {
  it('a lieu au plus une fois par jour, seulement si la sauvegarde est configurée', () => {
    expect(autoBackupDue(false, EMPTY_STATUS, now)).toBe(false);
    expect(autoBackupDue(true, EMPTY_STATUS, now)).toBe(true);
    expect(autoBackupDue(true, { ...EMPTY_STATUS, lastSuccessAt: at(23, 0) }, now)).toBe(false);
    expect(autoBackupDue(true, { ...EMPTY_STATUS, lastSuccessAt: at(22, 23) }, now)).toBe(true);
  });

  it('attend une heure après une tentative ratée', () => {
    const tried = (min: number) => ({ ...EMPTY_STATUS, lastAutoAttemptAt: now.getTime() - min * 60_000 });
    expect(autoBackupDue(true, tried(10), now)).toBe(false);
    expect(autoBackupDue(true, tried(61), now)).toBe(true);
  });
});

const noWait = async () => {};
const bytes = new Uint8Array([1, 2, 3]);

describe('écriture vérifiée dans le dossier', () => {
  it('réussit quand le fichier apparaît dans la liste', async () => {
    const { ops, files } = fakeFolder();
    expect(await writeVerified(ops, 'sillon-a.bin', bytes, noWait)).toEqual({ ok: true, name: 'sillon-a.bin', reportedError: false });
    expect(files).toContain('sillon-a.bin');
  });

  it('se fie à la liste quand pCloud signale une erreur sur une écriture réussie', async () => {
    const { ops } = fakeFolder(undefined, { errorButWrites: true });
    expect(await writeVerified(ops, 'sillon-a.bin', bytes, noWait)).toEqual({ ok: true, name: 'sillon-a.bin', reportedError: true });
  });

  it('échoue si le fichier n’est pas dans la liste, ou si le dossier est inaccessible', async () => {
    expect(await writeVerified(fakeFolder(undefined, { dropsWrite: true }).ops, 'x.bin', bytes, noWait)).toEqual({
      ok: false,
      problem: 'write-failed',
    });
    expect(await writeVerified(fakeFolder(undefined, { lost: true }).ops, 'x.bin', bytes, noWait)).toEqual({
      ok: false,
      problem: 'folder-lost',
    });
  });
});
