// Pastille d'état de la sauvegarde sur l'accueil (DESIGN.md) : pilule 12 px, icône + libellé,
// couleurs ok / warn / error. Toucher ouvre l'écran Compte.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AlertIcon, CheckIcon, ClockIcon } from '@/components/icons';
import { t } from '@/texts/fr';
import { colors, font, radius, TOUCH } from '@/theme';

import { useBackup } from '../BackupProvider';
import { type Badge, badgeFor } from '../status';

export function badgeLabel(b: Badge): string {
  const l = t.backup.badge;
  if (b.kind !== 'days') return l[b.kind];
  if (b.days === 0) return l.today;
  if (b.days === 1) return l.yesterday;
  return l.days(b.days);
}

export function BackupBadge({ now }: { now: Date }) {
  const backup = useBackup();
  if (backup.loading) return null;
  const badge = badgeFor(backup.configured, backup.status, now);
  const label = badgeLabel(badge);
  const tone = colors[badge.tone];
  const Icon = badge.tone === 'error' ? AlertIcon : badge.tone === 'ok' ? CheckIcon : ClockIcon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.backup.badgeA11y(label)}
      onPress={() => router.push('/compte')}
      hitSlop={{ top: (TOUCH - 26) / 2, bottom: (TOUCH - 26) / 2 }}
      style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Icon size={14} color={tone.text} />
      <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  text: { ...font('medium'), fontSize: 12 },
});
