// Recherche (DESIGN.md, « Écrans du lot 1 », n° 8) : champ en haut, résultats en lignes de note
// avec les mots trouvés en gras. Ignore accents et majuscules, accepte un début de mot.
// Lot 3 : sous les résultats par mots, les notes proches par le sens (sans répéter les premières).
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSemantic } from '@/ai/SemanticProvider';
import { SEMANTIC_SEARCH } from '@/ai/settings';
import { SearchIcon } from '@/components/icons';
import { SectionLabel } from '@/components/notes';
import { openNotes } from '@/db/expoDb';
import { excerpt, highlight, searchTerms } from '@/notes/search';
import { SEARCH_DELAY_MS } from '@/notes/settings';
import type { Note } from '@/notes/types';
import { shortDate } from '@/texts/dates';
import { t } from '@/texts/fr';
import { colors, font, radius, space, TOUCH, type } from '@/theme';

type Results = { query: string; notes: Note[]; now: number };
type Sense =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'absent' }
  | { kind: 'failed' }
  | { kind: 'ready'; query: string; notes: Note[] };

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>({ query: '', notes: [], now: 0 });
  const request = useRef(0);
  const semantic = useSemantic();
  const { search: searchBySense } = semantic;
  const [senseState, setSense] = useState<Sense>({ kind: 'idle' });
  const senseRequest = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const notes = query.trim() === '' ? [] : await (await openNotes()).search(query);
      // Seule la réponse à la dernière frappe est affichée.
      if (id === request.current) setResults({ query, notes, now: Date.now() });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Par le sens : après une courte pause de frappe, une fois les résultats par mots connus.
  useEffect(() => {
    const id = ++senseRequest.current;
    const q = results.query.trim();
    if (q.length < SEMANTIC_SEARCH.minChars) return;
    const timer = setTimeout(async () => {
      setSense({ kind: 'running' });
      try {
        const answer = await searchBySense(q, results.notes.map((n) => n.id));
        if (id !== senseRequest.current) return;
        if (answer.kind !== 'ready') return setSense({ kind: answer.kind === 'absent' ? 'absent' : 'running' });
        const repo = await openNotes();
        const notes = (await Promise.all(answer.notes.map((r) => repo.get(r.id)))).filter((n) => n !== null);
        if (id === senseRequest.current) setSense({ kind: 'ready', query: q, notes });
      } catch {
        if (id === senseRequest.current) setSense({ kind: 'failed' });
      }
    }, SEMANTIC_SEARCH.typingPauseMs);
    return () => clearTimeout(timer);
  }, [results, searchBySense]);

  const terms = searchTerms(results.query);
  const now = new Date(results.now);
  const searched = results.query.trim() !== '';
  // Recherche trop courte : pas de partie « Par le sens ».
  const sense: Sense = results.query.trim().length < SEMANTIC_SEARCH.minChars ? { kind: 'idle' } : senseState;

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
        {searched && sense.kind !== 'idle' && <SectionLabel>{t.semantic.byWords}</SectionLabel>}
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
        {searched && sense.kind !== 'idle' && (
          <View style={styles.sense}>
            <SectionLabel>{t.semantic.bySense}</SectionLabel>
            {sense.kind === 'absent' && (
              <Text style={type.secondary}>
                {t.semantic.senseAbsent}
                <Text accessibilityRole="link" onPress={() => router.push('/modele')} style={styles.relief}>
                  {t.semantic.senseAbsentAction}
                </Text>
              </Text>
            )}
            {sense.kind === 'running' && <Text style={type.secondary}>{t.semantic.senseRunning}</Text>}
            {sense.kind === 'failed' && <Text style={type.secondary}>{t.semantic.senseFailed}</Text>}
            {sense.kind === 'ready' && semantic.indexing && (
              <Text style={type.secondary}>{t.semantic.senseIndexing(semantic.progress.done, semantic.progress.total)}</Text>
            )}
            {sense.kind === 'ready' && sense.notes.length === 0 && (
              <Text style={type.secondary}>{t.semantic.senseNone}</Text>
            )}
            {sense.kind === 'ready' &&
              sense.notes.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={styles.rowText}>
                    <Text style={type.rowTitle} numberOfLines={1}>
                      {n.title || t.note.untitled}
                    </Text>
                    {n.body.trim() !== '' && (
                      <Text style={type.secondary} numberOfLines={1}>
                        {excerpt(n.body, [])}
                      </Text>
                    )}
                  </View>
                  <Text style={type.small}>{shortDate(n.updatedAt, now)}</Text>
                </Pressable>
              ))}
          </View>
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
  sense: { paddingTop: space.block, gap: 4 },
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
