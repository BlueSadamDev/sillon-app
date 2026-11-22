// Compte (DESIGN.md, n° 9). Étape 4 : écran d'attente ; les réglages arrivent à l'étape 8.
import { router } from 'expo-router';

import { SoonScreen } from '@/components/SoonScreen';
import { SecondaryButton } from '@/components/ui';
import { t } from '@/texts/fr';

export default function AccountScreen() {
  return (
    <SoonScreen title={t.accountScreen.title} text={t.soon.account}>
      <SecondaryButton label={t.accountScreen.benches} onPress={() => router.push('/essais')} />
    </SoonScreen>
  );
}
