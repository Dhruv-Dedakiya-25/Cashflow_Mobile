import { IconCheck, IconLock, IconShieldCheck, IconUser } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { LiveSignIn } from '@/components/live-sign-in';
import { SignInFrame } from '@/components/sign-in-frame';
import { Avatar, Button, Field } from '@/components/ui';
import { authMode } from '@/config';
import { useLanguage } from '@/i18n';
import { nameOf, person } from '@/lib/format';
import { personas, type Persona } from '@/mock/master';
import { signIn } from '@/mock/store';
import { radius, space, usePalette } from '@/theme/tokens';

/** Managers and Finance must use two-factor sign-in in the sample's policy; employees need not. */
const needsTwoFactor = (persona: Persona) => persona !== 'employee';

export default function SignInScreen() {
  return authMode === 'api' ? <LiveSignIn /> : <DemoSignIn />;
}

/** Demo mode: pick one of the three sample people; nothing is checked. */
function DemoSignIn() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const [persona, setPersona] = useState<Persona>('employee');
  const chosen = personas.find((p) => p.persona === persona)!;

  const submit = () => {
    if (needsTwoFactor(persona)) router.push({ pathname: '/two-factor', params: { persona } });
    else signIn(persona, chosen.personId);
  };

  return (
    <SignInFrame title={t('web:auth.signIn')} hint={t('web:auth.signInHint')} demo>
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

      <Button label={t('web:auth.signInButton')} onPress={submit} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
        <IconShieldCheck size={16} color={palette.success} />
        <AppText variant="caption" tone="muted" align="center" style={{ flexShrink: 1 }}>
          {t('web:auth.twoFactorNote')}
        </AppText>
      </View>
    </SignInFrame>
  );
}
