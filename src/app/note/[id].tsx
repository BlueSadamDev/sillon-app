// Note (DESIGN.md, n° 6). Étape 4 : lecture seule ; l'éditeur arrive à l'étape 5.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackIcon } from '@/components/icons';
import { useNotesQuery } from '@/db/useNotes';
import { MarkdownView } from '@/editor/MarkdownView';
import { openNotes } from '@/db/expoDb';
import { t } from '@/texts/fr';
import { colors, space, TOUCH, type } from '@/theme';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note] = useNotesQuery((repo) => repo.get(id), null);
  const onNoteLink = useCallback(async (title: string) => {
    const target = await (await openNotes()).findByTitle(title);
    if (target) router.push({ pathname: '/note/[id]', params: { id: target.id } });
  }, []);

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.note.back} onPress={() => router.back()} style={styles.back}>
          <BackIcon />
        </Pressable>
      </View>
      {note && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={type.noteTitle}>{note.title || t.note.untitled}</Text>
          <MarkdownView value={note.body} onNoteLink={onNoteLink} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space.screenNote, paddingBottom: space.block, gap: 14 },
});
