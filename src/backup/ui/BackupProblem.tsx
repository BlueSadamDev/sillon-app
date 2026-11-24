// Message de l'accueil quand la sauvegarde a un problème à régler (F7, « En cas d'échec ») :
// dossier inaccessible (permission perdue, app pCloud absente ou déconnectée) ou sauvegarde pas arrivée.
// Fond et texte « error » (DESIGN.md), avec le bouton qui règle le problème.
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { PrimaryButton } from '@/components/ui';
import { t } from '@/texts/fr';
import { colors, radius, type } from '@/theme';

import { useBackup } from '../BackupProvider';

export function BackupProblem() {
  const backup = useBackup();
  const toast = useToast();
  const b = t.backup;
  if (backup.loading || !backup.configured || !backup.problem) return null;
  const lost = backup.problem === 'folder-lost';

  async function fix() {
    if (lost) {
      if (await backup.chooseFolder()) toast({ message: t.accountScreen.backupFolderChanged });
      return;
    }
    const result = await backup.backupNow();
    if (result.ok) toast({ message: b.done });
  }

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={[type.secondary, styles.text]}>{b.problems[backup.problem]}</Text>
      <PrimaryButton
        label={backup.running ? b.running : lost ? b.chooseAgain : b.retry}
        onPress={fix}
        disabled={backup.running}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.error.bg,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  text: { color: colors.error.text },
});
