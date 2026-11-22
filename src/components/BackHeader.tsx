// En-tête simple avec le bouton retour.
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackIcon } from '@/components/icons';
import { t } from '@/texts/fr';
import { TOUCH } from '@/theme';

export function BackHeader() {
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.note.back} onPress={() => router.back()} style={styles.icon}>
        <BackIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: 8 },
  icon: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
});
