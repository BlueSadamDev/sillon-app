import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { StartupScreen } from '@/components/StartupScreen';
import { t } from '@/texts/fr';
import { colors, FONT_FILES } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // Si la police ne se charge pas, l'app démarre quand même avec celle du téléphone.
  if (!fontsLoaded && !fontError) return <StartupScreen />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" options={{ title: t.home.title }} />
        <Stack.Screen name="essai-pcloud" options={{ title: t.pcloud.title }} />
        <Stack.Screen name="essai-chiffrement" options={{ title: t.crypto.title }} />
        <Stack.Screen name="essai-markdown" options={{ title: t.markdown.title }} />
        <Stack.Screen name="essai-embeddings" options={{ title: t.embeddings.title }} />
      </Stack>
    </>
  );
}
