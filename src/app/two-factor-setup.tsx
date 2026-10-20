import { IconExternalLink } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, View } from 'react-native';

import type { AuthenticatorApp, TwoFactorSetup } from '@/api/types';
import { AppText } from '@/components/app-text';
import { SignInFrame } from '@/components/sign-in-frame';
import { Button, Chips, Field } from '@/components/ui';
import { confirmEnroll, finishEnroll, getChallenge, SignInError, startEnroll } from '@/auth/session';
import { radius, space, usePalette } from '@/theme/tokens';

const appNames: Record<AuthenticatorApp, string> = { google: 'Google Authenticator', microsoft: 'Microsoft Authenticator' };

/** Setting up 2FA during sign-in, for someone whose role must use it and who has not yet. */
export default function TwoFactorSetupScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const challenge = getChallenge();
  const allowed = challenge?.authenticators.length ? challenge.authenticators : (['google', 'microsoft'] as AuthenticatorApp[]);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [app, setApp] = useState<AuthenticatorApp>(allowed[0]);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  // Without a challenge (the app reopened here) there is nothing to set up: back to sign-in.
  const [error, setError] = useState<string | null>(challenge ? null : t('web:auth.twoFactor.expired'));

  const explain = (e: unknown) => {
    const reason = e instanceof SignInError ? e.reason : 'noApi';
    if (reason === 'tooMany' || reason === 'noApi') return t(`web:auth.error.${reason}`);
    return t(reason === 'wrongCode' ? 'web:auth.twoFactor.wrongCode' : 'web:auth.twoFactor.expired');
  };

  useEffect(() => {
    if (!challenge) return;
    startEnroll(challenge.challengeToken).then(setSetup, (e) => setError(explain(e)));
    // Started once, for the challenge this screen opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    if (!challenge) return;
    if (!/^\d{6}$/.test(code)) return setError(t('web:auth.twoFactor.incomplete'));
    setBusy(true);
    setError(null);
    try {
      setCodes(await confirmEnroll(challenge.challengeToken, code, app));
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  };

  if (codes) {
    return (
      <SignInFrame title={t('live.enroll.codesTitle')} hint={t('live.enroll.codesHint')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.md }}>
          {codes.map((c) => (
            <AppText key={c} selectable style={{ width: '47%', fontVariant: ['tabular-nums'], letterSpacing: 1 }} weight="semibold">
              {c}
            </AppText>
          ))}
        </View>
        <Button label={t('live.enroll.saved')} onPress={finishEnroll} />
      </SignInFrame>
    );
  }

  return (
    <SignInFrame title={t('web:auth.twoFactor.enrollTitle')} hint={t('web:auth.twoFactor.enrollSubtitle')}>
      {!setup && !error ? <ActivityIndicator color={palette.primary} /> : null}
      {setup ? (
        <>
          {allowed.length > 1 ? (
            <View style={{ gap: space.sm }}>
              <AppText variant="small" weight="medium" tone="secondary">
                {t('live.enroll.app')}
              </AppText>
              <Chips<AuthenticatorApp> value={app} onChange={setApp} options={allowed.map((a) => ({ value: a, label: appNames[a] }))} />
            </View>
          ) : null}

          <View style={{ gap: space.sm }}>
            <Button label={t('live.enroll.open')} icon={IconExternalLink} tone="secondary" onPress={() => Linking.openURL(setup.otpauthUri).catch(() => setError(t('live.enroll.noApp')))} />
            <AppText variant="caption" tone="muted">
              {t('live.enroll.openHint')}
            </AppText>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="small" weight="medium" tone="secondary">
              {t('live.enroll.key')}
            </AppText>
            <AppText selectable weight="semibold" style={{ backgroundColor: palette.surface, borderRadius: radius.md, padding: space.md, letterSpacing: 1.5, fontVariant: ['tabular-nums'] }}>
              {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
            </AppText>
          </View>

          <Field
            label={t('live.enroll.code')}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="123456"
          />
        </>
      ) : null}

      {error ? <AppText tone="danger">{error}</AppText> : null}
      {setup ? <Button label={t('live.enroll.confirm')} loading={busy} onPress={confirm} /> : null}
      <Button label={t('web:auth.twoFactor.back')} tone="ghost" onPress={() => router.back()} />
    </SignInFrame>
  );
}
