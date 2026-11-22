// Banc d'essai 4 : vitesse et qualité d'un modèle d'embeddings (GGUF, llama.rn) en français.
import { useState } from 'react';
import { View } from 'react-native';

import { FIXTURE_NOTES, FIXTURE_QUERIES } from '@/ai/__fixtures__/notes-fr';
import { embed, loadEmbedder, needsAppRestart, releaseEmbedder, type LoadedEmbedder } from '@/ai/embedder';
import { deleteModel, importModel, listModels, type StoredModel } from '@/ai/modelStore';
import { BENCH_TOP_K, EMBEDDING_ENGINE, familyForFile } from '@/ai/settings';
import { evaluate } from '@/ai/similarity';
import { errorText } from '@/backup/folder';
import { BenchButton, BenchScreen, LogView, P } from '@/components/Bench';
import { useLog } from '@/components/useLog';
import { t } from '@/texts/fr';

const mo = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} Mo`;
const pause = () => new Promise((r) => setTimeout(r, 50));

export default function EmbeddingsBench() {
  const { lines, add, clear } = useLog();
  const [models, setModels] = useState<StoredModel[]>(() => listModels());
  const [busy, setBusy] = useState(false);

  const doImport = async () => {
    setBusy(true);
    add('Import : choisis le fichier…');
    try {
      const res = await importModel();
      if (res.kind === 'installed') {
        add(`Import OK : ${res.model.name}, ${mo(res.model.sizeBytes)} ; SHA-256 ${res.sha256} (${res.hashMs} ms) ; copie ${res.copyMs} ms`);
      } else if (res.kind === 'refused') {
        add(`Import refusé : ${res.reason}`);
      } else {
        add('Import annulé');
      }
    } catch (e) {
      add(`Import : ÉCHEC ${errorText(e)}`);
    }
    setModels(listModels());
    setBusy(false);
  };

  const run = async (model: StoredModel) => {
    if (needsAppRestart(model.uri)) {
      add(t.embeddings.restart);
      return;
    }
    setBusy(true);
    const family = familyForFile(model.name);
    add(`Mesure : ${model.name} (${mo(model.sizeBytes)}), famille ${family.label}, ${EMBEDDING_ENGINE.threads} cœurs`);
    await pause();
    let e: LoadedEmbedder | null = null;
    try {
      e = await loadEmbedder(model.uri);
      add(`  chargement : ${e.loadMs} ms ; ${e.description}`);
      // Premier calcul à part : il inclut des préparations internes du moteur.
      const warm = await embed(e, `${family.documentPrefix}Bonjour.`);
      add(`  premier calcul (échauffement) : ${warm.ms} ms ; dimension ${warm.vector.length}`);

      const docs: { id: string; vector: number[] }[] = [];
      const docMs: number[] = [];
      for (const n of FIXTURE_NOTES) {
        const r = await embed(e, `${family.documentPrefix}${n.title}\n${n.body}`);
        docs.push({ id: n.id, vector: r.vector });
        docMs.push(r.ms);
      }
      const queries: { text: string; expectedId: string; vector: number[] }[] = [];
      const queryMs: number[] = [];
      for (const q of FIXTURE_QUERIES) {
        const r = await embed(e, `${family.queryPrefix}${q.text}`);
        queries.push({ ...q, vector: r.vector });
        queryMs.push(r.ms);
      }
      const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
      add(
        `  note : moyenne ${avg(docMs)} ms (min ${Math.min(...docMs)}, max ${Math.max(...docMs)}) ; ` +
          `question : moyenne ${avg(queryMs)} ms`,
      );
      const q = evaluate(queries, docs, BENCH_TOP_K);
      add(
        `  qualité : 1re place ${q.top1}/${q.queries} ; dans les ${BENCH_TOP_K} premières ${q.topK}/${q.queries} ; ` +
          `MRR ${q.mrr.toFixed(2)} ; marge moyenne ${q.meanMargin.toFixed(3)}`,
      );
      for (const d of q.details) {
        add(`    « ${d.query} » → attendu ${d.expectedId}, rang ${d.rank}${d.rank === 1 ? '' : ` (1re : ${d.firstId})`}`);
      }
    } catch (err) {
      add(`  ÉCHEC ${errorText(err)}`);
    } finally {
      await releaseEmbedder(e);
      add('  modèle libéré');
    }
    setBusy(false);
  };

  const remove = (model: StoredModel) => {
    deleteModel(model);
    add(`Supprimé : ${model.name}`);
    setModels(listModels());
  };

  return (
    <BenchScreen>
      <P>{t.embeddings.intro}</P>
      <BenchButton label={t.embeddings.import} onPress={doImport} disabled={busy} />
      {models.length === 0 ? <P>{t.embeddings.none}</P> : null}
      {models.map((m) => (
        <View key={m.uri} style={{ gap: 6 }}>
          <P>{`${m.name} (${mo(m.sizeBytes)})`}</P>
          <BenchButton label={t.embeddings.run} onPress={() => run(m)} disabled={busy} />
          <BenchButton label={t.embeddings.remove} onPress={() => remove(m)} disabled={busy} />
        </View>
      ))}
      {busy ? <P>{t.common.running}</P> : null}
      <BenchButton label={t.common.clearLog} onPress={clear} disabled={busy} />
      <LogView lines={lines} />
    </BenchScreen>
  );
}
