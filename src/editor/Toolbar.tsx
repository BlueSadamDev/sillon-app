// Barre d'outils Markdown (DESIGN.md) : boutons 44 × 44 transparents, et à droite le bouton
// principal « Lire » / « Écrire ». Fond surface, bordure haute line.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { t } from '@/texts/fr';
import { colors, font, radius, TOUCH } from '@/theme';

import type { Action } from './format';

function Glyph({ action }: { action: Action }) {
  const c = colors.ink;
  const s = { stroke: c, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  switch (action) {
    case 'heading':
      return <Text style={[styles.letter, font('bold')]}>H</Text>;
    case 'bold':
      return <Text style={[styles.letter, font('bold')]}>B</Text>;
    case 'italic':
      return <Text style={[styles.letter, styles.italic]}>I</Text>;
    case 'list':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M9 6.5 H20 M9 12 H20 M9 17.5 H20 M4.5 6.5 H5 M4.5 12 H5 M4.5 17.5 H5" {...s} />
        </Svg>
      );
    case 'task':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Rect x={4} y={4} width={16} height={16} rx={3} {...s} />
          <Path d="M8 12.5 L11 15.5 L16.5 9" {...s} />
        </Svg>
      );
    case 'link':
      return <Text style={[styles.letter, font('bold')]}>[[ ]]</Text>;
  }
}

const ACTIONS: Action[] = ['heading', 'bold', 'italic', 'list', 'task', 'link'];

type Props = { mode: 'write' | 'read'; onAction: (a: Action) => void; onToggle: () => void; bottom: number };

export function Toolbar({ mode, onAction, onToggle, bottom }: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: bottom }]}>
      {mode === 'write' ? (
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} style={styles.tools}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a}
              accessibilityRole="button"
              accessibilityLabel={t.note.tools[a]}
              onPress={() => onAction(a)}
              style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
              <Glyph action={a} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.tools} />
      )}
      <Pressable accessibilityRole="button" onPress={onToggle} style={({ pressed }) => [styles.toggle, pressed && styles.dim]}>
        <Text style={styles.toggleText}>{mode === 'write' ? t.note.read : t.note.write}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tools: { flex: 1 },
  tool: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.chip },
  pressed: { backgroundColor: colors.surfaceAlt },
  letter: { fontSize: 17, color: colors.ink },
  italic: { fontStyle: 'italic' },
  toggle: {
    minHeight: TOUCH,
    paddingHorizontal: 18,
    marginVertical: 4,
    marginLeft: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { ...font('bold'), fontSize: 15, color: colors.onAccent },
  dim: { opacity: 0.7 },
});
