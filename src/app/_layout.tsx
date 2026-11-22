import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { AccountProvider, useAccount } from '@/account/AccountProvider';
import { CreateAccount } from '@/account/ui/CreateAccount';
import { OfferBiometrics } from '@/account/ui/OfferBiometrics';
import { Unlock } from '@/account/ui/Unlock';
import { StartupScreen } from '@/components/StartupScreen';
import { ToastProvider } from '@/components/Toast';
import { t } from '@/texts/fr';
import { colors, FONT_FILES } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  return (
    <AccountProvider>
      <StatusBar style="dark" />
      {/* Si la police ne se charge pas, l'app démarre quand même avec celle du téléphone. */}
      <ToastProvider>{fontsLoaded || fontError ? <Gate /> : <StartupScreen />}</ToastProvider>
    </AccountProvider>
  );
}

/** Choisit quoi montrer selon le compte : création, empreinte, déverrouillage ou l'app. */
function Gate() {
  const { status, offerBiometrics } = useAccount();
  // L'app n'est construite qu'après le premier déverrouillage ; ensuite, le verrou se pose par-dessus.
  const [opened, setOpened] = useState(false);
  if (status === 'unlocked' && !opened) setOpened(true);

  if (status === 'loading') return <StartupScreen />;
  if (status === 'none') return <CreateAccount />;
  if (status === 'unlocked' && offerBiometrics) return <OfferBiometrics />;
  return (
    <>
      {opened && (
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="note/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="compte" options={{ headerShown: false }} />
          <Stack.Screen name="corbeille" options={{ headerShown: false }} />
          <Stack.Screen name="essais" options={{ title: t.benches.title }} />
          <Stack.Screen name="essai-pcloud" options={{ title: t.pcloud.title }} />
          <Stack.Screen name="essai-chiffrement" options={{ title: t.crypto.title }} />
          <Stack.Screen name="essai-markdown" options={{ title: t.markdown.title }} />
          <Stack.Screen name="essai-embeddings" options={{ title: t.embeddings.title }} />
        </Stack>
      )}
      {status === 'locked' && <Unlock />}
    </>
  );
}
