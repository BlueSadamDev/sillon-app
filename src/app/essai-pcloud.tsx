// Banc d'essai 1 : écrire, relire, lister et supprimer des fichiers dans le dossier pCloud.
import { File } from 'expo-file-system';
import { useState } from 'react';
import { randombytes_buf } from 'react-native-libsodium';

import { BenchButton, BenchScreen, LogView, P } from '@/components/Bench';
import { useLog } from '@/components/useLog';
import { errorText, getSavedFolderUri, listFiles, pickFolder, readableName, savedFolder } from '@/backup/folder';
import { fileStamp, filesToDelete } from '@/backup/rotation';
import {
  PCLOUD_TEST_EXTENSION,
  PCLOUD_TEST_KEEP,
  PCLOUD_TEST_PREFIX,
  PCLOUD_TEST_SIZE_BYTES,
} from '@/backup/settings';
import { t } from '@/texts/fr';

export default function PcloudBench() {
  const { lines, add, clear } = useLog();
  const [folderUri, setFolderUri] = useState<string | null>(() => getSavedFolderUri());
  const [lastWritten, setLastWritten] = useState<{ uri: string; size: number } | null>(null);

  const withFolder = async (action: string, fn: (dir: NonNullable<ReturnType<typeof savedFolder>>) => void | Promise<void>) => {
    const dir = savedFolder();
    if (!dir) {
      add(`${action} : aucun dossier choisi`);
      return;
    }
    try {
      await fn(dir);
    } catch (e) {
      add(`${action} : ÉCHEC ${errorText(e)}`);
    }
  };

  const pick = async () => {
    try {
      const dir = await pickFolder();
      setFolderUri(dir.uri);
      add(`Dossier choisi : ${dir.uri}`);
    } catch (e) {
      add(`Choix du dossier : ÉCHEC ou annulé ${errorText(e)}`);
    }
  };

  const check = () => withFolder('Vérification', (dir) => {
    add(`Vérification : existe=${dir.exists} ; fichiers=${listFiles(dir).length}`);
  });

  const write = () => withFolder('Écriture', async (dir) => {
    const name = `${PCLOUD_TEST_PREFIX}${fileStamp(new Date())}${PCLOUD_TEST_EXTENSION}`;
    const bytes = randombytes_buf(PCLOUD_TEST_SIZE_BYTES);
    const t0 = Date.now();
    const file = dir.createFile(name, 'application/octet-stream');
    await file.write(bytes);
    const ms = Date.now() - t0;
    setLastWritten({ uri: file.uri, size: bytes.length });
    add(`Écriture OK : ${name}, ${bytes.length} octets en ${ms} ms`);
  });

  const readLast = async () => {
    if (!lastWritten) {
      add('Relecture : écris d’abord un fichier');
      return;
    }
    try {
      const t0 = Date.now();
      const bytes = await new File(lastWritten.uri).bytes();
      add(`Relecture : ${bytes.length} octets (attendu ${lastWritten.size}) en ${Date.now() - t0} ms`);
    } catch (e) {
      add(`Relecture : ÉCHEC ${errorText(e)}`);
    }
  };

  const list = () => withFolder('Liste', (dir) => {
    const files = listFiles(dir);
    add(`Liste : ${files.length} fichiers`);
    for (const f of files) add(`  ${readableName(f.name)} (${f.size ?? '?'} octets)`);
  });

  const rotate = () => withFolder('Rotation', (dir) => {
    const files = listFiles(dir);
    const toDelete = new Set(filesToDelete(files.map((f) => f.name), PCLOUD_TEST_PREFIX, PCLOUD_TEST_KEEP));
    let deleted = 0;
    for (const f of files) {
      if (!toDelete.has(f.name)) continue;
      try {
        f.delete();
        deleted++;
        add(`  supprimé : ${readableName(f.name)}`);
      } catch (e) {
        add(`  suppression ÉCHEC : ${readableName(f.name)} ${errorText(e)}`);
      }
    }
    add(`Rotation : ${deleted} supprimés, ${listFiles(dir).length} restants`);
  });

  return (
    <BenchScreen>
      <P>{t.pcloud.steps}</P>
      <P>{folderUri ? t.pcloud.folder(folderUri) : t.pcloud.folderNone}</P>
      <BenchButton label={t.pcloud.pick} onPress={pick} />
      <BenchButton label={t.pcloud.checkAccess} onPress={check} />
      <BenchButton label={t.pcloud.write} onPress={write} />
      <BenchButton label={t.pcloud.readLast} onPress={readLast} />
      <BenchButton label={t.pcloud.list} onPress={list} />
      <BenchButton label={t.pcloud.rotate(PCLOUD_TEST_KEEP)} onPress={rotate} />
      <BenchButton label={t.common.clearLog} onPress={clear} />
      <LogView lines={lines} />
    </BenchScreen>
  );
}
