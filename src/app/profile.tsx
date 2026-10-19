import { IconChevronLeft, IconChevronRight, IconInfoCircle, IconLanguage, IconLogout, IconShieldCheck, IconShieldOff, IconSunMoon, type Icon } from '@tabler/icons-react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Avatar, Button, Card, Pill, Segmented } from '@/components/ui';
import { authMode } from '@/config';
import { setThemeChoice, useThemeChoice, type ThemeChoice } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/i18n';
import { nameOf, person, unit } from '@/lib/format';
import { signOut, useSession } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

function Row({ icon: IconComponent, label, value, onPress, first, tone }: { icon: Icon; label: string; value?: ReactNode; onPress?: () => void; first?: boolean; tone?: string }) {
  const palette = usePalette();
  const { isRTL } = useLanguage();
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 54, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border, backgroundColor: pressed ? palette.surfaceStrong : 'transparent' })}>
      <View style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: `${tone ?? palette.primary}1A`, alignItems: 'center', justifyContent: 'center' }}>
        <IconComponent size={18} color={tone ?? palette.primary} />
      </View>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {typeof value === 'string' ? <AppText tone="secondary">{value}</AppText> : value}
      {onPress ? <Chevron size={18} color={palette.textMuted} /> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const { personId, persona } = useSession();
  const me = person(personId)!;
  const twoFactor = persona !== 'employee';
  const theme = useThemeChoice();

  return (
    <Page title={t('profile.title')}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Avatar name={me.nameEn} id={me.id} size={76} />
        <AppText variant="title" weight="bold" align="center">
          {nameOf(me, language.code)}
        </AppText>
        <AppText tone="secondary" align="center">
          {me.designation} · {nameOf(unit(me.departmentId), language.code)}
        </AppText>
        <View style={{ alignSelf: 'center' }}>
          <Pill label={t(`web:auth.persona.${persona}`)} bg={palette.primarySoft} fg={palette.primary} />
        </View>
      </Card>

      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        <Row first icon={IconLanguage} label={t('settings.language')} value={language.nativeName} onPress={() => router.push('/language')} />
        <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md, borderTopWidth: 1, borderTopColor: palette.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 34, height: 34, borderRadius: radius.md, backgroundColor: `${palette.primary}1A`, alignItems: 'center', justifyContent: 'center' }}>
              <IconSunMoon size={18} color={palette.primary} />
            </View>
            <AppText style={{ flex: 1 }}>{t('profile.theme')}</AppText>
          </View>
          <Segmented<ThemeChoice>
            value={theme}
            onChange={setThemeChoice}
            options={[
              { value: 'system', label: t('profile.themeAuto') },
              { value: 'light', label: t('profile.themeLight') },
              { value: 'dark', label: t('profile.themeDark') },
            ]}
          />
          <AppText variant="caption" tone="muted">
            {t('profile.appearance')}
          </AppText>
        </View>
        <Row
          icon={twoFactor ? IconShieldCheck : IconShieldOff}
          tone={twoFactor ? palette.success : palette.textMuted}
          label={t(twoFactor ? 'profile.twoFactorOn' : 'profile.twoFactorOff')}
        />
        <Row icon={IconInfoCircle} tone={palette.teal} label={t('settings.mode')} value={authMode === 'api' ? t('settings.modeLive') : t('settings.modeDemo')} />
        <Row icon={IconInfoCircle} tone={palette.teal} label={t('settings.version')} value={Constants.expoConfig?.version ?? '1.0.0'} />
      </Card>

      <Button label={t('profile.signOut')} tone="danger" icon={IconLogout} onPress={signOut} />
    </Page>
  );
}
