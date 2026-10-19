import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { space, usePalette } from '@/theme/tokens';

type PageProps = {
  title: string;
  /** Shown at the end of the title bar, such as a status. */
  right?: ReactNode;
  children: ReactNode;
  /** Pinned to the bottom, above the safe area: the screen's main actions. */
  footer?: ReactNode;
};

/** A screen opened from a tab: a back button and title, scrolling content, and optional actions pinned at the bottom. */
export function Page({ title, right, children, footer }: PageProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const Back = isRTL ? IconArrowRight : IconArrowLeft;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.md, paddingBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: palette.bg }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('web:action.back')}
          hitSlop={8}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? palette.surfaceStrong : 'transparent' })}>
          <Back size={22} color={palette.text} />
        </Pressable>
        <AppText variant="bodyLarge" weight="semibold" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {right}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: footer ? space.xl : insets.bottom + space.xxxl, gap: space.lg }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg), borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.card, gap: space.sm }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
