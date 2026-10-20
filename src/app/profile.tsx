import { IconChevronLeft, IconChevronRight, IconInfoCircle, IconLanguage, IconLogout, IconShieldCheck, IconShieldOff, IconSunMoon, type Icon } from '@tabler/icons-react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useMyTwoFactor } from '@/api/live';
import { logout } from '@/auth/session';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Avatar, Button, Card, Pill, Segmented } from '@/components/ui';
import { authMode } from '@/config';
import { setThemeChoice, useThemeChoice, type ThemeChoice } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/i18n';
import { accountOf, nameOf, person, role, unit } from '@/lib/format';
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
  const { user } = useAppSession();
  const twoFactorQuery = useMyTwoFactor();
  const theme = useThemeChoice();
  const code = language.code;

  // Live: the account, its employee record and role; demo: the sample person.
  const sample = person(personId);
  const account = user ? accountOf(user, code) : undefined;
  const me = account ?? { name: nameOf(sample, code), nameEn: sample?.nameEn ?? '', id: personId, employee: sample };
  const details = (account
    ? [nameOf(unit(account.employee?.departmentId ?? ''), code), user?.employeeCode]
    : [sample?.designation, nameOf(unit(sample?.departmentId ?? ''), code)]
  ).filter(Boolean).join(' · ');
  const badge = user ? nameOf(role(user.roleId), code) : t(`web:auth.persona.${persona}`);
  // Live: whether this person has set 2FA up; demo: the sample policy, on for managers and Finance.
  const twoFactor = user ? (twoFactorQuery.data ? !!twoFactorQuery.data.enrolledAtUtc : undefined) : persona !== 'employee';

  return (
    <Page title={t('profile.title')}>
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Avatar name={me.nameEn} id={me.id} size={76} />
        <AppText variant="title" weight="bold" align="center">
          {me.name}
        </AppText>
        {details ? (
          <AppText tone="secondary" align="center">
            {details}
          </AppText>
        ) : null}
        {badge ? (
          <View style={{ alignSelf: 'center' }}>
            <Pill label={badge} bg={palette.primarySoft} fg={palette.primary} />
          </View>
        ) : null}
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
        {twoFactor !== undefined ? (
          <Row
            icon={twoFactor ? IconShieldCheck : IconShieldOff}
            tone={twoFactor ? palette.success : palette.textMuted}
            label={t(twoFactor ? 'profile.twoFactorOn' : user ? 'live.twoFactorOff' : 'profile.twoFactorOff')}
          />
        ) : null}
        <Row icon={IconInfoCircle} tone={palette.teal} label={t('settings.mode')} value={authMode === 'api' ? t('settings.modeLive') : t('settings.modeDemo')} />
        <Row icon={IconInfoCircle} tone={palette.teal} label={t('settings.version')} value={Constants.expoConfig?.version ?? '1.0.0'} />
      </Card>

      <Button label={t('profile.signOut')} tone="danger" icon={IconLogout} onPress={user ? logout : signOut} />
    </Page>
  );
}
