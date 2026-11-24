// Brouillon de la capture rapide (lot 1.1) : le texte tapé et pas encore validé est gardé dans la
// base du téléphone (jamais dans la sauvegarde) et réapparaît au retour sur l'accueil.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { CAPTURE_DRAFT_DELAY_MS } from '@/notes/settings';

import { openNotes } from './expoDb';

export function useCaptureDraft() {
  const [text, setText] = useState('');
  const latest = useRef('');
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typed = useRef(false);

  const flush = useCallback(async () => {
    if (pending.current === null) return;
    clearTimeout(pending.current);
    pending.current = null;
    await (await openNotes()).setCaptureDraft(latest.current);
  }, []);

  // Relit le brouillon à l'ouverture, sauf si l'on a déjà commencé à taper.
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await (await openNotes()).captureDraft();
      if (alive && !typed.current && saved !== '') {
        latest.current = saved;
        setText(saved);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Enregistrement immédiat quand l'app passe en arrière-plan ou que l'accueil disparaît.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && flush());
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);

  const change = useCallback(
    (next: string) => {
      typed.current = true;
      latest.current = next;
      setText(next);
      if (pending.current !== null) clearTimeout(pending.current);
      pending.current = setTimeout(flush, CAPTURE_DRAFT_DELAY_MS);
    },
    [flush],
  );

  /** La note est créée : le brouillon est effacé. */
  const clear = useCallback(async () => {
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
    latest.current = '';
    setText('');
    await (await openNotes()).setCaptureDraft('');
  }, []);

  return { text, change, clear };
}
