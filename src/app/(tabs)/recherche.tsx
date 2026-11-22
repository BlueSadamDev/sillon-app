// Recherche (DESIGN.md, « Écrans du lot 1 », n° 8) : champ en haut, résultats en lignes de note
// avec les mots trouvés en gras. Ignore accents et majuscules, accepte un début de mot.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchIcon } from '@/components/icons';
import { openNotes } from '@/db/expoDb';
import { excerpt, highlight, searchTerms } from '@/notes/search';
import { SEARCH_DELAY_MS } from '@/notes/settings';
import type { Note } from '@/notes/types';
import { shortDate } from '@/texts/dates';
import { t } from '@/texts/fr';
import { colors, font, radius, space, TOUCH, type } from '@/theme';

type Results = { query: string; notes: Note[]; now: number };

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>({ query: '', notes: [], now: 0 });
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const notes = query.trim() === '' ? [] : await (await openNotes()).search(query);
      // Seule la réponse à la dernière frappe est affichée.
      if (id === request.current) setResults({ query, notes, now: Date.now() });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const terms = searchTerms(results.query);
  const now = new Date(results.now);
  const searched = results.query.trim() !== '';

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <View style={styles.top}>
        <Text accessibilityRole="header" style={type.greeting}>
          {t.search.title}
        </Text>
        <View style={styles.field}>
          <SearchIcon size={20} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search.placeholder}
            placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t.search.placeholder}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {!searched ? (
          <Text style={type.secondary}>{t.search.hint}</Text>
        ) : results.notes.length === 0 ? (
          <Text style={type.secondary}>
            {t.search.noneStart(results.query.trim())}
            <Text style={styles.relief}>{t.search.noneAction}</Text>
            {t.search.noneEnd}
          </Text>
        ) : (
          <>
            <Text style={[type.sectionLabel, styles.count]}>{t.search.count(results.notes.length)}</Text>
            {results.notes.map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.rowText}>
                  <Marked style={type.rowTitle} text={n.title || t.note.untitled} terms={terms} />
                  <Marked style={type.secondary} text={excerpt(n.body, terms)} terms={terms} />
                </View>
                <Text style={type.small}>{shortDate(n.updatedAt, now)}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Texte sur une ligne avec les mots trouvés en gras (dans la couleur du texte). */
function Marked({ text, terms, style }: { text: string; terms: string[]; style: object }) {
  if (text.length === 0) return null;
  return (
    <Text style={style} numberOfLines={1}>
      {highlight(text, terms).map((seg, i) =>
        seg.match ? (
          <Text key={i} style={styles.relief}>
            {seg.text}
          </Text>
        ) : (
          seg.text
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  top: { padding: space.screenHome, paddingBottom: 12, gap: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.capture,
  },
  input: { ...type.bodyWrite, flex: 1, minHeight: TOUCH + 4 },
  list: { paddingHorizontal: space.screenHome, paddingBottom: space.block },
  count: { paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: TOUCH + 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineList,
  },
  rowText: { flex: 1, gap: 2 },
  relief: { ...font('bold'), color: colors.ink },
  pressed: { opacity: 0.7 },
});
