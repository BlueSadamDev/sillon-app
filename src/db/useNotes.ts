// Accès aux notes depuis les écrans : la requête est relancée chaque fois que l'écran
// redevient visible (retour depuis une note, changement d'onglet) et quand les notes changent.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { onNotesChanged } from './events';

import { openNotes } from './expoDb';
import type { NotesRepo } from './notesRepo';

export function useNotesQuery<T>(query: (repo: NotesRepo) => Promise<T>, initial: T): [T, () => void] {
  const [data, setData] = useState<T>(initial);
  const [version, setVersion] = useState(0);
  useEffect(() => onNotesChanged(() => setVersion((v) => v + 1)), []);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      openNotes()
        .then(query)
        .then((result) => alive && setData(result));
      return () => {
        alive = false;
      };
      // La requête est relue à chaque affichage et après chaque appel à refresh().
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version]),
  );
  return [data, () => setVersion((v) => v + 1)];
}
