// Éléments de l'accueil et des listes (DESIGN.md, « Composants ») : capture rapide, carte d'insight,
// carte épinglée, ligne de note, titre de section.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PlusIcon } from '@/components/icons';
import { excerpt } from '@/notes/search';
import type { Note } from '@/notes/types';
import { shortDate } from '@/texts/dates';
import { t } from '@/texts/fr';
import { colors, radius, space, TOUCH, type } from '@/theme';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={type.sectionLabel}>
      {children}
    </Text>
  );
}

/** Champ de capture rapide : le premier geste de l'accueil. */
export function QuickCapture({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy || text.trim().length === 0) return;
    setBusy(true);
    await onSubmit(text);
    setText('');
    setBusy(false);
  }
  return (
    <View style={styles.capture}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t.home.capturePlaceholder}
        placeholderTextColor={colors.inkMuted}
        accessibilityLabel={t.home.capturePlaceholder}
        multiline
        style={styles.captureInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.home.captureButton}
        onPress={submit}
        disabled={busy}
        style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}>
        <PlusIcon size={22} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

/** Carte d'insight : la seule carte foncée de l'écran, réservée à l'IA. */
export function InsightCard({ text }: { text: string }) {
  return (
    <View style={styles.insight}>
      <Text style={type.insightLabel}>{t.home.insightLabel}</Text>
      <Text style={type.insight}>{text}</Text>
    </View>
  );
}

export function PinnedCard({ note, onPress }: { note: Note & { childCount: number }; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pinned, pressed && styles.pressed]}>
      <Text style={type.cardTitle} numberOfLines={2}>
        {note.title || t.note.untitled}
      </Text>
      {note.childCount > 0 && <Text style={type.small}>{t.home.subnotes(note.childCount)}</Text>}
    </Pressable>
  );
}

export function NoteRow({ note, now, onPress }: { note: Note; now: Date; onPress: () => void }) {
  const extract = excerpt(note.body, []);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowText}>
        <Text style={type.rowTitle} numberOfLines={1}>
          {note.title || t.note.untitled}
        </Text>
        {extract.length > 0 && (
          <Text style={type.secondary} numberOfLines={1}>
            {extract}
          </Text>
        )}
      </View>
      <Text style={type.small}>{shortDate(note.updatedAt, now)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capture: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 8,
    paddingLeft: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.capture,
  },
  captureInput: { ...type.bodyWrite, flex: 1, minHeight: TOUCH, maxHeight: 160, paddingVertical: 10 },
  captureButton: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insight: { backgroundColor: colors.ink, borderRadius: radius.insight, padding: 20, gap: 10 },
  pinned: {
    flex: 1,
    minHeight: 84,
    padding: 14,
    gap: 6,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
  },
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
  pressed: { opacity: 0.7 },
});

export const listGap = space.grid;
