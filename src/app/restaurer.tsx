// Restaurer une sauvegarde depuis l'écran Compte (F7). Les réglages sauvegardés sont repris.
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAccount } from '@/account/AccountProvider';
import { RestoreFlow } from '@/backup/ui/RestoreFlow';
import { BackHeader } from '@/components/BackHeader';
import { useToast } from '@/components/Toast';
import { FormScreen } from '@/components/ui';
import { t } from '@/texts/fr';

export default function RestoreScreen() {
  const account = useAccount();
  const toast = useToast();

  return (
    <View style={styles.fill}>
      <FormScreen top>
        <View style={styles.back}>
          <BackHeader />
        </View>
        <RestoreFlow
          mode="account"
          onDone={async (content) => {
            await account.setLockDelay(content.settings.lockDelayMin);
            toast({ message: t.restore.done });
            router.dismissAll();
          }}
        />
      </FormScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { marginHorizontal: -16 },
});
