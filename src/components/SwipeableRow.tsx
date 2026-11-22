// Ligne qu'on fait glisser (accueil) : vers la droite pour la corbeille, vers la gauche pour l'archive.
// Geste fait avec les outils de React Native (PanResponder, Animated), sans bibliothèque de plus.
// Les mêmes actions sont proposées aux lecteurs d'écran (actions d'accessibilité).
import { type ReactNode, useEffect, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import { t } from '@/texts/fr';
import { colors, font } from '@/theme';

/** Part de la largeur à dépasser pour déclencher l'action. */
const TRIGGER = 0.35;

type Props = { children: ReactNode; onTrash: () => void; onArchive: () => void };

/** Geste de glissement, créé hors du rendu ; « configure » garde la largeur et les actions à jour. */
function createSwipe(setDirection: (d: 'right' | 'left' | null) => void) {
  const config = { width: 1, onTrash: () => {}, onArchive: () => {} };
  const x = new Animated.Value(0);
  const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(() => setDirection(null));
  const finish = (dx: number) => {
    if (Math.abs(dx) < config.width * TRIGGER) return reset();
    Animated.timing(x, { toValue: dx > 0 ? config.width : -config.width, duration: 160, useNativeDriver: true }).start(
      () => {
        if (dx > 0) config.onTrash();
        else config.onArchive();
        x.setValue(0);
        setDirection(null);
      },
    );
  };
  const responder = PanResponder.create({
    // Seul un geste nettement horizontal est pris : le défilement vertical reste libre.
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_e, g) => {
      x.setValue(g.dx);
      setDirection(g.dx > 0 ? 'right' : g.dx < 0 ? 'left' : null);
    },
    onPanResponderRelease: (_e, g) => finish(g.dx),
    onPanResponderTerminate: () => reset(),
  });
  const configure = (next: Partial<typeof config>) => Object.assign(config, next);
  return { x, handlers: responder.panHandlers, configure };
}

export function SwipeableRow({ children, onTrash, onArchive }: Props) {
  const [direction, setDirection] = useState<'right' | 'left' | null>(null);
  const [swipe] = useState(() => createSwipe(setDirection));
  const { x, handlers, configure } = swipe;
  useEffect(() => {
    configure({ onTrash, onArchive });
  }, [configure, onTrash, onArchive]);

  return (
    <View
      onLayout={(e) => configure({ width: e.nativeEvent.layout.width })}
      accessibilityActions={[
        { name: 'trash', label: t.home.swipeTrash },
        { name: 'archive', label: t.home.swipeArchive },
      ]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'trash' ? onTrash() : onArchive())}>
      {direction && (
        <View style={[StyleSheet.absoluteFill, styles.under, direction === 'right' ? styles.trash : styles.archive]}>
          <Text style={[styles.label, direction === 'right' ? styles.trashText : styles.archiveText]}>
            {direction === 'right' ? t.home.swipeTrash : t.home.swipeArchive}
          </Text>
        </View>
      )}
      <Animated.View style={[styles.front, { transform: [{ translateX: x }] }]} {...handlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  under: { justifyContent: 'center', paddingHorizontal: 18 },
  trash: { backgroundColor: colors.error.bg, alignItems: 'flex-start' },
  archive: { backgroundColor: colors.surfaceAlt, alignItems: 'flex-end' },
  label: { ...font('bold'), fontSize: 14 },
  trashText: { color: colors.error.text },
  archiveText: { color: colors.inkSoft },
  front: { backgroundColor: colors.bg },
});
