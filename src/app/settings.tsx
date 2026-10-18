import { IconCheck } from '@tabler/icons-react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { authMode } from '@/config';
import { setLanguage, useLanguage } from '@/i18n';
import { appLanguages } from '@/i18n/languages';
import { radius, space, usePalette } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const palette = usePalette();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="small" weight="semibold" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: space.xs }}>
        {title}
      </AppText>
      <View style={{ backgroundColor: palette.card, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({ children, onPress, first, selected }: { children: ReactNode; onPress?: () => void; first?: boolean; selected?: boolean }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'radio' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        minHeight: 52,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.border,
        backgroundColor: pressed ? palette.surfaceStrong : selected ? palette.primarySoft : 'transparent',
      })}>
      {children}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { language, isRTL } = useLanguage();

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: Platform.OS === 'ios' ? space.xl : insets.top + space.lg,
          paddingHorizontal: space.xl,
          paddingBottom: space.md,
        }}>
        <AppText variant="title" weight="bold" style={{ flex: 1 }} accessibilityRole="header">
          {t('settings.title')}
        </AppText>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
          <AppText weight="semibold" tone="primary">
            {t('settings.done')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.sm, paddingBottom: insets.bottom + space.xxxl, gap: space.xxl }}>
        <Section title={t('settings.language')}>
          {appLanguages.map((l, i) => {
            const selected = l.code === language.code;
            return (
              <Row key={l.code} first={i === 0} selected={selected} onPress={() => setLanguage(l.code)}>
                <View style={{ flex: 1 }}>
                  <AppText weight={selected ? 'semibold' : 'medium'}>{l.nativeName}</AppText>
                  {l.nativeName !== l.name ? (
                    <AppText variant="small" tone="muted">
                      {l.name}
                    </AppText>
                  ) : null}
                </View>
                {selected ? <IconCheck size={20} color={palette.primary} strokeWidth={2.4} /> : null}
              </Row>
            );
          })}
        </Section>

        <Section title={t('settings.about')}>
          <Row first>
            <AppText style={{ flex: 1 }}>{t('settings.mode')}</AppText>
            <AppText tone="secondary">{authMode === 'api' ? t('settings.modeLive') : t('settings.modeDemo')}</AppText>
          </Row>
          <Row>
            <AppText style={{ flex: 1 }}>{t('settings.version')}</AppText>
            <AppText tone="secondary">{Constants.expoConfig?.version ?? '1.0.0'}</AppText>
          </Row>
        </Section>
      </ScrollView>
    </View>
  );
}
