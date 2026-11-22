// Changer le mot de passe du compte (écran Compte, groupe Sécurité).
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAccount } from '@/account/AccountProvider';
import { checkNewPassword } from '@/account/rules';
import { MIN_PASSWORD_LENGTH } from '@/account/settings';
import { BackHeader } from '@/components/BackHeader';
import { useToast } from '@/components/Toast';
import { Field, FormScreen, PrimaryButton, ProblemText } from '@/components/ui';
import { t } from '@/texts/fr';
import { type } from '@/theme';

export default function ChangePassword() {
  const { changePassword } = useAccount();
  const toast = useToast();
  const p = t.passwordScreen;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const issue = checkNewPassword(next, confirm);
    if (issue === 'password-short') return setProblem(t.account.problems['password-short'](MIN_PASSWORD_LENGTH));
    if (issue === 'password-mismatch') return setProblem(t.account.problems['password-mismatch']);
    setProblem(null);
    setBusy(true);
    const ok = await changePassword(current, next);
    setBusy(false);
    if (!ok) {
      setCurrent('');
      return setProblem(p.wrongCurrent);
    }
    toast({ message: p.done });
    router.back();
  }

  return (
    <View style={styles.fill}>
      <FormScreen top>
        <View style={styles.back}>
          <BackHeader />
        </View>
        <Text accessibilityRole="header" style={type.noteTitle}>
          {p.title}
        </Text>
        <Field label={p.current} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" />
        <Field
          label={p.next}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <Field
          label={p.confirm}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          onSubmitEditing={submit}
        />
        {problem && <ProblemText>{problem}</ProblemText>}
        <PrimaryButton label={busy ? p.saving : p.save} onPress={submit} disabled={busy} />
      </FormScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { marginHorizontal: -16 },
});
