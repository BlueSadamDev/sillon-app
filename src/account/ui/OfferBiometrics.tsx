// Proposition d'activer l'empreinte, juste après la création du compte (DESIGN.md, n° 3).
import { StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { FormScreen, PrimaryButton, SecondaryButton } from '@/components/ui';
import { t } from '@/texts/fr';
import { type } from '@/theme';

import { useAccount } from '../AccountProvider';

export function OfferBiometrics() {
  const { setBiometrics, finishOnboarding } = useAccount();

  async function enable() {
    if (await setBiometrics(true)) finishOnboarding();
  }

  return (
    <FormScreen>
      <View style={styles.head}>
        <Logo size={72} />
        <Text style={[type.noteTitle, styles.center]}>{t.account.biometricsTitle}</Text>
        <Text style={[type.secondary, styles.center]}>{t.account.biometricsIntro}</Text>
      </View>
      <PrimaryButton label={t.account.biometricsEnable} onPress={enable} />
      <SecondaryButton label={t.account.biometricsLater} onPress={finishOnboarding} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 10, marginBottom: 12 },
  center: { textAlign: 'center' },
});
