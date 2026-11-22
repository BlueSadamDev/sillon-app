// Note (DESIGN.md, « Écrans du lot 1 », n° 6) : en-tête (retour, chemin, menu « … »), titre,
// tags et date de modification, corps en mode écriture ou lecture, barre d'outils Markdown.
// Enregistrement automatique, sans bouton.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputSelectionChangeEvent,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackIcon, MoreIcon } from '@/components/icons';
import { Sheet, SheetItem } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { notesChanged } from '@/db/events';
import { openNotes } from '@/db/expoDb';
import type { NoteWithCount } from '@/db/notesRepo';
import { applyAction, continueList, type Action, type Selection } from '@/editor/format';
import { MarkdownView } from '@/editor/MarkdownView';
import { SAVE_DELAY_MS } from '@/editor/settings';
import { Toolbar } from '@/editor/Toolbar';
import { useKeyboardVisible } from '@/editor/useKeyboardVisible';
import { extractTags } from '@/notes/tags';
import { buildTree, descendantIds, pathOf, type TreeNode } from '@/notes/tree';
import { modifiedWhen } from '@/texts/dates';
import { t } from '@/texts/fr';
import { colors, font, radius, space, TOUCH, type } from '@/theme';

type Draft = { title: string; body: string };

export default function NoteScreen() {
  const { id, mode: startMode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();

  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>({ title: '', body: '' });
  const [mode, setMode] = useState<'write' | 'read'>('read');
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [all, setAll] = useState<NoteWithCount[]>([]);
  const [menu, setMenu] = useState<'none' | 'actions' | 'move'>('none');
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [forcedSelection, setForcedSelection] = useState<Selection | undefined>(undefined);
  const bodyRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Ce qui est enregistré dans la base, et la dernière version tapée (pour l'enregistrement final).
  const saved = useRef<Draft>({ title: '', body: '' });
  const latest = useRef<Draft>({ title: '', body: '' });
  const trashed = useRef(false);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const repo = await openNotes();
      const [note, notes] = await Promise.all([repo.get(id), repo.all()]);
      if (!alive || !note) return;
      const d = { title: note.title, body: note.body };
      saved.current = d;
      setDraft(d);
      setPinned(note.pinned);
      setArchived(note.archivedAt !== null);
      setParentId(note.parentId);
      setUpdatedAt(note.updatedAt);
      setAll(notes);
      setMode(startMode === 'write' || (d.title === '' && d.body === '') ? 'write' : 'read');
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [id, startMode]);

  const save = useCallback(async () => {
    const d = latest.current;
    if (trashed.current || (d.title === saved.current.title && d.body === saved.current.body)) return;
    saved.current = d;
    await (await openNotes()).update(id, d);
    setUpdatedAt(Date.now());
  }, [id]);

  // Enregistrement automatique, peu après la dernière frappe.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(save, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, loaded, save]);

  // Enregistrement immédiat quand l'app passe en arrière-plan, et en quittant la note
  // (une note laissée vide est alors effacée).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && save());
    return () => {
      sub.remove();
      (async () => {
        await save();
        if (!trashed.current) await (await openNotes()).removeIfEmpty(id);
        notesChanged();
      })();
    };
  }, [id, save]);

  const tags = useMemo(() => extractTags(draft.body), [draft.body]);
  const path = useMemo(
    () => pathOf(id, all.map((n) => (n.id === id ? { ...n, parentId } : n))).slice(0, -1),
    [all, id, parentId],
  );

  const onBodyChange = (next: string) => {
    const cont = continueList(draft.body, next);
    if (cont) {
      setDraft((d) => ({ ...d, body: cont.text }));
      setForcedSelection(cont.selection);
    } else {
      setDraft((d) => ({ ...d, body: next }));
    }
  };

  const onSelectionChange = (e: TextInputSelectionChangeEvent) => {
    setSelection(e.nativeEvent.selection);
    if (forcedSelection) setForcedSelection(undefined);
  };

  const onAction = (action: Action) => {
    const edit = applyAction(action, draft.body, selection);
    setDraft((d) => ({ ...d, body: edit.text }));
    setForcedSelection(edit.selection);
    setSelection(edit.selection);
    bodyRef.current?.focus();
  };

  const onNoteLink = useCallback(async (title: string) => {
    const repo = await openNotes();
    const target = (await repo.findByTitle(title)) ?? (await repo.create({ title }));
    router.push({ pathname: '/note/[id]', params: { id: target.id } });
  }, []);

  async function togglePin() {
    setMenu('none');
    await (await openNotes()).setPinned(id, !pinned);
    setPinned(!pinned);
    notesChanged();
  }

  /** Bouton « Enregistrer » : enregistre tout de suite et revient à l'écran précédent. */
  async function saveAndClose() {
    Keyboard.dismiss();
    await save();
    router.back();
  }

  async function toggleArchive() {
    setMenu('none');
    await save();
    const repo = await openNotes();
    if (archived) {
      await repo.unarchive(id);
      setArchived(false);
      notesChanged();
      toast({ message: t.note.unarchived });
      return;
    }
    const count = await repo.archive(id);
    setArchived(true);
    notesChanged();
    toast({
      message: count > 1 ? t.note.archivedWithChildren(count - 1) : t.note.archived,
      action: {
        label: t.note.undo,
        run: async () => {
          await repo.unarchive(id);
          setArchived(false);
          notesChanged();
        },
      },
    });
  }

  async function newChild() {
    setMenu('none');
    await save();
    const child = await (await openNotes()).create({ parentId: id });
    router.push({ pathname: '/note/[id]', params: { id: child.id, mode: 'write' } });
  }

  async function moveTo(newParent: string | null) {
    setMenu('none');
    await save();
    if (await (await openNotes()).move(id, newParent)) {
      setParentId(newParent);
      notesChanged();
    }
  }

  async function trash() {
    setMenu('none');
    await save();
    const repo = await openNotes();
    const count = await repo.trash(id);
    trashed.current = true;
    notesChanged();
    router.back();
    toast({
      message: count > 1 ? t.note.trashedWithChildren(count - 1) : t.note.trashed,
      action: {
        label: t.note.undo,
        run: async () => {
          await repo.restore(id);
          notesChanged();
        },
      },
    });
  }

  const header = (
    <View style={styles.meta}>
      {mode === 'read' && <Text style={type.noteTitle}>{draft.title || t.note.untitled}</Text>}
      {(tags.length > 0 || updatedAt > 0) && (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
          {updatedAt > 0 && <Text style={type.small}>{t.note.modified(modifiedWhen(updatedAt, new Date()))}</Text>}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.note.back} onPress={() => router.back()} style={styles.icon}>
          <BackIcon />
        </Pressable>
        <Text style={[type.small, styles.path]} numberOfLines={1}>
          {path.length > 0 ? [...path.map((n) => n.title || t.note.untitled), draft.title || t.note.untitled].join(' › ') : ''}
        </Text>
        {loaded && mode === 'write' && (
          <Pressable
            accessibilityRole="button"
            onPress={saveAndClose}
            style={({ pressed }) => [styles.saveButton, pressed && styles.dim]}>
            <Text style={styles.saveText}>{t.note.save}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={t.note.menu} onPress={() => setMenu('actions')} style={styles.icon}>
          <MoreIcon />
        </Pressable>
      </View>

      {loaded && (
        <KeyboardAvoidingView style={styles.fill} behavior="padding">
          {mode === 'write' ? (
            <View style={styles.fill}>
              <View style={styles.writeHead}>
                <TextInput
                  value={draft.title}
                  onChangeText={(title) => setDraft((d) => ({ ...d, title: title.replace(/\n/g, ' ') }))}
                  placeholder={t.note.titlePlaceholder}
                  placeholderTextColor={colors.inkMuted}
                  accessibilityLabel={t.note.titlePlaceholder}
                  multiline
                  submitBehavior="submit"
                  onSubmitEditing={() => bodyRef.current?.focus()}
                  style={[type.noteTitle, styles.titleInput]}
                />
                {header}
              </View>
              <TextInput
                ref={bodyRef}
                value={draft.body}
                onChangeText={onBodyChange}
                onSelectionChange={onSelectionChange}
                selection={forcedSelection}
                placeholder={t.note.bodyPlaceholder}
                placeholderTextColor={colors.inkMuted}
                accessibilityLabel={t.note.bodyPlaceholder}
                multiline
                autoFocus={draft.title !== '' && draft.body === ''}
                textAlignVertical="top"
                style={[type.bodyWrite, styles.bodyInput]}
              />
            </View>
          ) : (
            <View style={styles.fill}>
              <MarkdownView value={draft.body} onNoteLink={onNoteLink} header={header} />
            </View>
          )}
          <Toolbar
            mode={mode}
            onAction={onAction}
            onToggle={() => {
              save();
              setMode(mode === 'write' ? 'read' : 'write');
            }}
            bottom={keyboard ? 0 : insets.bottom}
          />
        </KeyboardAvoidingView>
      )}

      <Sheet visible={menu === 'actions'} onClose={() => setMenu('none')}>
        <SheetItem label={pinned ? t.note.unpin : t.note.pin} onPress={togglePin} />
        <SheetItem label={t.note.newChild} onPress={newChild} />
        <SheetItem label={t.note.move} onPress={() => setMenu('move')} />
        <SheetItem label={archived ? t.note.unarchive : t.note.archive} onPress={toggleArchive} />
        <SheetItem label={t.note.trash} onPress={trash} />
      </Sheet>

      <Sheet visible={menu === 'move'} title={t.note.moveTitle} onClose={() => setMenu('none')}>
        <SheetItem label={t.note.moveRoot} onPress={() => moveTo(null)} />
        <MoveTargets nodes={buildTree(all)} exclude={[id, ...descendantIds(id, all)]} onPick={moveTo} depth={0} />
      </Sheet>
    </SafeAreaView>
  );
}

/** Notes où l'on peut ranger la note courante (ni elle-même ni ses sous-notes), en arbre. */
function MoveTargets({
  nodes,
  exclude,
  onPick,
  depth,
}: {
  nodes: TreeNode<NoteWithCount>[];
  exclude: string[];
  onPick: (id: string) => void;
  depth: number;
}) {
  return (
    <>
      {nodes
        .filter((n) => !exclude.includes(n.note.id))
        .map((n) => (
          <View key={n.note.id}>
            <SheetItem label={n.note.title || t.note.untitled} indent={depth} onPress={() => onPick(n.note.id)} />
            <MoveTargets nodes={n.children} exclude={exclude} onPick={onPick} depth={depth + 1} />
          </View>
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  icon: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  path: { flex: 1, textAlign: 'center' },
  saveButton: {
    minHeight: TOUCH,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...font('bold'), fontSize: 14, color: colors.onAccent },
  dim: { opacity: 0.7 },
  writeHead: { paddingHorizontal: space.screenNote, gap: 4 },
  titleInput: { padding: 0, paddingVertical: 4 },
  meta: { gap: 8, paddingBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  tag: {
    ...type.small,
    color: colors.inkSoft,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  bodyInput: { flex: 1, paddingHorizontal: space.screenNote, paddingTop: 4, paddingBottom: 24 },
});
