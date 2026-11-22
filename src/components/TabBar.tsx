// Barre de navigation (DESIGN.md) : 4 onglets égaux, icône 22 px et libellé 11 px,
// actif en ink gras, inactifs en inkMuted, fond surface, bordure haute line.
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HomeIcon, PagesIcon, SearchIcon, SproutIcon } from '@/components/icons';
import { t } from '@/texts/fr';
import { colors, font, TOUCH, type } from '@/theme';

const TABS: Record<string, { label: string; Icon: typeof HomeIcon }> = {
  index: { label: t.tabs.home, Icon: HomeIcon },
  pages: { label: t.tabs.pages, Icon: PagesIcon },
  recherche: { label: t.tabs.search, Icon: SearchIcon },
  insights: { label: t.tabs.insights, Icon: SproutIcon },
};

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === index;
        const color = active ? colors.ink : colors.inkMuted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) navigateToTab(route.key);
            }}
            style={styles.tab}>
            <tab.Icon size={22} color={color} />
            <Text style={[type.tab, { color }, active && font('bold')]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, minHeight: TOUCH + 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
});
