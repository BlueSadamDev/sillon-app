// Déverrouillage (DESIGN.md, n° 4) : empreinte demandée tout de suite si elle est activée,
// sinon (ou au choix) mot de passe. Posé par-dessus l'app, pour retrouver la note en cours ensuite.
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { Field, FormScreen, PrimaryButton, ProblemText, SecondaryButton } from '@/components/ui';
import { t } from '@/texts/fr';
import { colors, type } from '@/theme';

import { useAccount } from '../AccountProvider';

export function Unlock() {
  const { username, biometrics, unlockWithBiometrics, unlockWithPassword } = useAccount();
  const [mode, setMode] = useState<'biometrics' | 'password'>(biometrics ? 'biometrics' : 'password');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState(false);
  const [busy, setBusy] = useState(false);

  // Empreinte demandée une seule fois, à l'affichage de l'écran.
  const asked = useRef(false);
  useEffect(() => {
    if (mode === 'biometrics' && !asked.current) {
      asked.current = true;
      unlockWithBiometrics();
    }
  }, [mode, unlockWithBiometrics]);

  // Le bouton « retour » d'Android ne doit pas passer sous l'écran verrouillé.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  async function submit() {
    if (password.length === 0) return;
    setBusy(true);
    const ok = await unlockWithPassword(password);
    setBusy(false);
    setPassword('');
    setProblem(!ok);
  }

  return (
    <View style={styles.cover}>
      <FormScreen>
        <View style={styles.head}>
          <Logo size={72} />
          <Text style={type.greeting}>{t.account.hello(username)}</Text>
        </View>
        {mode === 'password' ? (
          <>
            <Field
              label={t.account.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={submit}
            />
            {problem && <ProblemText>{t.account.wrongPassword}</ProblemText>}
            <PrimaryButton label={busy ? t.account.checking : t.account.unlock} onPress={submit} disabled={busy} />
            {biometrics && <SecondaryButton label={t.account.useBiometrics} onPress={unlockWithBiometrics} />}
          </>
        ) : (
          <>
            <PrimaryButton label={t.account.useBiometrics} onPress={unlockWithBiometrics} />
            <SecondaryButton label={t.account.usePassword} onPress={() => setMode('password')} />
          </>
        )}
      </FormScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  head: { alignItems: 'center', gap: 10, marginBottom: 12 },
});
