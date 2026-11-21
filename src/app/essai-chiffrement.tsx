// Banc d'essai 2 : chiffrer puis déchiffrer un carnet de notes fictives, mesurer les temps.
import { File, Paths } from 'expo-file-system';
import { useState } from 'react';

import { makeFakeBackupJson } from '@/backup/__fixtures__/fakeNotes';
import { decryptFile, encryptText } from '@/backup/crypto';
import { BENCH_NOTE_COUNTS, BENCH_PASSWORD, KDF_PROFILES } from '@/backup/settings';
import { BenchButton, BenchScreen, LogView, P } from '@/components/Bench';
import { useLog } from '@/components/useLog';
import { errorText } from '@/backup/folder';
import { t } from '@/texts/fr';

/** Laisse l'écran se mettre à jour entre deux calculs (les appels natifs bloquent le fil JS). */
const pause = () => new Promise((r) => setTimeout(r, 50));

export default function CryptoBench() {
  const { lines, add, clear } = useLog();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    add(t.common.running);
    await pause();
    try {
      for (const count of BENCH_NOTE_COUNTS) {
        const json = makeFakeBackupJson(count);
        add(`Carnet fictif : ${count} notes, ${(json.length / 1024).toFixed(0)} Kio de texte`);
        for (const p of KDF_PROFILES) {
          await pause();
          const enc = encryptText(json, BENCH_PASSWORD, p.opsLimit, p.memLimit);
          const file = new File(Paths.cache, `essai-chiffrement-${count}.sillon`);
          const w0 = Date.now();
          if (file.exists) file.delete();
          file.create();
          await file.write(enc.file);
          const writeMs = Date.now() - w0;
          const r0 = Date.now();
          const bytes = await file.bytes();
          const readMs = Date.now() - r0;
          await pause();
          const dec = decryptFile(bytes, BENCH_PASSWORD);
          const same = dec.ok && dec.text === json;
          file.delete();
          add(
            `  ${p.label} : clé ${enc.timings.kdfMs} ms ; chiffrement ${enc.timings.cipherMs} ms ; ` +
              `écriture ${writeMs} ms ; lecture ${readMs} ms ; ` +
              (dec.ok ? `clé ${dec.timings.kdfMs} ms ; déchiffrement ${dec.timings.cipherMs} ms ; ` : `ÉCHEC ${dec.problem} ; `) +
              `fichier ${(enc.file.length / 1024).toFixed(0)} Kio ; identique=${same}`,
          );
        }
      }
    } catch (e) {
      add(`ÉCHEC ${errorText(e)}`);
    }
    setBusy(false);
  };

  const checks = async () => {
    setBusy(true);
    await pause();
    try {
      const p = KDF_PROFILES[0];
      const json = makeFakeBackupJson(10);
      const enc = encryptText(json, BENCH_PASSWORD, p.opsLimit, p.memLimit);
      const wrong = decryptFile(enc.file, 'autre-mot-de-passe');
      add(`Mauvais mot de passe : ${wrong.ok ? 'ACCEPTÉ (problème !)' : `refusé (${wrong.problem})`}`);
      const damaged = enc.file.slice();
      damaged[damaged.length - 5] ^= 0xff;
      const d1 = decryptFile(damaged, BENCH_PASSWORD);
      add(`Contenu abîmé : ${d1.ok ? 'ACCEPTÉ (problème !)' : `refusé (${d1.problem})`}`);
      const header = enc.file.slice();
      header[20] ^= 0xff; // octet du sel : la clé change, l'authentification échoue
      const d2 = decryptFile(header, BENCH_PASSWORD);
      add(`En-tête abîmé : ${d2.ok ? 'ACCEPTÉ (problème !)' : `refusé (${d2.problem})`}`);
      const notOurs = decryptFile(new Uint8Array(100), BENCH_PASSWORD);
      add(`Fichier étranger : ${notOurs.ok ? 'ACCEPTÉ (problème !)' : `refusé (${notOurs.problem})`}`);
    } catch (e) {
      add(`ÉCHEC ${errorText(e)}`);
    }
    setBusy(false);
  };

  return (
    <BenchScreen>
      <P>{t.crypto.intro}</P>
      <BenchButton label={t.crypto.run} onPress={run} disabled={busy} />
      <BenchButton label={t.crypto.checks} onPress={checks} disabled={busy} />
      <BenchButton label={t.common.clearLog} onPress={clear} disabled={busy} />
      <LogView lines={lines} />
    </BenchScreen>
  );
}
