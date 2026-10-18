import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { space, usePalette } from '@/theme/tokens';

type ScreenProps = {
  title: string;
  /** A small line above the title, such as the date. */
  eyebrow?: string;
  subtitle?: string;
  /** Shown at the end of the title row, such as the settings button. */
  action?: ReactNode;
  children?: ReactNode;
};

/** A tab's page: safe-area aware, scrolls, title row at the top. */
export function Screen({ title, eyebrow, subtitle, action, children }: ScreenProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingHorizontal: space.xl,
          paddingBottom: space.xxxl,
          gap: space.xl,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            {eyebrow ? (
              <AppText variant="small" weight="medium" tone="muted">
                {eyebrow}
              </AppText>
            ) : null}
            <AppText variant="heading" weight="bold" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}
