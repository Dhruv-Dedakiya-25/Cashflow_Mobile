import { IconEye, IconEyeOff, IconInfoCircle, IconShieldCheck } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { SignInFrame } from '@/components/sign-in-frame';
import { Button, Field } from '@/components/ui';
import { login, SignInError, useAuth } from '@/auth/session';
import { radius, space, usePalette } from '@/theme/tokens';

/** Live mode: a real username and password, checked by the API. */
export function LiveSignIn() {
  const { t } = useTranslation();
  const palette = usePalette();
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInput = useRef<TextInput>(null);
  const notice = auth.status === 'signedOut' ? auth.notice : undefined;

  const submit = async () => {
    if (!username.trim() || !password) return setError(t('live.signIn.missing'));
    setBusy(true);
    setError(null);
    try {
      const challenge = await login(username.trim(), password, keepSignedIn);
      // Without a challenge the session has started, and the app moves on to Home by itself.
      if (challenge) router.push(challenge.kind === 'enroll' ? '/two-factor-setup' : '/two-factor');
    } catch (e) {
      const reason = e instanceof SignInError && (e.reason === 'tooMany' || e.reason === 'noApi') ? e.reason : 'invalid';
      setError(t(`web:auth.error.${reason}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SignInFrame title={t('web:auth.signIn')} hint={t('web:auth.signInHintApi')}>
      {notice ? (
        <View style={{ flexDirection: 'row', gap: space.sm, backgroundColor: notice === 'passwordChanged' ? palette.successSoft : palette.warningSoft, borderRadius: radius.lg, padding: space.md }}>
          <IconInfoCircle size={20} color={notice === 'passwordChanged' ? palette.success : palette.warning} />
          <AppText variant="small" style={{ flex: 1 }}>
            {t(`live.notice.${notice}`)}
          </AppText>
        </View>
      ) : null}

      <Field
        label={t('web:auth.username')}
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordInput.current?.focus()}
      />
      <Field
        ref={passwordInput}
        label={t('web:auth.password')}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(null);
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        right={
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t(showPassword ? 'live.signIn.hidePassword' : 'live.signIn.showPassword')}>
            {showPassword ? <IconEyeOff size={20} color={palette.textMuted} /> : <IconEye size={20} color={palette.textMuted} />}
          </Pressable>
        }
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText>{t('web:auth.rememberMe')}</AppText>
        <Switch value={keepSignedIn} onValueChange={setKeepSignedIn} accessibilityLabel={t('web:auth.rememberMe')} trackColor={{ true: palette.primary, false: palette.border }} />
      </View>

      {error ? <AppText tone="danger">{error}</AppText> : null}

      <Button label={t('web:auth.signInButton')} loading={busy} onPress={submit} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' }}>
        <IconShieldCheck size={16} color={palette.success} />
        <AppText variant="caption" tone="muted" align="center" style={{ flexShrink: 1 }}>
          {t('web:auth.twoFactorNote')}
        </AppText>
      </View>
    </SignInFrame>
  );
}
