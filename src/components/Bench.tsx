// Composants minimaux des bancs d'essai (lot 0, sans design).
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function BenchScreen({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>;
}

export function BenchButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export function LogView({ lines }: { lines: string[] }) {
  return (
    <View style={styles.log}>
      {lines.map((l, i) => (
        <Text key={i} selectable style={styles.logLine}>
          {l}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1D1B17',
    borderRadius: 10,
  },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 16, color: '#1D1B17' },
  p: { fontSize: 15, color: '#1D1B17' },
  log: { gap: 4, paddingTop: 8 },
  logLine: { fontSize: 13, fontFamily: 'monospace', color: '#1D1B17' },
});
