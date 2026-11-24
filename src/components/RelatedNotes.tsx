// Bloc « Notes liées » en bas d'une note (DESIGN.md, « Composants », lot 3) : carte surface, libellé
// avec l'icône de pousse, puces cliquables. États : modèle absent, calcul en cours, aucune note proche.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type SemanticAnswer, useSemantic } from '@/ai/SemanticProvider';
import { SproutIcon } from '@/components/icons';
import { openNotes } from '@/db/expoDb';
import { t } from '@/texts/fr';
import { colors, font, radius, space, TOUCH, type } from '@/theme';

type Linked = { id: string; title: string };
type View_ = { kind: 'loading' } | Exclude<SemanticAnswer, { kind: 'ready' }> | { kind: 'ready'; notes: Linked[] };

export function RelatedNotes({ noteId }: { noteId: string }) {
  const semantic = useSemantic();
  const { related, version } = semantic;
  const [state, setState] = useState<View_>({ kind: 'loading' });
  const s = t.semantic;

  useEffect(() => {
    let alive = true;
    (async () => {
      const answer = await related(noteId);
      if (answer.kind !== 'ready') {
        if (alive) setState(answer);
        return;
      }
      const repo = await openNotes();
      const notes = await Promise.all(answer.notes.map((r) => repo.get(r.id)));
      if (alive)
        setState({
          kind: 'ready',
          notes: notes.filter((n) => n !== null).map((n) => ({ id: n.id, title: n.title || t.note.untitled })),
        });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [noteId, related, version]);

  if (state.kind === 'loading') return null;

  return (
    <View style={styles.card}>
      <View style={styles.label}>
        <SproutIcon size={18} color={colors.inkMuted} />
        <Text accessibilityRole="header" style={type.sectionLabel}>
          {s.related}
        </Text>
      </View>
      {state.kind === 'absent' && (
        <Text style={type.secondary}>
          {s.relatedAbsent}
          <Text accessibilityRole="link" onPress={() => router.push('/modele')} style={styles.relief}>
            {s.relatedAbsentAction}
          </Text>
        </Text>
      )}
      {state.kind === 'pending' && <Text style={type.secondary}>{s.relatedPending}</Text>}
      {state.kind === 'ready' && state.notes.length === 0 && <Text style={type.secondary}>{s.relatedNone}</Text>}
      {state.kind === 'ready' && state.notes.length > 0 && (
        <View style={styles.chips}>
          {state.notes.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="link"
              accessibilityLabel={s.relatedOpen(n.title)}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id } })}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Text style={styles.chipText} numberOfLines={1}>
                {n.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: space.block,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  relief: { ...font('bold'), color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: TOUCH,
    maxWidth: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.chip,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  chipText: { ...font('regular'), fontSize: 13, color: colors.ink },
});
