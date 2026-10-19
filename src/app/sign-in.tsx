import { IconCheck, IconLock, IconShieldCheck, IconUser } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BrandMark } from '@/components/brand-mark';
import { Avatar, Button, Field, Pill } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { nameOf, person } from '@/lib/format';
import { personas, type Persona } from '@/mock/master';
import { signIn } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

/** Managers and Finance must use two-factor sign-in in the sample's policy; employees need not. */
export const needsTwoFactor = (persona: Persona) => persona !== 'employee';

export default function SignInScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { language, isRTL } = useLanguage();
  const [persona, setPersona] = useState<Persona>('employee');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const chosen = personas.find((p) => p.persona === persona)!;

  const submit = () => {
    if (needsTwoFactor(persona)) router.push({ pathname: '/two-factor', params: { persona } });
    else signIn(persona, chosen.personId);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: palette.hero, paddingTop: insets.top + space.xxl, paddingHorizontal: space.xl, paddingBottom: 64, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <BrandMark />
            <View style={{ flex: 1 }}>
              <AppText variant="title" weight="bold" style={{ color: palette.heroText }}>
                CashFlow
              </AppText>
              <AppText variant="small" style={{ color: palette.heroMuted }}>
                {t('web:auth.brandTagline')}
              </AppText>
            </View>
            <Pill label={t('web:auth.demoBadge')} bg={palette.heroAccent} fg={palette.heroAccentText} />
          </View>
          <AppText variant="body" style={{ color: palette.heroMuted, marginTop: space.sm }}>
            {t('web:auth.pitch')}
          </AppText>
        </View>

        <View style={{ marginTop: -40, marginHorizontal: space.lg, backgroundColor: palette.card, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, padding: space.xl, gap: space.lg, shadowColor: palette.shadow, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="heading" weight="bold" accessibilityRole="header">
              {t('web:auth.signIn')}
            </AppText>
            <AppText tone="secondary">{t('web:auth.signInHint')}</AppText>
          </View>

          <View style={{ gap: space.sm }}>
            <AppText variant="small" weight="semibold" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {t('web:auth.personaLabel')}
            </AppText>
            {personas.map((p) => {
              const who = person(p.personId)!;
              const on = p.persona === persona;
              return (
                <Pressable
                  key={p.persona}
                  onPress={() => setPersona(p.persona)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: on ? palette.primary : palette.border, backgroundColor: on ? palette.primarySoft : palette.card }}>
                  <Avatar name={who.nameEn} id={who.id} size={42} />
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold">{nameOf(who, language.code)}</AppText>
                    <AppText variant="small" tone="secondary">
                      {t(`web:auth.persona.${p.persona}`)}
                    </AppText>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? palette.primary : palette.border, backgroundColor: on ? palette.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <IconCheck size={14} color={palette.onPrimary} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Field label={t('web:auth.username')} value={chosen.username} editable={false} right={<IconUser size={18} color={palette.textMuted} />} />
          <Field label={t('web:auth.password')} value="••••••••" editable={false} secureTextEntry hint={t('web:auth.passwordDemoHint')} right={<IconLock size={18} color={palette.textMuted} />} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText>{t('web:auth.rememberMe')}</AppText>
            <Switch value={keepSignedIn} onValueChange={setKeepSignedIn} trackColor={{ true: palette.primary, false: palette.border }} />
          </View>

          <Button label={t('web:auth.signInButton')} onPress={submit} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
            <IconShieldCheck size={16} color={palette.success} />
            <AppText variant="caption" tone="muted" align="center" style={{ flexShrink: 1 }}>
              {t('web:auth.twoFactorNote')}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
