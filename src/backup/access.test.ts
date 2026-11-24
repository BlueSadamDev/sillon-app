import type { FolderOps } from './write';
import { folderReachable } from './write';

/** Dossier fictif qui ne répond pas aux `failures` premières demandes. */
function flaky(failures: number): FolderOps & { calls: number } {
  const ops = {
    calls: 0,
    async names() {
      ops.calls++;
      if (ops.calls <= failures) throw new Error('pas de réponse');
      return ['sillon-20261124-090000.bin'];
    },
    async write() {},
    async remove() {},
  };
  return ops;
}

describe('vérification de l’accès au dossier', () => {
  it('répond tout de suite quand le dossier répond', async () => {
    const ops = flaky(0);
    let waits = 0;
    expect(await folderReachable(ops, 2, async () => void waits++)).toBe(true);
    expect([ops.calls, waits]).toEqual([1, 0]);
  });

  it('ne conclut pas à une perte d’accès sur une réponse manquée', async () => {
    const ops = flaky(2);
    let waits = 0;
    expect(await folderReachable(ops, 2, async () => void waits++)).toBe(true);
    expect([ops.calls, waits]).toEqual([3, 2]);
  });

  it('signale la perte d’accès après tous les essais', async () => {
    const ops = flaky(99);
    let waits = 0;
    expect(await folderReachable(ops, 2, async () => void waits++)).toBe(false);
    expect([ops.calls, waits]).toEqual([3, 2]);
  });
});
