// Écran de démarrage (DESIGN.md, « Identité ») : logo 120 px, « Sillon » 36 px, phrase d'accroche.
// Affiché par l'app pendant qu'elle se prépare (ouverture de la base, lecture du compte).
import { StyleSheet, Text, View } from 'react-native';

import { Logo, Wordmark } from '@/components/Logo';
import { t } from '@/texts/fr';
import { colors, font } from '@/theme';

export function StartupScreen() {
  return (
    <View style={styles.screen}>
      <Logo size={120} />
      <Wordmark size={36} />
      <Text style={styles.tagline}>{t.brand.tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bg },
  tagline: { ...font('regular'), fontSize: 15, color: colors.inkMuted },
});
