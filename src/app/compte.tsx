// Compte (DESIGN.md, « Écrans du lot 1 », n° 9) : Sécurité, Sauvegarde (lot 2), Données.
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccount } from '@/account/AccountProvider';
import { useBackup } from '@/backup/BackupProvider';
import { LOCK_DELAYS_MIN } from '@/account/settings';
import { BackHeader } from '@/components/BackHeader';
import { SectionLabel } from '@/components/notes';
import { useToast } from '@/components/Toast';
import { PrimaryButton, SecondaryButton, TextLink } from '@/components/ui';
import { openNotes } from '@/db/expoDb';
import { t } from '@/texts/fr';
import { colors, font, radius, space, TOUCH, type } from '@/theme';

export default function AccountScreen() {
  const account = useAccount();
  const backup = useBackup();
  const toast = useToast();
  const a = t.accountScreen;

  async function changeFolder() {
    if (await backup.chooseFolder()) toast({ message: a.backupFolderChanged });
  }

  function confirmWipe() {
    Alert.alert(a.wipeTitle, a.wipeText, [
      { text: a.keep, style: 'cancel' },
      {
        text: a.wipeContinue,
        style: 'destructive',
        onPress: () =>
          Alert.alert(a.wipeTitle2, backup.folderName ? a.wipeText2Backup : a.wipeText2, [
            { text: a.keep, style: 'cancel' },
            { text: a.wipeConfirm, style: 'destructive', onPress: wipe },
          ]),
      },
    ]);
  }

  async function wipe() {
    await (await openNotes()).wipe();
    await backup.forget();
    await account.forget();
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <BackHeader />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={type.greeting}>
            {a.title}
          </Text>
          <Text style={type.secondary}>{a.signedIn(account.username)}</Text>
        </View>

        <View style={styles.group}>
          <SectionLabel>{a.security}</SectionLabel>
          <View style={styles.card}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/mot-de-passe')} style={styles.row}>
              <Text style={type.rowTitle}>{a.changePassword}</Text>
            </Pressable>
            <View style={[styles.row, styles.separator]}>
              <Text style={[type.rowTitle, styles.grow]}>{a.biometrics}</Text>
              <Switch
                accessibilityLabel={a.biometrics}
                value={account.biometrics}
                disabled={!account.canUseBiometrics}
                onValueChange={(on) => void account.setBiometrics(on)}
                trackColor={{ true: colors.accent, false: colors.line }}
                thumbColor={colors.surface}
              />
            </View>
            {!account.canUseBiometrics && <Text style={[type.secondary, styles.note]}>{a.biometricsMissing}</Text>}
            <View style={[styles.block, styles.separator]}>
              <Text style={type.rowTitle}>{a.lockDelay}</Text>
              <View style={styles.chips}>
                {LOCK_DELAYS_MIN.map((min) => {
                  const selected = account.lockDelayMin === min;
                  return (
                    <Pressable
                      key={min}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => account.setLockDelay(min)}
                      style={[styles.chip, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && font('bold')]}>{a.delay(min)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={type.secondary}>{a.lockDelayHint}</Text>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <SectionLabel>{a.backup}</SectionLabel>
          {backup.configured ? (
            <View style={styles.card}>
              <View style={[styles.block]}>
                <Text style={type.rowTitle}>{a.backupFolder(backup.folderName ?? '')}</Text>
                <Text style={type.secondary}>{a.backupFirstSoon}</Text>
                <SecondaryButton label={a.backupOtherFolder} onPress={changeFolder} />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/sauvegarde', params: { mode: 'password' } })}
                style={[styles.row, styles.separator]}>
                <Text style={type.rowTitle}>{a.backupChangePassword}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, styles.block]}>
              <Text style={type.secondary}>{a.backupNone}</Text>
              <PrimaryButton label={a.backupSetup} onPress={() => router.push('/sauvegarde')} />
            </View>
          )}
        </View>

        <View style={styles.group}>
          <SectionLabel>{a.data}</SectionLabel>
          <View style={[styles.card, styles.block]}>
            <Text style={type.secondary}>{a.wipeHint}</Text>
            <SecondaryButton label={a.wipe} onPress={confirmWipe} />
          </View>
        </View>

        <TextLink label={a.benches} onPress={() => router.push('/essais')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  screen: { paddingHorizontal: space.screenHome, paddingBottom: space.block, gap: space.block },
  head: { gap: 4 },
  group: { gap: space.grid },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH + 8, gap: 12 },
  separator: { borderTopWidth: 1, borderTopColor: colors.lineList },
  grow: { flex: 1 },
  note: { paddingBottom: 12 },
  block: { paddingVertical: 14, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: TOUCH,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  chipSelected: { backgroundColor: colors.surfaceAlt, borderColor: colors.inkMuted },
  chipText: { ...font('regular'), fontSize: 14, color: colors.ink },
});
