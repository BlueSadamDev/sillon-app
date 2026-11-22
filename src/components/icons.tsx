// Icônes en trait (DESIGN.md : trait 1,8 à 2 px, couleur du texte). Dessinées ici, rien n'est chargé en ligne.
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

type IconProps = { size?: number; color?: string };

function Icon({ size = 22, color = colors.ink, children }: IconProps & { children: (c: string) => React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      {children(color)}
    </Svg>
  );
}

const line = { strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>{(c) => <Path d="M4 11 L12 4 L20 11 V20 H14.5 V14.5 H9.5 V20 H4 Z" stroke={c} {...line} />}</Icon>
);

export const PagesIcon = (p: IconProps) => (
  <Icon {...p}>
    {(c) => (
      <>
        <Path d="M6 3.5 H14 L18.5 8 V20.5 H6 Z" stroke={c} {...line} />
        <Path d="M14 3.5 V8 H18.5 M9 12.5 H15.5 M9 16 H15.5" stroke={c} {...line} />
      </>
    )}
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    {(c) => (
      <>
        <Circle cx={10.5} cy={10.5} r={6} stroke={c} {...line} />
        <Path d="M15 15 L20 20" stroke={c} {...line} />
      </>
    )}
  </Icon>
);

/** La pousse du logo, pour tout ce qui vient de l'IA (onglet Insights). */
export const SproutIcon = (p: IconProps) => (
  <Icon {...p}>
    {(c) => (
      <Path
        d="M12 21 V11 M12 14 C12 9.5 9 7 4.5 7 C4.5 11.5 7.5 14 12 14 Z M12 11 C12 7 14.5 4 19.5 4 C19.5 8.5 16.5 11 12 11 Z"
        stroke={c}
        {...line}
      />
    )}
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>{(c) => <Path d="M12 5 V19 M5 12 H19" stroke={c} strokeWidth={2.2} strokeLinecap="round" />}</Icon>
);

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>{(c) => <Path d="M15 5 L8 12 L15 19" stroke={c} {...line} />}</Icon>
);
