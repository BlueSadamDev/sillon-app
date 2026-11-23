// Restauration d'une sauvegarde (F7) : choisir un fichier, taper le mot de passe de sauvegarde,
// voir l'aperçu (date, nombre de notes), confirmer, puis remplacement des notes d'un seul bloc.
// mode « account » : depuis Compte (les notes actuelles sont remplacées, double confirmation).
// mode « start » : depuis la création du compte, sur un téléphone encore vide.
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { afterPaint } from '@/account/device';
import { openNotes } from '@/db/expoDb';
import { notesChanged } from '@/db/events';
import { SectionLabel } from '@/components/notes';
import { Field, InfoBox, PrimaryButton, ProblemText, SecondaryButton } from '@/components/ui';
import { dateAndTime } from '@/texts/dates';
import { t } from '@/texts/fr';
import { type } from '@/theme';

import type { BackupContent, BackupSummary } from '../payload';
import { pickBackupFile } from '../pick';
import { openBackup } from '../restore';
import { sodiumEngine } from '../sodium';

type Step =
  | { kind: 'pick' }
  | { kind: 'password'; name: string; bytes: Uint8Array }
  | { kind: 'preview'; name: string; content: BackupContent; summary: BackupSummary };

export function RestoreFlow({ mode, onDone }: { mode: 'account' | 'start'; onDone: (content: BackupContent) => void }) {
  const r = t.restore;
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentCount, setCurrentCount] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== 'account') return;
    openNotes()
      .then((repo) => repo.exportAll())
      .then((notes) => setCurrentCount(notes.filter((n) => n.deletedAt === null).length))
      .catch(() => setCurrentCount(null));
  }, [mode]);

  async function pick() {
    setProblem(null);
    setBusy(true);
    const picked = await pickBackupFile();
    setBusy(false);
    if (!picked.ok) {
      if (picked.problem !== 'cancelled') setProblem(r.problems[picked.problem]);
      return;
    }
    setPassword('');
    setStep({ kind: 'password', name: picked.name, bytes: picked.bytes });
  }

  async function open() {
    if (step.kind !== 'password') return;
    if (password === '') return setProblem(r.problems.empty);
    setProblem(null);
    setBusy(true);
    await afterPaint(); // affiche « Ouverture… » avant le calcul de la clé (environ 1 s)
    const opened = openBackup(step.bytes, password, sodiumEngine);
    setBusy(false);
    if (!opened.ok) return setProblem(r.problems[opened.problem]);
    setPassword('');
    setStep({ kind: 'preview', name: step.name, content: opened.content, summary: opened.summary });
  }

  async function replace() {
    if (step.kind !== 'preview') return;
    setProblem(null);
    setBusy(true);
    try {
      await afterPaint();
      await (await openNotes()).replaceAll(step.content.notes);
    } catch {
      setBusy(false);
      return setProblem(r.problems.failed);
    }
    notesChanged();
    setBusy(false);
    onDone(step.content);
  }

  function confirm() {
    if (mode === 'start') return void replace();
    Alert.alert(r.confirmTitle, r.confirmText, [
      { text: r.keep, style: 'cancel' },
      { text: r.confirm, style: 'destructive', onPress: () => void replace() },
    ]);
  }

  return (
    <View style={styles.form}>
      <Text accessibilityRole="header" style={type.noteTitle}>
        {r.title}
      </Text>

      {step.kind === 'pick' && (
        <>
          <Text style={type.secondary}>{r.intro}</Text>
          <InfoBox>{r.pickHint}</InfoBox>
          <PrimaryButton label={r.pick} onPress={pick} disabled={busy} />
        </>
      )}

      {step.kind === 'password' && (
        <>
          <Text style={type.rowTitle}>{r.file(step.name)}</Text>
          <Field
            label={r.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={open}
          />
          <PrimaryButton label={busy ? r.opening : r.open} onPress={open} disabled={busy} />
          <SecondaryButton label={r.otherFile} onPress={pick} disabled={busy} />
        </>
      )}

      {step.kind === 'preview' && (
        <>
          <SectionLabel>{r.previewTitle(dateAndTime(step.summary.createdAt))}</SectionLabel>
          <Text style={type.rowTitle}>
            {r.previewCounts(step.summary.notes, step.summary.archived, step.summary.trashed)}
          </Text>
          {mode === 'account' && currentCount !== null && <InfoBox>{r.replaceWarning(currentCount)}</InfoBox>}
          <PrimaryButton
            label={busy ? r.restoring : mode === 'account' ? r.replace : r.restoreHere}
            onPress={confirm}
            disabled={busy}
          />
          <SecondaryButton label={r.otherFile} onPress={pick} disabled={busy} />
        </>
      )}

      {problem && <ProblemText>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
