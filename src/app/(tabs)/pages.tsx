// Pages (DESIGN.md, « Écrans du lot 1 », n° 7) : arborescence dépliable, « Nouvelle page »,
// archives et corbeille en bas de liste.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArchiveIcon, ChevronIcon, TrashIcon } from '@/components/icons';
import { PrimaryButton } from '@/components/ui';
import { openNotes } from '@/db/expoDb';
import type { NoteWithCount } from '@/db/notesRepo';
import { useNotesQuery } from '@/db/useNotes';
import { buildTree, type TreeNode } from '@/notes/tree';
import { t } from '@/texts/fr';
import { colors, space, TOUCH, type } from '@/theme';

/** Décalage d'une sous-note par niveau (en pixels). */
const INDENT = 20;

export default function Pages() {
  const [data] = useNotesQuery(
    async (repo) => ({ notes: await repo.all(), trashed: (await repo.trashed()).length }),
    { notes: [] as NoteWithCount[], trashed: 0 },
  );
  // Les notes archivées ont leur propre écran (« Archives »).
  const active = data.notes.filter((n) => n.archivedAt === null);
  const archivedCount = data.notes.length - active.length;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const tree = buildTree(active);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function newPage() {
    const note = await (await openNotes()).create();
    router.push({ pathname: '/note/[id]', params: { id: note.id, mode: 'write' } });
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <ScrollView contentContainerStyle={styles.screen}>
        <Text accessibilityRole="header" style={type.greeting}>
          {t.pages.title}
        </Text>
        <PrimaryButton label={t.pages.newPage} onPress={newPage} />
        {tree.length === 0 ? (
          <Text style={type.secondary}>{t.pages.empty}</Text>
        ) : (
          <View>
            {tree.map((node) => (
              <Branch key={node.note.id} node={node} depth={0} open={open} onToggle={toggle} />
            ))}
          </View>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push('/archives')} style={styles.trash}>
          <ArchiveIcon color={colors.inkMuted} />
          <Text style={[type.rowTitle, styles.grow]}>{t.pages.archives}</Text>
          <Text style={type.small}>{t.pages.trashCount(archivedCount)}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/corbeille')} style={styles.trash}>
          <TrashIcon color={colors.inkMuted} />
          <Text style={[type.rowTitle, styles.grow]}>{t.pages.trash}</Text>
          <Text style={type.small}>{t.pages.trashCount(data.trashed)}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Branch({
  node,
  depth,
  open,
  onToggle,
}: {
  node: TreeNode<NoteWithCount>;
  depth: number;
  open: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { note, children } = node;
  const isOpen = open.has(note.id);
  const title = note.title || t.note.untitled;
  return (
    <>
      <View style={[styles.row, { paddingLeft: depth * INDENT }]}>
        {children.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isOpen ? t.pages.collapse(title) : t.pages.expand(title)}
            accessibilityState={{ expanded: isOpen }}
            onPress={() => onToggle(note.id)}
            style={styles.chevron}>
            <ChevronIcon open={isOpen} size={18} color={colors.inkMuted} />
          </Pressable>
        ) : (
          <View style={styles.chevron} />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
          style={({ pressed }) => [styles.title, pressed && styles.pressed]}>
          <Text style={type.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {children.length > 0 && <Text style={type.small}>{t.home.subnotes(children.length)}</Text>}
        </Pressable>
      </View>
      {isOpen &&
        children.map((child) => (
          <Branch key={child.note.id} node={child} depth={depth + 1} open={open} onToggle={onToggle} />
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: space.screenHome, gap: space.block },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.lineList },
  chevron: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minHeight: TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 4 },
  pressed: { opacity: 0.7 },
  trash: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH + 8, paddingHorizontal: 10 },
  grow: { flex: 1 },
});
