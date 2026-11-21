import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { t } from '@/texts/fr';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#F5F1E8' } }}>
        <Stack.Screen name="index" options={{ title: t.home.title }} />
        <Stack.Screen name="essai-pcloud" options={{ title: t.pcloud.title }} />
        <Stack.Screen name="essai-chiffrement" options={{ title: t.crypto.title }} />
        <Stack.Screen name="essai-markdown" options={{ title: t.markdown.title }} />
        <Stack.Screen name="essai-embeddings" options={{ title: t.embeddings.title }} />
      </Stack>
    </>
  );
}
