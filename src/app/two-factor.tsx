import { IconArrowLeft, IconArrowRight, IconShieldLock } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button, Field } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { personas, type Persona } from '@/mock/master';
import { signIn } from '@/mock/store';
import { fonts, radius, space, usePalette } from '@/theme/tokens';

export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const { persona } = useLocalSearchParams<{ persona: Persona }>();
  const chosen = personas.find((p) => p.persona === persona) ?? personas[0];
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string | null>(null);
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<TextInput>(null);

  const verify = () => {
    if (recovery === null && code.length !== 6) return setError(t('web:auth.twoFactor.incomplete'));
    if (recovery !== null && recovery.trim().length < 8) return setError(t('web:auth.twoFactor.wrongCode'));
    signIn(chosen.persona, chosen.personId);
  };

  const Back = isRTL ? IconArrowRight : IconArrowLeft;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xxl, gap: space.xl }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', paddingVertical: space.sm }}>
          <Back size={20} color={palette.text} />
          <AppText weight="medium">{t('web:auth.twoFactor.back')}</AppText>
        </Pressable>

        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <IconShieldLock size={32} color={palette.primary} strokeWidth={1.8} />
        </View>

        <View style={{ gap: space.sm }}>
          <AppText variant="heading" weight="bold" accessibilityRole="header">
            {t(recovery === null ? 'web:auth.twoFactor.title' : 'web:auth.twoFactor.recoveryTitle')}
          </AppText>
          <AppText tone="secondary">{t(recovery === null ? 'web:auth.twoFactor.subtitle' : 'web:auth.twoFactor.recoveryHint')}</AppText>
        </View>

        {recovery === null ? (
          <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t('web:auth.twoFactor.subtitle')} style={{ direction: 'ltr' }}>
            <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'space-between' }}>
              {Array.from({ length: 6 }, (_, i) => {
                const filled = code[i];
                const active = i === Math.min(code.length, 5);
                return (
                  <View key={i} style={{ flex: 1, aspectRatio: 0.86, maxWidth: 58, borderRadius: radius.lg, borderWidth: 2, borderColor: error ? palette.danger : active ? palette.primary : palette.border, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText align="center" style={{ fontFamily: fonts.semibold, fontSize: 26, lineHeight: 32 }}>
                      {filled ?? ''}
                    </AppText>
                  </View>
                );
              })}
            </View>
            <TextInput
              ref={input}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
            />
          </Pressable>
        ) : (
          <Field label={t('web:auth.twoFactor.recoveryTitle')} value={recovery} onChangeText={(v) => { setRecovery(v); setError(null); }} autoCapitalize="characters" maxLength={20} placeholder="XXXX-XXXX" />
        )}

        {error ? <AppText tone="danger">{error}</AppText> : <AppText variant="small" tone="muted">{t('web:auth.twoFactor.demoHint')}</AppText>}

        <Pressable onPress={() => { setRecovery(recovery === null ? '' : null); setError(null); }} accessibilityRole="button">
          <AppText weight="semibold" tone="primary">
            {t(recovery === null ? 'web:auth.twoFactor.useRecovery' : 'web:auth.twoFactor.useApp')}
          </AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
          <AppText style={{ flex: 1 }}>{t('web:auth.twoFactor.trustDevice')}</AppText>
          <Switch value={trust} onValueChange={setTrust} trackColor={{ true: palette.primary, false: palette.border }} />
        </View>

        <Button label={t('web:auth.twoFactor.verify')} onPress={verify} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
