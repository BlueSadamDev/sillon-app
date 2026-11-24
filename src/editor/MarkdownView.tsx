// Rendu Markdown en mode lecture (DESIGN.md : corps 17/400, interligne 1,6 ; citation avec trait
// vertical ; cases à cocher en couleur d'accent, touchables (lot 1.1) ; liens [[ ]] vers les autres notes).
// Le texte reste sélectionnable paragraphe par paragraphe (réglage par défaut de react-native-marked).
import { isValidElement, type ReactElement, type ReactNode, useMemo } from 'react';
import { type ImageStyle, Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import Markdown, { type MarkedStyles, Renderer, type RendererInterface } from 'react-native-marked';
import Svg, { Path, Rect } from 'react-native-svg';

import { t } from '@/texts/fr';
import { colors, font, space, TOUCH, type } from '@/theme';

import { noteTitleFromHref, prepareMarkdown, TASK_DONE, taskLineFromHref } from './markdownPrep';

type Props = {
  value: string;
  onNoteLink: (title: string) => void;
  /** Toucher une case : numéro de la ligne à cocher ou décocher dans le texte. */
  onToggleTask?: (line: number) => void;
  /** Contenu affiché au-dessus du texte (titre, tags), dans la même zone qui défile. */
  header?: ReactElement;
  /** Affiché sous le texte (bloc « Notes liées », lot 3). */
  footer?: ReactElement;
};

/** Case à cocher du mode lecture : 18 px en couleur d'accent, zone tactile de 44 × 44 px (DESIGN.md). */
function TaskBox({ done, onPress }: { done: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={t.note.tools.task}
      onPress={onPress}
      style={({ pressed }) => [md.taskBox, pressed && md.taskPressed]}>
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Rect
          x={1}
          y={1}
          width={16}
          height={16}
          rx={3}
          stroke={colors.accent}
          strokeWidth={1.8}
          fill={done ? colors.accent : 'none'}
        />
        {done && (
          <Path
            d="M5 9.5 L7.8 12.2 L13 6.5"
            stroke={colors.onAccent}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </Svg>
    </Pressable>
  );
}

class SillonRenderer extends Renderer implements RendererInterface {
  constructor(
    private readonly onNoteLink: (title: string) => void,
    private readonly onToggleTask?: (line: number) => void,
  ) {
    super();
  }

  // Les cases sont des images « sillontask: » (markdownPrep.ts) : react-native-marked les place hors
  // du texte, ce qui permet une vraie zone tactile.
  image(uri: string, alt?: string, style?: ImageStyle, title?: string): ReactNode {
    const line = taskLineFromHref(uri);
    if (line === null) return super.image(uri, alt, style, title);
    return <TaskBox key={this.getKey()} done={alt === TASK_DONE} onPress={() => this.onToggleTask?.(line)} />;
  }

  // Ligne de liste qui commence par une case : la case à gauche, le texte à droite.
  listItem(children: ReactNode[], styles?: ViewStyle): ReactNode {
    const [first, ...rest] = children;
    if (!isValidElement(first) || first.type !== TaskBox) return super.listItem(children, styles);
    return (
      <View key={this.getKey()} style={[styles, md.taskRow]}>
        {first}
        <View style={md.taskText}>{rest}</View>
      </View>
    );
  }

  blockquote(children: ReactNode[], styles?: ViewStyle): ReactNode {
    return (
      <View key={this.getKey()} style={[styles, md.quote]}>
        {children}
      </View>
    );
  }

  link(children: string | ReactNode[], href: string, styles?: TextStyle, title?: string): ReactNode {
    const note = noteTitleFromHref(href);
    if (note === null) return super.link(children, href, styles, title);
    return (
      <Text key={this.getKey()} accessibilityRole="link" style={md.noteLink} onPress={() => this.onNoteLink(note)}>
        {children}
      </Text>
    );
  }
}

export function MarkdownView({ value, onNoteLink, onToggleTask, header, footer }: Props) {
  const renderer = useMemo(() => new SillonRenderer(onNoteLink, onToggleTask), [onNoteLink, onToggleTask]);
  const prepared = useMemo(() => prepareMarkdown(value), [value]);
  return (
    <Markdown
      value={prepared}
      renderer={renderer}
      styles={markedStyles}
      theme={{ colors: { text: colors.ink, link: colors.accentText, border: colors.line, code: colors.surface } }}
      flatListProps={{
        ListHeaderComponent: header,
        ListFooterComponent: footer,
        contentContainerStyle: md.container,
        style: md.list,
        keyboardShouldPersistTaps: 'handled',
      }}
    />
  );
}

/** Hauteur d'une ligne du corps en mode lecture (17 px, interligne 1,6). */
const LINE = type.bodyRead.lineHeight;

const md = StyleSheet.create({
  list: { backgroundColor: colors.bg },
  container: { paddingHorizontal: space.screenNote, paddingBottom: 48 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.quoteBar,
    paddingLeft: 12,
    backgroundColor: 'transparent',
  },
  // La ligne prend toute la largeur laissée par la puce (sans flex: 1, la bibliothèque de listes la
  // réduit à la taille de son contenu, et le texte disparaît). La case (44 px) déborde de la ligne de
  // texte (27 px) sans l'agrandir.
  taskRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  taskBox: {
    width: TOUCH,
    height: TOUCH,
    marginVertical: -(TOUCH - LINE) / 2,
    marginLeft: -13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  taskPressed: { backgroundColor: colors.surfaceAlt },
  taskText: { flex: 1 },
  noteLink: { ...font('medium'), color: colors.accentText, textDecorationLine: 'underline' },
});

const body = type.bodyRead;
const markedStyles: MarkedStyles = {
  text: body,
  li: body,
  strong: font('bold'),
  em: { fontStyle: 'italic' },
  link: { color: colors.accentText, textDecorationLine: 'underline' },
  h1: { ...font('bold'), fontSize: 24, lineHeight: 30, color: colors.ink },
  h2: { ...font('bold'), fontSize: 20, lineHeight: 26, color: colors.ink },
  h3: { ...font('bold'), fontSize: 18, lineHeight: 24, color: colors.ink },
  codespan: { fontFamily: 'monospace', backgroundColor: colors.surfaceAlt, color: colors.inkSoft },
  codeText: { fontFamily: 'monospace', fontSize: 14, color: colors.inkSoft },
  code: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 10 },
  hr: { backgroundColor: colors.line, height: 1 },
};
