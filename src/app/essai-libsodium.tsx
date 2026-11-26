// Banc d'essai du lot 7.0 : fonctions libsodium de la synchronisation (étude, section 5).
import { useState } from 'react';

import { errorText } from '@/backup/folder';
import { BenchButton, BenchScreen, LogView, P } from '@/components/Bench';
import { useLog } from '@/components/useLog';
import { correctness, presence, speed } from '@/sync/essai/sodiumChecks';
import { t } from '@/texts/fr';

/** Laisse l'écran se mettre à jour entre deux calculs (les appels natifs bloquent le fil JS). */
const pause = () => new Promise((r) => setTimeout(r, 50));

export default function SodiumBench() {
  const { lines, add, clear } = useLog();
  const [busy, setBusy] = useState(false);

  const run = (fn: () => void) => async () => {
    setBusy(true);
    add(t.common.running);
    await pause();
    try {
      fn();
    } catch (e) {
      add(`ÉCHEC ${errorText(e)}`);
    }
    setBusy(false);
  };

  const showPresence = run(() => {
    const res = presence();
    const missing = res.filter((r) => !r.present).map((r) => r.name);
    add(`${res.length - missing.length} fonctions sur ${res.length} présentes`);
    add(missing.length ? `Absentes : ${missing.join(', ')}` : 'Aucune absente');
  });

  const showCorrectness = run(() => {
    const res = correctness();
    for (const c of res) add(`${c.ok ? 'OK' : 'NON'} : ${c.label}${c.detail ? ` (${c.detail})` : ''}`);
    add(`${res.filter((c) => c.ok).length} sur ${res.length} vérifications réussies`);
  });

  const showSpeed = run(() => {
    for (const s of speed()) add(`${s.label} : ${s.perOpMs < 1 ? s.perOpMs.toFixed(3) : s.perOpMs.toFixed(1)} ms (moyenne sur ${s.runs})`);
  });

  return (
    <BenchScreen>
      <P>{t.sodiumBench.intro}</P>
      <BenchButton label={t.sodiumBench.presence} onPress={showPresence} disabled={busy} />
      <BenchButton label={t.sodiumBench.correctness} onPress={showCorrectness} disabled={busy} />
      <BenchButton label={t.sodiumBench.speed} onPress={showSpeed} disabled={busy} />
      <BenchButton label={t.common.clearLog} onPress={clear} disabled={busy} />
      <LogView lines={lines} />
    </BenchScreen>
  );
}
