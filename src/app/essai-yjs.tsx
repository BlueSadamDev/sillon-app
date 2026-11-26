// Banc d'essai du lot 7.0 : Yjs dans l'app (moteur Hermes) et branchement de l'éditeur
// (étude, sections 6.2 et 12). Textes fictifs, faux deuxième appareil en mémoire : aucun réseau.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputSelectionChangeEvent } from 'react-native';
import * as Y from 'yjs';

import { errorText } from '@/backup/folder';
import { BenchButton, BenchScreen, LogView, P } from '@/components/Bench';
import { useLog } from '@/components/useLog';
import { REMOTE_WORDS, makeFakeText } from '@/sync/essai/__fixtures__/fakeText';
import { BENCH_SIZES, describeTyping, ms, simulateTyping, stats, timed } from '@/sync/essai/yjsBench';
import { FakePeer, TextBinding, type Selection } from '@/sync/essai/yjsBinding';
import { type, colors } from '@/theme';
import { t } from '@/texts/fr';

const pause = () => new Promise((r) => setTimeout(r, 50));
const PEER_INTERVAL_MS = 2000;

type Received = { pos: Y.RelativePosition; word: string };
type Session = { binding: TextBinding; peer: FakePeer; stop: () => void; received: Received[] };

export default function YjsBench() {
  const { lines, add, clear } = useLog();
  const [busy, setBusy] = useState(false);
  const session = useRef<Session | null>(null);
  const keyTimes = useRef<number[]>([]);
  const [text, setText] = useState<string | null>(null);
  const [forced, setForced] = useState<Selection | undefined>(undefined);
  const [peerOn, setPeerOn] = useState(false);
  const [status, setStatus] = useState({ keys: 0, last: 0, p95: 0, words: 0 });

  const engine = typeof (globalThis as { HermesInternal?: unknown }).HermesInternal === 'undefined' ? 'autre que Hermes' : 'Hermes';

  const measure = async () => {
    setBusy(true);
    add(`${t.common.running} (moteur JavaScript : ${engine})`);
    try {
      for (const size of BENCH_SIZES) {
        await pause();
        for (const line of describeTyping(simulateTyping(size)).reverse()) add(line);
      }
    } catch (e) {
      add(`ÉCHEC ${errorText(e)}`);
    }
    setBusy(false);
  };

  const open = (size: number) => {
    close();
    const binding = new TextBinding();
    binding.local(makeFakeText(size));
    const peer = new FakePeer(Y.encodeStateAsUpdate(binding.doc));
    const stop = binding.onLocalUpdate((u) => peer.receive(u));
    session.current = { binding, peer, stop, received: [] };
    keyTimes.current = [];
    setStatus({ keys: 0, last: 0, p95: 0, words: 0 });
    setText(binding.text);
    add(`Éditeur d’essai ouvert : ${size} caractères`);
  };

  function close() {
    session.current?.stop();
    session.current = null;
    setPeerOn(false);
    setText(null);
  }

  const onChangeText = (next: string) => {
    const s = session.current;
    if (!s) return;
    const dt = timed(() => s.binding.local(next));
    keyTimes.current.push(dt);
    setText(next);
    setStatus((st) => ({ ...st, keys: st.keys + 1, last: dt, p95: stats(keyTimes.current).p95 }));
  };

  const onSelectionChange = (e: TextInputSelectionChangeEvent) => {
    session.current?.binding.select(e.nativeEvent.selection);
    if (forced) setForced(undefined);
  };

  // Le faux appareil insère un mot, le plus souvent avant le curseur (le cas où il pourrait sauter).
  useEffect(() => {
    if (!peerOn) return;
    const timer = setInterval(() => {
      const s = session.current;
      if (!s) return;
      const cursor = s.binding.selection.start;
      const at = Math.random() < 0.7 ? Math.floor(Math.random() * cursor) : cursor + Math.floor(Math.random() * (s.binding.text.length - cursor));
      const word = REMOTE_WORDS[Math.floor(Math.random() * REMOTE_WORDS.length)];
      const ins = s.peer.insertWord(word, at);
      const res = s.binding.applyRemote(ins.update);
      s.received.push({ pos: Y.createRelativePositionFromTypeIndex(s.binding.ytext, ins.index), word });
      setText(res.text);
      setForced(res.selection);
      setStatus((st) => ({ ...st, words: st.words + 1 }));
    }, PEER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [peerOn]);

  useEffect(() => () => session.current?.stop(), []);

  const compare = () => {
    const s = session.current;
    if (!s) return;
    const same = s.peer.text === s.binding.text && s.binding.ytext.toString() === s.binding.text;
    const k = stats(keyTimes.current);
    // Un mot reçu pendant une frappe ne doit pas être effacé par le champ (sauf si tu l'as effacé toi-même).
    const kept = s.received.filter((r) => {
      const at = Y.createAbsolutePositionFromRelativePosition(r.pos, s.binding.doc)?.index;
      return at !== undefined && s.binding.text.startsWith(r.word, at);
    }).length;
    add(`Mots reçus encore présents : ${kept} sur ${s.received.length}`);
    add(
      `Deux appareils identiques : ${same ? 'oui' : 'NON (problème !)'} ; ${keyTimes.current.length} frappes, ` +
        `médiane ${ms(k.p50)} ms, 95 % sous ${ms(k.p95)} ms, pire ${ms(k.max)} ms ; ` +
        `état Yjs ${(Y.encodeStateAsUpdate(s.binding.doc).length / 1024).toFixed(0)} Kio`,
    );
  };

  return (
    <BenchScreen>
      <P>{t.yjsBench.intro}</P>
      <BenchButton label={t.yjsBench.measure} onPress={measure} disabled={busy} />
      {text === null ? (
        BENCH_SIZES.map((size) => (
          <BenchButton key={size} label={t.yjsBench.open(size.toLocaleString('fr-FR'))} onPress={() => open(size)} disabled={busy} />
        ))
      ) : (
        <>
          <P>{t.yjsBench.status(status.keys, ms(status.last), ms(status.p95), status.words)}</P>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            onSelectionChange={onSelectionChange}
            selection={forced}
            multiline
            textAlignVertical="top"
            style={[type.bodyWrite, styles.input]}
          />
          <BenchButton label={peerOn ? t.yjsBench.peerOff : t.yjsBench.peerOn} onPress={() => setPeerOn(!peerOn)} />
          <BenchButton label={t.yjsBench.compare} onPress={compare} />
          <BenchButton label={t.yjsBench.close} onPress={close} />
        </>
      )}
      <BenchButton label={t.common.clearLog} onPress={clear} disabled={busy} />
      <LogView lines={lines} />
    </BenchScreen>
  );
}

const styles = StyleSheet.create({
  input: { height: 320, borderWidth: 1, borderColor: colors.inkMuted, borderRadius: 10, padding: 10 },
});
