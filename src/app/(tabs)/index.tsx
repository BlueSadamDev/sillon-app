// Accueil (DESIGN.md, « Écrans du lot 1 », n° 5).
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccount } from '@/account/AccountProvider';
import { InsightCard, NoteRow, PinnedCard, QuickCapture, SectionLabel } from '@/components/notes';
import { notesChanged } from '@/db/events';
import { openNotes } from '@/db/expoDb';
import { useNotesQuery } from '@/db/useNotes';
import { splitCapture } from '@/notes/capture';
import { greeting, longDate } from '@/texts/dates';
import { t } from '@/texts/fr';
import { colors, font, space, TOUCH, type } from '@/theme';

export default function Home() {
  const { username } = useAccount();
  const [data] = useNotesQuery(
    async (repo) => ({ pinned: await repo.pinned(), recent: await repo.recent() }),
    { pinned: [], recent: [] },
  );
  const now = new Date();
  const empty = data.recent.length === 0;
  const pairs = [];
  for (let i = 0; i < data.pinned.length; i += 2) pairs.push(data.pinned.slice(i, i + 2));

  async function capture(text: string) {
    const parts = splitCapture(text);
    if (!parts) return;
    const repo = await openNotes();
    const note = await repo.create({ title: parts.title, body: parts.body });
    if (parts.openEditor) router.push({ pathname: '/note/[id]', params: { id: note.id, mode: 'write' } });
    else notesChanged();
  }

  const open = (id: string) => router.push({ pathname: '/note/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={type.secondary}>{longDate(now)}</Text>
            <Text style={type.greeting}>{greeting(now)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.home.account(username)}
            onPress={() => router.push('/compte')}
            style={styles.avatar}>
            <Text style={styles.avatarText}>{username.slice(0, 1).toLocaleUpperCase('fr')}</Text>
          </Pressable>
        </View>

        <QuickCapture onSubmit={capture} />
        <InsightCard text={t.home.insightWaiting} />

        {data.pinned.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>{t.home.pinned}</SectionLabel>
            {pairs.map((pair) => (
              <View key={pair[0].id} style={styles.pair}>
                {pair.map((n) => (
                  <PinnedCard key={n.id} note={n} onPress={() => open(n.id)} />
                ))}
                {pair.length === 1 && <View style={styles.fill} />}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>{t.home.recent}</SectionLabel>
          {empty ? (
            <Text style={type.secondary}>{t.home.empty}</Text>
          ) : (
            <View>
              {data.recent.map((n) => (
                <NoteRow key={n.id} note={n} now={now} onPress={() => open(n.id)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: space.screenHome, gap: space.block },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  avatar: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...font('bold'), fontSize: 17, color: colors.ink },
  section: { gap: space.grid },
  pair: { flexDirection: 'row', gap: space.grid },
});
