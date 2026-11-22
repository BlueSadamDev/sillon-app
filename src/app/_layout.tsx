import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { t } from '@/texts/fr';
import { colors } from '@/theme';

export default function RootLayout() {
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
