import { IconFlask } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { authMode } from '@/config';
import { useLanguage } from '@/i18n';
import { radius, space, usePalette } from '@/theme/tokens';

type ScreenProps = {
  title: string;
  /** A small line above the title, such as the date. */
  eyebrow?: string;
  subtitle?: string;
  /** Shown at the end of the title row, such as the settings button. */
  action?: ReactNode;
  /** Pull down to reload, with the spinner shown while `refreshing`. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** A tab that still shows sample data. In live mode it says so, so sample and real figures are never confused. */
  sample?: boolean;
  children?: ReactNode;
};

/** A tab's page: safe-area aware, scrolls, title row at the top. */
export function Screen({ title, eyebrow, subtitle, action, onRefresh, refreshing = false, sample, children }: ScreenProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }}>
      <ScrollView
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} /> : undefined}
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
        {sample && authMode === 'api' ? (
          <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: palette.warningSoft, borderRadius: radius.lg, padding: space.md }}>
            <IconFlask size={18} color={palette.warning} />
            <AppText variant="small" style={{ flex: 1 }}>
              {t('live.sampleScreen')}
            </AppText>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}
