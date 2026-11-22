// Banc d'essai 3 : rendu d'une note fictive (titres, gras, listes, cases, citation, liens [[ ]]).
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MarkedLexer } from 'react-native-marked';

import { BenchButton } from '@/components/Bench';
import { SAMPLE_MARKDOWN } from '@/editor/__fixtures__/sample-note';
import { MarkdownView } from '@/editor/MarkdownView';
import { prepareMarkdown } from '@/editor/markdownPrep';
import { t } from '@/texts/fr';

export default function MarkdownBench() {
  const [measure, setMeasure] = useState<string | null>(null);
  const onNoteLink = useCallback((title: string) => Alert.alert(t.markdown.noteLink(title)), []);

  const run = () => {
    // Note longue fictive : l'exemple répété 50 fois (environ 40 Kio).
    const long = Array.from({ length: 50 }, () => SAMPLE_MARKDOWN).join('\n\n');
    const t0 = Date.now();
    const tokens = MarkedLexer(prepareMarkdown(long), { gfm: true });
    setMeasure(`${(long.length / 1024).toFixed(0)} Kio : préparation + analyse en ${Date.now() - t0} ms (${tokens.length} blocs)`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.tools}>
        <BenchButton label={t.markdown.measure} onPress={run} />
        {measure ? <Text style={styles.measure}>{measure}</Text> : null}
      </View>
      <MarkdownView value={SAMPLE_MARKDOWN} onNoteLink={onNoteLink} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  tools: { paddingVertical: 12, gap: 8 },
  measure: { fontSize: 13, fontFamily: 'monospace' },
});
