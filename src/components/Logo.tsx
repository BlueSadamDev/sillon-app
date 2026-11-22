// Logo Sillon (DESIGN.md, « Identité ») : deux sillons et une pousse.
// Même dessin que assets/brand/logo.svg. En petit (≤ 48 px), sans la feuille et avec un trait plus épais.
import { Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/texts/fr';
import { colors, type } from '@/theme';

const SMALL = 48;

export function Logo({ size }: { size: number }) {
  const small = size <= SMALL;
  const stroke = {
    stroke: colors.ink,
    strokeWidth: small ? 11 : 9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
      <Path d="M18 86 C38 72 52 72 60 80 S82 92 102 78" {...stroke} />
      <Path d="M18 62 C38 48 52 48 60 56 S82 68 102 54" {...stroke} />
      <Path d="M60 54 L60 30" {...stroke} />
      {!small && (
        <Path
          d="M60 38 C68 30 78 30 82 34 C76 42 66 42 60 38"
          fill={colors.accent}
          stroke={colors.accent}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

/** Mot-symbole « Sillon » : gras, lettres légèrement resserrées (−0,02 em). */
export function Wordmark({ size }: { size: number }) {
  return (
    <Text accessibilityRole="header" style={[type.wordmark, { fontSize: size, letterSpacing: -0.02 * size }]}>
      {t.brand.name}
    </Text>
  );
}
