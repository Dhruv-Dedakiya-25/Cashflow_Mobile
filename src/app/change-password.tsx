import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { changePassword } from '@/api/live';
import { AppText } from '@/components/app-text';
import { SignInFrame } from '@/components/sign-in-frame';
import { Button, Field } from '@/components/ui';
import { logout, signOutHere } from '@/auth/session';

/** An administrator chose this password: the API accepts nothing else until the person picks their own. */
export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!current || !next) return setError(t('live.password.missing'));
    if (next !== repeat) return setError(t('web:passwordsDoNotMatch'));
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      // The change ends every session, this one too: sign in again with the new password.
      await signOutHere('passwordChanged');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, autoComplete: 'current-password' | 'new-password', hint?: string) => (
    <Field
      label={label}
      hint={hint}
      value={value}
      onChangeText={(v) => {
        set(v);
        setError(null);
      }}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={autoComplete === 'current-password' ? 'password' : 'newPassword'}
    />
  );

  return (
    <SignInFrame title={t('web:changePassword')} hint={t('web:passwordChangeRequiredHint')}>
      {field(t('web:currentPassword'), current, setCurrent, 'current-password')}
      {field(t('web:newPassword'), next, setNext, 'new-password', t('web:passwordRule'))}
      {field(t('web:confirmNewPassword'), repeat, setRepeat, 'new-password')}
      {error ? <AppText tone="danger">{error}</AppText> : null}
      <Button label={t('web:updatePassword')} loading={busy} onPress={save} />
      <Button label={t('profile.signOut')} tone="ghost" onPress={logout} />
    </SignInFrame>
  );
}
