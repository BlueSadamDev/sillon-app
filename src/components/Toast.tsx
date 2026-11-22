// Message bref en bas de l'écran, avec une action possible (« Note mise à la corbeille. Annuler »).
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, TOUCH } from '@/theme';

/** Durée d'affichage du message (en millisecondes). */
const TOAST_MS = 6000;

type ToastAction = { label: string; run: () => void };
type Toast = { message: string; action?: ToastAction };
const Ctx = createContext<(toast: Toast) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((next: Toast) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <View style={[styles.wrap, { bottom: insets.bottom + 72 }]} pointerEvents="box-none">
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.text}>{toast.message}</Text>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                style={styles.action}
                onPress={() => {
                  toast.action?.run();
                  setToast(null);
                }}>
                <Text style={styles.actionText}>{toast.action.label}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 52,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  text: { ...font('regular'), flex: 1, fontSize: 14, color: colors.ink },
  action: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { ...font('bold'), fontSize: 14, color: colors.ink },
});
