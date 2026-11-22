// Corbeille (cahier des charges, F6) : notes gardées 30 jours, restaurables ou effaçables.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackIcon } from '@/components/icons';
import { Sheet, SheetItem } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { notesChanged } from '@/db/events';
import { openNotes } from '@/db/expoDb';
import { useNotesQuery } from '@/db/useNotes';
import { daysLeft } from '@/notes/trash';
import type { Note } from '@/notes/types';
import { t } from '@/texts/fr';
import { colors, space, TOUCH, type } from '@/theme';

export default function Trash() {
  const [{ notes, now }] = useNotesQuery(async (repo) => ({ notes: await repo.trashed(), now: Date.now() }), {
    notes: [] as Note[],
    now: 0,
  });
  const [picked, setPicked] = useState<Note | null>(null);
  const toast = useToast();

  async function restore(note: Note) {
    setPicked(null);
    await (await openNotes()).restore(note.id);
    notesChanged();
    toast({ message: t.trash.restored });
  }

  function confirmDelete(note: Note) {
    setPicked(null);
    Alert.alert(t.trash.confirmTitle, t.trash.confirmText, [
      { text: t.trash.cancel, style: 'cancel' },
      {
        text: t.trash.confirm,
        style: 'destructive',
        onPress: async () => {
          await (await openNotes()).deleteForever(note.id);
          notesChanged();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.note.back} onPress={() => router.back()} style={styles.icon}>
          <BackIcon />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.screen}>
        <Text accessibilityRole="header" style={type.greeting}>
          {t.trash.title}
        </Text>
        <Text style={type.secondary}>{t.trash.intro}</Text>
        {notes.length === 0 ? (
          <Text style={type.secondary}>{t.trash.empty}</Text>
        ) : (
          <View>
            {notes.map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                onPress={() => setPicked(n)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Text style={[type.rowTitle, styles.grow]} numberOfLines={1}>
                  {n.title || t.note.untitled}
                </Text>
                <Text style={type.small}>{t.trash.daysLeft(daysLeft(n.deletedAt ?? now, now))}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <Sheet visible={picked !== null} title={picked?.title || t.note.untitled} onClose={() => setPicked(null)}>
        {picked && (
          <>
            <SheetItem label={t.trash.restore} onPress={() => restore(picked)} />
            <SheetItem label={t.trash.deleteForever} onPress={() => confirmDelete(picked)} />
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  headerBar: { flexDirection: 'row', paddingHorizontal: 8 },
  icon: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  screen: { paddingHorizontal: space.screenHome, paddingBottom: space.block, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: TOUCH + 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineList,
  },
  grow: { flex: 1 },
  pressed: { opacity: 0.7 },
});
