// Thème de Sillon (direction « A · Papier » de DESIGN.md). Toutes les couleurs, tailles et formes
// des écrans viennent d'ici : jamais de valeur en dur dans un écran.
import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#F5F1E8',
  surface: '#FBF8F2',
  surfaceAlt: '#EDE6D7',
  line: '#E1DACB',
  lineList: '#E4DED1',
  ink: '#1D1B17',
  inkSoft: '#4E493F',
  inkMuted: '#6A655B',
  accent: '#B4532A',
  accentText: '#9A4422',
  onAccent: '#FFFFFF',
  onInk: '#F5F1E8',
  onInkMuted: '#D9CFBB',
  onInkAccent: '#F0B48F',
  quoteBar: '#D9CFBB',
  ok: { text: '#3F5A3A', bg: '#E7EBDD' },
  warn: { text: '#8A5A00', bg: '#F6E9C8' },
  error: { text: '#A3322A', bg: '#F6DEDA' },
} as const;

/**
 * Police : Satoshi (fichiers .ttf repris de X-Gallery, dans assets/fonts/, chargés au démarrage
 * par expo-font). Chaque graisse est un fichier distinct : on choisit la famille, pas fontWeight.
 */
type Weight = 'regular' | 'medium' | 'bold';
export const FONT_FILES = {
  'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
  'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
  'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
};
const FAMILIES: Record<Weight, keyof typeof FONT_FILES> = {
  regular: 'Satoshi-Regular',
  medium: 'Satoshi-Medium',
  bold: 'Satoshi-Bold',
};
export function font(weight: Weight): TextStyle {
  return { fontFamily: FAMILIES[weight] };
}

/** Rôles typographiques (tableau « Typographie » de DESIGN.md). */
export const type = {
  greeting: { ...font('bold'), fontSize: 32, letterSpacing: -0.8, color: colors.ink },
  noteTitle: { ...font('bold'), fontSize: 30, lineHeight: 34.5, color: colors.ink },
  insight: { ...font('medium'), fontSize: 21, lineHeight: 27.3, color: colors.onInk },
  cardTitle: { ...font('bold'), fontSize: 17, color: colors.ink },
  bodyRead: { ...font('regular'), fontSize: 17, lineHeight: 27.2, color: colors.ink },
  bodyWrite: { ...font('regular'), fontSize: 16, color: colors.ink },
  rowTitle: { ...font('medium'), fontSize: 15, color: colors.ink },
  secondary: { ...font('regular'), fontSize: 13, color: colors.inkMuted },
  sectionLabel: { ...font('bold'), fontSize: 13, color: colors.inkMuted },
  insightLabel: {
    ...font('medium'),
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.onInkMuted,
  },
  small: { ...font('regular'), fontSize: 12, color: colors.inkMuted },
  tab: { ...font('regular'), fontSize: 11 },
  wordmark: { ...font('bold'), color: colors.ink },
} as const satisfies Record<string, TextStyle>;

export const space = {
  screenHome: 22,
  screenNote: 26,
  block: 22,
  grid: 10,
} as const;

export const radius = {
  insight: 20,
  capture: 16,
  card: 14,
  button: 12,
  chip: 10,
  pill: 999,
} as const;

/** Cible tactile minimale (DESIGN.md : ≥ 44 px). */
export const TOUCH = 44;
