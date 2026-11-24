// Modèle de la recherche par le sens (lot 3), ouvert depuis Compte : import, état du calcul,
// seuil des notes liées, suppression.
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSemantic } from '@/ai/SemanticProvider';
import { EMBEDDING_MODEL, PROXIMITY_LEVELS } from '@/ai/settings';
import type { ModelRefusal } from '@/ai/modelCheck';
import { BackHeader } from '@/components/BackHeader';
import { SectionLabel } from '@/components/notes';
import { useToast } from '@/components/Toast';
import { PrimaryButton, ProblemText, SecondaryButton } from '@/components/ui';
import { t } from '@/texts/fr';
import { colors, font, radius, TOUCH, space, type } from '@/theme';

const mo = (bytes: number) => `${Math.round(bytes / 1_000_000)} Mo`;

export default function ModelScreen() {
  const s = t.semantic;
  const semantic = useSemantic();
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  const [refusal, setRefusal] = useState<ModelRefusal | null>(null);

  async function importModel() {
    setRefusal(null);
    setChecking(true);
    const result = await semantic.importModel();
    setChecking(false);
    if (result.kind === 'refused') setRefusal(result.reason);
    if (result.kind === 'installed') toast({ message: s.installedToast });
  }

  function confirmRemove() {
    Alert.alert(s.removeTitle, s.removeText, [
      { text: s.keep, style: 'cancel' },
      {
        text: s.removeConfirm,
        style: 'destructive',
        onPress: () => void semantic.removeModel().then(() => toast({ message: s.removed })),
      },
    ]);
  }

  function progressText(): string {
    const { done, total } = semantic.progress;
    if (total === 0) return s.noNotes;
    return done >= total ? s.allRead : s.progress(done, total);
  }

  const ready = semantic.modelStatus === 'ready';

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <BackHeader />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={type.greeting}>
            {s.title}
          </Text>
          <Text style={type.secondary}>{s.intro}</Text>
        </View>

        <View style={[styles.card, styles.block]}>
          {ready ? (
            <>
              <Text style={type.rowTitle}>{s.installed(mo(semantic.modelSizeBytes ?? 0))}</Text>
              {semantic.failed ? (
                <ProblemText>{s.failed}</ProblemText>
              ) : (
                <Text style={type.secondary}>{progressText()}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={type.secondary}>{checking ? s.checking : s.absent(EMBEDDING_MODEL.fileName)}</Text>
              {refusal && !checking && <ProblemText>{s.refused[refusal]}</ProblemText>}
              <PrimaryButton label={s.import} onPress={importModel} disabled={checking} />
            </>
          )}
        </View>

        {ready && (
          <View style={styles.group}>
            <SectionLabel>{s.level}</SectionLabel>
            <View style={[styles.card, styles.block]}>
              <View style={styles.chips} accessibilityRole="radiogroup">
                {PROXIMITY_LEVELS.map((lvl) => {
                  const selected = semantic.level === lvl;
                  return (
                    <Pressable
                      key={lvl}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => semantic.setLevel(lvl)}
                      style={[styles.chip, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && font('bold')]}>{s.levels[lvl]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={type.secondary}>{s.levelHint}</Text>
            </View>
          </View>
        )}

        {ready && <SecondaryButton label={s.remove} onPress={confirmRemove} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  screen: { paddingHorizontal: space.screenHome, paddingBottom: space.block, gap: space.block },
  head: { gap: 4 },
  group: { gap: space.grid },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 14,
  },
  block: { paddingVertical: 14, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: TOUCH,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  chipSelected: { backgroundColor: colors.surfaceAlt, borderColor: colors.inkMuted },
  chipText: { ...font('regular'), fontSize: 14, color: colors.ink },
});
