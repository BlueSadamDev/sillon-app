// Banc d'essai 1 : écrire, relire, lister et supprimer des fichiers dans le dossier pCloud.
// Deux méthodes d'écriture sont comparées : la nouvelle API d'expo-file-system et l'ancienne
// (expo-file-system/legacy), qui passent par des chemins Android différents.
import { type Directory } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useState } from 'react';
import { base64_variants, randombytes_buf, to_base64 } from 'react-native-libsodium';

import {
  errorText,
  getSavedFolderUri,
  listEntries,
  pickFolder,
  savedFolder,
  type FolderEntry,
} from '@/backup/folder';
import { fileStamp, filesToDelete } from '@/backup/rotation';
import {
  PCLOUD_TEST_EXTENSION,
  PCLOUD_TEST_KEEP,
  PCLOUD_TEST_PREFIX,
  PCLOUD_TEST_SIZE_BYTES,
} from '@/backup/settings';
import { BenchButton, BenchScreen, LogView, P } from '@/components/Bench';
import { useLog } from '@/components/useLog';
import { t } from '@/texts/fr';

const when = (ms: number | null) => (ms ? new Date(ms).toLocaleString('fr-FR') : 'date inconnue');
const describe = (f: FolderEntry) => `${f.displayName} (${f.size ?? '?'} octets, ${when(f.lastModified)})`;

export default function PcloudBench() {
  const { lines, add, clear } = useLog();
  const [folderUri, setFolderUri] = useState<string | null>(() => getSavedFolderUri());
  const [busy, setBusy] = useState(false);

  const withFolder = async (action: string, fn: (dir: Directory) => void | Promise<void>) => {
    const dir = savedFolder();
    if (!dir) {
      add(`${action} : aucun dossier choisi`);
      return;
    }
    setBusy(true);
    try {
      await fn(dir);
    } catch (e) {
      add(`${action} : ÉCHEC ${errorText(e)}`);
    }
    setBusy(false);
  };

  const newName = () => `${PCLOUD_TEST_PREFIX}${fileStamp(new Date())}${PCLOUD_TEST_EXTENSION}`;

  const pick = async () => {
    try {
      const dir = await pickFolder();
      setFolderUri(dir.uri);
      add(`Dossier choisi : ${dir.uri}`);
    } catch (e) {
      add(`Choix du dossier : ÉCHEC ou annulé ${errorText(e)}`);
    }
  };

  const check = () =>
    withFolder('Vérification', (dir) => {
      add(`Vérification : existe=${dir.exists} ; fichiers=${listEntries(dir).length}`);
    });

  const writeNew = () =>
    withFolder('Écriture (méthode 1)', async (dir) => {
      const name = newName();
      const bytes = randombytes_buf(PCLOUD_TEST_SIZE_BYTES);
      const t0 = Date.now();
      const file = dir.createFile(name, 'application/octet-stream');
      await file.write(bytes);
      add(`Écriture (méthode 1) OK : ${name}, ${bytes.length} octets en ${Date.now() - t0} ms ; adresse ${file.uri}`);
    });

  const writeLegacy = () =>
    withFolder('Écriture (méthode 2)', async (dir) => {
      const name = newName();
      const b64 = to_base64(randombytes_buf(PCLOUD_TEST_SIZE_BYTES), base64_variants.ORIGINAL);
      const t0 = Date.now();
      const uri = await StorageAccessFramework.createFileAsync(dir.uri, name, 'application/octet-stream');
      await StorageAccessFramework.writeAsStringAsync(uri, b64, { encoding: 'base64' });
      add(`Écriture (méthode 2) OK : ${name}, ${PCLOUD_TEST_SIZE_BYTES} octets en ${Date.now() - t0} ms ; adresse ${uri}`);
    });

  const readNewest = () =>
    withFolder('Relecture', async (dir) => {
      const ours = listEntries(dir).filter((f) => f.displayName.startsWith(PCLOUD_TEST_PREFIX));
      if (ours.length === 0) {
        add('Relecture : aucun fichier d’essai dans le dossier');
        return;
      }
      const newest = ours.sort((a, b) => (a.displayName < b.displayName ? 1 : -1))[0];
      const t0 = Date.now();
      const bytes = await newest.file.bytes();
      add(`Relecture : ${newest.displayName} → ${bytes.length} octets lus (attendu ${PCLOUD_TEST_SIZE_BYTES}) en ${Date.now() - t0} ms`);
    });

  const list = () =>
    withFolder('Liste', (dir) => {
      const entries = listEntries(dir);
      add(`Liste : ${entries.length} fichiers`);
      for (const f of entries) add(`  ${describe(f)}`);
    });

  const rotate = () =>
    withFolder('Rotation', (dir) => {
      const entries = listEntries(dir);
      const toDelete = new Set(filesToDelete(entries.map((f) => f.displayName), PCLOUD_TEST_PREFIX, PCLOUD_TEST_KEEP));
      let deleted = 0;
      for (const f of entries) {
        if (!toDelete.has(f.displayName)) continue;
        try {
          f.file.delete();
          deleted++;
          add(`  supprimé : ${f.displayName}`);
        } catch (e) {
          add(`  suppression ÉCHEC : ${f.displayName} ${errorText(e)}`);
        }
      }
      add(`Rotation : ${deleted} supprimés, ${listEntries(dir).length} restants`);
    });

  return (
    <BenchScreen>
      <P>{t.pcloud.steps}</P>
      <P>{folderUri ? t.pcloud.folder(folderUri) : t.pcloud.folderNone}</P>
      <BenchButton label={t.pcloud.pick} onPress={pick} disabled={busy} />
      <BenchButton label={t.pcloud.checkAccess} onPress={check} disabled={busy} />
      <BenchButton label={t.pcloud.write} onPress={writeNew} disabled={busy} />
      <BenchButton label={t.pcloud.writeLegacy} onPress={writeLegacy} disabled={busy} />
      <BenchButton label={t.pcloud.readLast} onPress={readNewest} disabled={busy} />
      <BenchButton label={t.pcloud.list} onPress={list} disabled={busy} />
      <BenchButton label={t.pcloud.rotate(PCLOUD_TEST_KEEP)} onPress={rotate} disabled={busy} />
      <BenchButton label={t.common.clearLog} onPress={clear} disabled={busy} />
      <LogView lines={lines} />
    </BenchScreen>
  );
}
