// Partager la note (F10, lot 2.1 ; DESIGN.md, « Partager la note ») : format (texte, fichier Markdown,
// PDF), option « Inclure les sous-notes » si la note en a, rappel en une phrase, bouton « Partager ».
// Le menu de partage d'Android s'ouvre ensuite ; aucun accès à Internet.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { CheckIcon } from '@/components/icons';
import { FormScreen, InfoBox, PrimaryButton, ProblemText } from '@/components/ui';
import { openNotes } from '@/db/expoDb';
import { shareableChildCount } from '@/share/content';
import { shareNote, type ShareFormat } from '@/share/send';
import { t } from '@/texts/fr';
import { colors, radius, TOUCH, type } from '@/theme';

const FORMATS: ShareFormat[] = ['text', 'markdown', 'pdf'];

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = t.share;
  const [format, setFormat] = useState<ShareFormat>('text');
  const [children, setChildren] = useState(0);
  const [withChildren, setWithChildren] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const count = shareableChildCount(id, await (await openNotes()).exportAll());
      if (alive) setChildren(count);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function share() {
    setProblem(null);
    setBusy(true);
    const result = await shareNote(id, format, children > 0 && withChildren);
    setBusy(false);
    if (!result.ok) setProblem(result.problem === 'failed-pdf' ? s.failedPdf : s.failed);
  }

  return (
    <View style={styles.fill}>
      <FormScreen top>
        <View style={styles.back}>
          <BackHeader />
        </View>
        <Text accessibilityRole="header" style={type.noteTitle}>
          {s.title}
        </Text>

        <View accessibilityRole="radiogroup" accessibilityLabel={s.format} style={styles.group}>
          <Text style={type.sectionLabel}>{s.format}</Text>
          {FORMATS.map((f) => {
            const selected = f === format;
            return (
              <Pressable
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setFormat(f)}
                style={[styles.option, selected && styles.optionOn]}>
                <View style={styles.optionText}>
                  <Text style={type.rowTitle}>{s.formats[f].label}</Text>
                  <Text style={type.secondary}>{s.formats[f].hint}</Text>
                </View>
                <View style={styles.mark}>{selected && <CheckIcon size={20} />}</View>
              </Pressable>
            );
          })}
        </View>

        {children > 0 && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: withChildren }}
            onPress={() => setWithChildren((v) => !v)}
            style={styles.checkRow}>
            <View style={[styles.box, withChildren && styles.boxOn]}>
              {withChildren && <CheckIcon size={14} color={colors.onAccent} />}
            </View>
            <View style={styles.optionText}>
              <Text style={type.rowTitle}>{s.withChildren(children)}</Text>
              <Text style={type.secondary}>{s.withChildrenHint}</Text>
            </View>
          </Pressable>
        )}

        <InfoBox>{s.warning}</InfoBox>
        {problem && <ProblemText>{problem}</ProblemText>}
        <PrimaryButton label={busy ? s.preparing : s.button} onPress={share} disabled={busy} />
      </FormScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: { marginHorizontal: -16 },
  group: { gap: 8 },
  option: {
    minHeight: TOUCH + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
  },
  optionOn: { backgroundColor: colors.surfaceAlt },
  optionText: { flex: 1, gap: 2 },
  mark: { width: 24, alignItems: 'center' },
  checkRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.8,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.accent },
});
