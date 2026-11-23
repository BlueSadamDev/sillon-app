// Création du compte au premier lancement (DESIGN.md, « Écrans du lot 1 », n° 2).
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RestoreFlow } from '@/backup/ui/RestoreFlow';
import { Logo } from '@/components/Logo';
import { useToast } from '@/components/Toast';
import { Field, FormScreen, InfoBox, PrimaryButton, ProblemText, TextLink } from '@/components/ui';
import { t } from '@/texts/fr';
import { type } from '@/theme';

import { useAccount } from '../AccountProvider';
import { type AccountProblem, checkNewAccount } from '../rules';
import { MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH } from '../settings';

function problemText(p: AccountProblem): string {
  const m = t.account.problems[p];
  return typeof m === 'function' ? m(MIN_PASSWORD_LENGTH) : m;
}

export function CreateAccount() {
  const { createAccount } = useAccount();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Restauration d'une sauvegarde avant la création du compte (nouveau téléphone, F7).
  const [restoring, setRestoring] = useState(false);
  const [restoredDelay, setRestoredDelay] = useState<number | undefined>(undefined);
  const toast = useToast();

  async function submit() {
    const p = checkNewAccount(username, password, confirm);
    if (p) {
      setProblem(problemText(p));
      return;
    }
    setProblem(null);
    setBusy(true);
    await createAccount(username, password, restoredDelay);
  }

  if (restoring) {
    return (
      <FormScreen>
        <RestoreFlow
          mode="start"
          onDone={(content) => {
            setUsername(content.username);
            setRestoredDelay(content.settings.lockDelayMin);
            setRestoring(false);
            toast({ message: t.restore.doneAtStart });
          }}
        />
        <TextLink label={t.restore.backToAccount} onPress={() => setRestoring(false)} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <View style={styles.head}>
        <Logo size={72} />
        <Text style={type.greeting}>{t.account.welcome}</Text>
        <Text style={type.secondary}>{t.account.intro}</Text>
      </View>
      <Field
        label={t.account.username}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={MAX_USERNAME_LENGTH}
      />
      <Field
        label={t.account.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Field
        label={t.account.confirm}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        onSubmitEditing={submit}
      />
      <InfoBox>{t.account.forgotWarning}</InfoBox>
      {problem && <ProblemText>{problem}</ProblemText>}
      <PrimaryButton label={busy ? t.account.creating : t.account.create} onPress={submit} disabled={busy} />
      {restoredDelay === undefined && <TextLink label={t.account.restore} onPress={() => setRestoring(true)} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 8, marginBottom: 8 },
});
