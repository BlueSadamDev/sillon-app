import { router } from 'expo-router';

import { BenchButton, BenchScreen, P } from '@/components/Bench';
import { t } from '@/texts/fr';

export default function Home() {
  return (
    <BenchScreen>
      <P>{t.home.intro}</P>
      <BenchButton label={t.home.pcloud} onPress={() => router.push('/essai-pcloud')} />
      <BenchButton label={t.home.crypto} onPress={() => router.push('/essai-chiffrement')} />
      <BenchButton label={t.home.markdown} onPress={() => router.push('/essai-markdown')} />
      <BenchButton label={t.home.embeddings} onPress={() => router.push('/essai-embeddings')} />
    </BenchScreen>
  );
}
