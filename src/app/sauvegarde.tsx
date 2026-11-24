// Configurer la sauvegarde, ou changer son mot de passe (?mode=password), depuis l'écran Compte.
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BackupSetup } from '@/backup/ui/BackupSetup';
import { BackHeader } from '@/components/BackHeader';
import { useToast } from '@/components/Toast';
import { FormScreen } from '@/components/ui';
import { t } from '@/texts/fr';

export default function BackupSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const toast = useToast();
  const passwordOnly = mode === 'password';

  function done() {
    toast({ message: passwordOnly ? t.backupSetup.passwordDone : t.backupSetup.done });
    router.back();
  }

  return (
    <View style={styles.fill}>
      <FormScreen top>
        <View style={styles.back}>
          <BackHeader />
        </View>
        <BackupSetup mode={passwordOnly ? 'password' : 'full'} onDone={done} />
      </FormScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { marginHorizontal: -16 },
});
