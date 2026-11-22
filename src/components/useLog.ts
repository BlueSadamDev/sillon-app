// Journal d'un banc d'essai : lignes horodatées, les plus récentes en haut.
// Rien n’est écrit dans les journaux de la console (aucun contenu de note ne doit finir dans les journaux d'Android).
import { useCallback, useState } from 'react';

export function useLog() {
  const [lines, setLines] = useState<string[]>([]);
  const add = useCallback((line: string) => {
    const time = new Date().toLocaleTimeString('fr-FR');
    setLines((prev) => [`[${time}] ${line}`, ...prev].slice(0, 200));
  }, []);
  const clear = useCallback(() => setLines([]), []);
  return { lines, add, clear };
}
