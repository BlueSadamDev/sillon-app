// Écran d'attente pour une partie qui arrive dans une prochaine étape (une phrase, sans erreur).
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space, type } from '@/theme';

export function SoonScreen({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <View style={styles.screen}>
        <Text accessibilityRole="header" style={type.greeting}>
          {title}
        </Text>
        <Text style={type.secondary}>{text}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: space.screenHome, gap: 12 },
});
