import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BrandMark } from '@/components/brand-mark';
import { Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { contentColumn, radius, space, usePalette } from '@/theme/tokens';

/** The sign-in page: the navy brand band, and a card over it holding the form. */
export function SignInFrame({ title, hint, demo, children }: { title: string; hint: string; demo?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled">
        {/* The band spans the screen; its words and the card keep to the content column. */}
        <View style={{ backgroundColor: palette.hero, paddingTop: insets.top + space.xxl, paddingBottom: 64 }}>
          <View style={{ ...contentColumn, paddingHorizontal: space.xl, gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <BrandMark />
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight="bold" style={{ color: palette.heroText }}>
                  PettyCash Plus
                </AppText>
                <AppText variant="small" style={{ color: palette.heroMuted }}>
                  {t('web:auth.brandTagline')}
                </AppText>
              </View>
              {demo ? <Pill label={t('web:auth.demoBadge')} bg={palette.heroAccent} fg={palette.heroAccentText} /> : null}
            </View>
            <AppText variant="body" style={{ color: palette.heroMuted, marginTop: space.sm }}>
              {t('web:auth.pitch')}
            </AppText>
          </View>
        </View>

        <View style={contentColumn}>
          <View style={{ marginTop: -40, marginHorizontal: space.lg, backgroundColor: palette.card, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, padding: space.xl, gap: space.lg, shadowColor: palette.shadow, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="heading" weight="bold" accessibilityRole="header">
                {title}
              </AppText>
              <AppText tone="secondary">{hint}</AppText>
            </View>
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
