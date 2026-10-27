import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { OfflineNote } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { contentColumn, space, usePalette } from '@/theme/tokens';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Shown at the top end of the title row, such as the profile button. */
  action?: ReactNode;
  /** Pull down to reload, with the spinner shown while `refreshing`. */
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: ReactNode;
};

/** A tab's page: safe-area aware, scrolls, title row at the top. */
export function Screen({ title, subtitle, action, onRefresh, refreshing = false, children }: ScreenProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }}>
      <ScrollView
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} /> : undefined}
        contentContainerStyle={{
          ...contentColumn,
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.xl,
          paddingBottom: space.xxxl,
          gap: space.xl,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" weight="bold" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
          </View>
          {action}
        </View>
        <OfflineNote />
        {children}
      </ScrollView>
    </View>
  );
}
