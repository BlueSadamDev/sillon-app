import { router } from 'expo-router';

import { BenchButton, BenchScreen, P } from '@/components/Bench';
import { t } from '@/texts/fr';

export default function Benches() {
  return (
    <BenchScreen>
      <P>{t.benches.intro}</P>
      <BenchButton label={t.benches.pcloud} onPress={() => router.push('/essai-pcloud')} />
      <BenchButton label={t.benches.crypto} onPress={() => router.push('/essai-chiffrement')} />
      <BenchButton label={t.benches.markdown} onPress={() => router.push('/essai-markdown')} />
      <BenchButton label={t.benches.embeddings} onPress={() => router.push('/essai-embeddings')} />
      <BenchButton label={t.benches.yjs} onPress={() => router.push('/essai-yjs')} />
      <BenchButton label={t.benches.sodium} onPress={() => router.push('/essai-libsodium')} />
    </BenchScreen>
  );
}
