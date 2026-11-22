// Proposition de configurer la sauvegarde au premier lancement (cahier des charges, F2),
// après la création du compte et la proposition d'empreinte.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { useToast } from '@/components/Toast';
import { FormScreen, PrimaryButton, SecondaryButton } from '@/components/ui';
import { t } from '@/texts/fr';
import { type } from '@/theme';

import { BackupSetup } from './BackupSetup';

export function OfferBackup({ onFinish }: { onFinish: () => void }) {
  const [setup, setSetup] = useState(false);
  const toast = useToast();
  const s = t.backupSetup;

  if (setup) {
    return (
      <FormScreen top>
        <View style={styles.spacer} />
        <BackupSetup
          mode="full"
          onDone={() => {
            toast({ message: s.done });
            onFinish();
          }}
        />
        <SecondaryButton label={s.offerLater} onPress={onFinish} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <View style={styles.head}>
        <Logo size={72} />
        <Text style={[type.noteTitle, styles.center]}>{s.offerTitle}</Text>
        <Text style={[type.secondary, styles.center]}>{s.offerIntro}</Text>
      </View>
      <PrimaryButton label={s.offerSetup} onPress={() => setSetup(true)} />
      <SecondaryButton label={s.offerLater} onPress={onFinish} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 10, marginBottom: 12 },
  center: { textAlign: 'center' },
  spacer: { height: 24 },
});
