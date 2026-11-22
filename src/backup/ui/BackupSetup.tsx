// Formulaire de configuration de la sauvegarde (cahier des charges, F7) :
// 1. dossier pCloud (sélecteur d'Android), 2. mot de passe de sauvegarde (deux fois, avec avertissement).
// En mode « password », seul le mot de passe est demandé (changement depuis Compte).
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SectionLabel } from '@/components/notes';
import { Field, InfoBox, PrimaryButton, ProblemText, SecondaryButton } from '@/components/ui';
import { t } from '@/texts/fr';
import { type } from '@/theme';

import { useBackup } from '../BackupProvider';
import { checkBackupPassword } from '../config';
import { MIN_BACKUP_PASSWORD_LENGTH } from '../settings';

export function BackupSetup({ mode, onDone }: { mode: 'full' | 'password'; onDone: () => void }) {
  const backup = useBackup();
  const s = t.backupSetup;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose() {
    setProblem(null);
    await backup.chooseFolder();
  }

  async function submit() {
    if (mode === 'full' && !backup.folderName) return setProblem(s.problems.folder);
    const issue = checkBackupPassword(password, confirm);
    if (issue === 'short') return setProblem(s.problems.short(MIN_BACKUP_PASSWORD_LENGTH));
    if (issue === 'mismatch') return setProblem(s.problems.mismatch);
    setProblem(null);
    setBusy(true);
    await backup.setPassword(password);
    setPassword('');
    setConfirm('');
    setBusy(false);
    onDone();
  }

  return (
    <View style={styles.form}>
      <Text accessibilityRole="header" style={type.noteTitle}>
        {mode === 'full' ? s.title : s.titlePassword}
      </Text>
      {mode === 'full' && (
        <>
          <Text style={type.secondary}>{s.intro}</Text>
          <SectionLabel>{s.folderStep}</SectionLabel>
          {backup.folderName ? (
            <>
              <Text style={type.rowTitle}>{s.chosen(backup.folderName)}</Text>
              <SecondaryButton label={s.otherFolder} onPress={choose} disabled={busy} />
            </>
          ) : (
            <>
              <Text style={type.secondary}>{s.folderHint}</Text>
              <SecondaryButton label={s.chooseFolder} onPress={choose} disabled={busy} />
            </>
          )}
          <SectionLabel>{s.passwordStep}</SectionLabel>
        </>
      )}
      <InfoBox>{mode === 'full' ? s.warning : `${s.warning} ${s.changeHint}`}</InfoBox>
      <Field
        label={s.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Field
        label={s.confirm}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        onSubmitEditing={submit}
      />
      {problem && <ProblemText>{problem}</ProblemText>}
      <PrimaryButton label={busy ? s.saving : s.save} onPress={submit} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
