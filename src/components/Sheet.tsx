// Menu qui monte du bas de l'écran (menu « … » d'une note, choix de la note où ranger).
import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/texts/fr';
import { colors, font, radius, space, TOUCH, type } from '@/theme';

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title?: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.note.cancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        {title && <Text style={[type.sectionLabel, styles.title]}>{title}</Text>}
        <ScrollView>{children}</ScrollView>
        <SheetItem label={t.note.cancel} onPress={onClose} muted />
      </View>
    </Modal>
  );
}

export function SheetItem({ label, onPress, indent = 0, muted }: { label: string; onPress: () => void; indent?: number; muted?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, { paddingLeft: space.screenHome + indent * 18 }, pressed && styles.pressed]}>
      <Text style={[styles.itemText, muted && styles.muted]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(29, 27, 23, 0.25)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.insight,
    borderTopRightRadius: radius.insight,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 10,
  },
  title: { paddingHorizontal: space.screenHome, paddingVertical: 10 },
  item: { minHeight: TOUCH + 6, justifyContent: 'center', paddingRight: space.screenHome },
  itemText: { ...font('medium'), fontSize: 15, color: colors.ink },
  muted: { color: colors.inkMuted },
  pressed: { backgroundColor: colors.surfaceAlt },
});
