// Éléments d'interface communs (DESIGN.md, « Composants ») : écran, champs, boutons, encadré.
import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius, space, TOUCH, type } from '@/theme';

/** Écran simple qui défile, avec le clavier pris en compte ; contenu centré ou calé en haut. */
export function FormScreen({ children, top }: { children: ReactNode; top?: boolean }) {
  return (
    <SafeAreaView style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior="height">
        <ScrollView contentContainerStyle={[styles.form, top && styles.formTop]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={type.sectionLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        {...input}
        accessibilityLabel={label}
        style={[styles.input, input.style]}
      />
    </View>
  );
}

type ButtonProps = { label: string; onPress: () => void; disabled?: boolean };

export function PrimaryButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.primary, (pressed || disabled) && styles.dim]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles.secondary, (pressed || disabled) && styles.dim]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

/** Lien discret (texte en couleur d'accent), cible tactile de 44 px. */
export function TextLink({ label, onPress }: ButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

/** Encadré d'explication sur fond surface. */
export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxText}>{children}</Text>
    </View>
  );
}

/** Message de problème : texte et fond « error », jamais la couleur seule. */
export function ProblemText({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.problem}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  form: { flexGrow: 1, justifyContent: 'center', padding: space.screenHome, gap: 16 },
  formTop: { justifyContent: 'flex-start', paddingTop: 0 },
  field: { gap: 6 },
  input: {
    ...type.bodyWrite,
    minHeight: TOUCH + 4,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: colors.accent },
  primaryText: { ...font('bold'), fontSize: 15, color: colors.onAccent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryText: { ...font('bold'), fontSize: 15, color: colors.ink },
  dim: { opacity: 0.6 },
  link: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  linkText: { ...font('medium'), fontSize: 14, color: colors.accentText },
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 14,
  },
  boxText: { ...type.secondary, color: colors.inkSoft, lineHeight: 19 },
  problem: {
    ...font('medium'),
    fontSize: 13,
    color: colors.error.text,
    backgroundColor: colors.error.bg,
    borderRadius: radius.chip,
    padding: 10,
  },
});
