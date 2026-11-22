// Archives : notes retirées de l'accueil, gardées sans limite de durée, toujours dans la recherche.
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { useNotesQuery } from '@/db/useNotes';
import { excerpt } from '@/notes/search';
import type { Note } from '@/notes/types';
import { t } from '@/texts/fr';
import { colors, space, TOUCH, type } from '@/theme';

export default function Archives() {
  const [notes] = useNotesQuery((repo) => repo.archived(), [] as Note[]);
  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <BackHeader />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text accessibilityRole="header" style={type.greeting}>
          {t.archives.title}
        </Text>
        <Text style={type.secondary}>{t.archives.intro}</Text>
        {notes.length === 0 ? (
          <Text style={type.secondary}>{t.archives.empty}</Text>
        ) : (
          <View>
            {notes.map((n) => {
              const extract = excerpt(n.body, []);
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <Text style={type.rowTitle} numberOfLines={1}>
                    {n.title || t.note.untitled}
                  </Text>
                  {extract.length > 0 && (
                    <Text style={type.secondary} numberOfLines={1}>
                      {extract}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  screen: { paddingHorizontal: space.screenHome, paddingBottom: space.block, gap: 12 },
  row: {
    minHeight: TOUCH + 12,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineList,
  },
  pressed: { opacity: 0.7 },
});
