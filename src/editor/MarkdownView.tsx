// Rendu Markdown en mode lecture (prototype du lot 0, sans design).
import { type ReactNode, useMemo } from 'react';
import { Text, type TextStyle } from 'react-native';
import Markdown, { Renderer, type RendererInterface } from 'react-native-marked';

import { noteTitleFromHref, prepareMarkdown, TASK_DONE, TASK_OPEN } from './markdownPrep';

type Props = { value: string; onNoteLink: (title: string) => void };

class SillonRenderer extends Renderer implements RendererInterface {
  constructor(private readonly onNoteLink: (title: string) => void) {
    super();
  }

  codespan(text: string, styles?: TextStyle): ReactNode {
    if (text === TASK_OPEN || text === TASK_DONE) {
      return (
        <Text key={this.getKey()} accessibilityRole="checkbox" accessibilityState={{ checked: text === TASK_DONE }} style={{ fontSize: 18 }}>
          {text === TASK_DONE ? '☑ ' : '☐ '}
        </Text>
      );
    }
    return super.codespan(text, styles);
  }

  link(children: string | ReactNode[], href: string, styles?: TextStyle, title?: string): ReactNode {
    const note = noteTitleFromHref(href);
    if (note === null) return super.link(children, href, styles, title);
    return (
      <Text key={this.getKey()} style={[styles, { textDecorationLine: 'underline' }]} onPress={() => this.onNoteLink(note)}>
        {children}
      </Text>
    );
  }
}

export function MarkdownView({ value, onNoteLink }: Props) {
  const renderer = useMemo(() => new SillonRenderer(onNoteLink), [onNoteLink]);
  const prepared = useMemo(() => prepareMarkdown(value), [value]);
  return <Markdown value={prepared} renderer={renderer} />;
}
