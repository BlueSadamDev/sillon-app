// Rendu Markdown en mode lecture (DESIGN.md : corps 17/400, interligne 1,6 ; citation avec trait
// vertical ; cases à cocher en couleur d'accent ; liens [[ ]] vers les autres notes).
import { type ReactElement, type ReactNode, useMemo } from 'react';
import { StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import Markdown, { type MarkedStyles, Renderer, type RendererInterface } from 'react-native-marked';

import { colors, font, space, type } from '@/theme';

import { noteTitleFromHref, prepareMarkdown, TASK_DONE, TASK_OPEN } from './markdownPrep';

type Props = {
  value: string;
  onNoteLink: (title: string) => void;
  /** Contenu affiché au-dessus du texte (titre, tags), dans la même zone qui défile. */
  header?: ReactElement;
};

class SillonRenderer extends Renderer implements RendererInterface {
  constructor(private readonly onNoteLink: (title: string) => void) {
    super();
  }

  codespan(text: string, styles?: TextStyle): ReactNode {
    if (text === TASK_OPEN || text === TASK_DONE) {
      const done = text === TASK_DONE;
      return (
        <Text
          key={this.getKey()}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          style={done ? md.taskDone : md.taskOpen}>
          {done ? '☑ ' : '☐ '}
        </Text>
      );
    }
    return super.codespan(text, styles);
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

export function MarkdownView({ value, onNoteLink, header }: Props) {
  const renderer = useMemo(() => new SillonRenderer(onNoteLink), [onNoteLink]);
  const prepared = useMemo(() => prepareMarkdown(value), [value]);
  return (
    <Markdown
      value={prepared}
      renderer={renderer}
      styles={markedStyles}
      theme={{ colors: { text: colors.ink, link: colors.accentText, border: colors.line, code: colors.surface } }}
      flatListProps={{
        ListHeaderComponent: header,
        contentContainerStyle: md.container,
        style: md.list,
        keyboardShouldPersistTaps: 'handled',
      }}
    />
  );
}

const md = StyleSheet.create({
  list: { backgroundColor: colors.bg },
  container: { paddingHorizontal: space.screenNote, paddingBottom: 48 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.quoteBar,
    paddingLeft: 12,
    backgroundColor: 'transparent',
  },
  taskOpen: { fontSize: 18, color: colors.accent },
  taskDone: { fontSize: 18, color: colors.accent },
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
