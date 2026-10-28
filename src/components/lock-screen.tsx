import { IconFaceId, IconFingerprint } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import type { AuthUser } from '@/api/types';
import { clearLock, unlock } from '@/auth/lock';
import { logout } from '@/auth/session';
import { SignInFrame } from '@/components/sign-in-frame';
import { Button } from '@/components/ui';

/** Over the app while it is locked: Face ID or a fingerprint opens it, and the password is always an option. */
export function LockScreen({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const name = (user.displayName ?? user.username).split(' ')[0];

  const ask = () => unlock(t('live.lock.prompt'), t('web:action.cancel')).catch(() => false);
  const tryUnlock = async () => {
    setBusy(true);
    await ask();
    setBusy(false);
  };

  // Asks straight away, as the phone's own lock does; the button is there after a cancel.
  useEffect(() => {
    void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SignInFrame title={t('live.lock.title', { name })} hint={t('live.lock.hint')}>
      <Button label={t('live.lock.unlock')} icon={Platform.OS === 'ios' ? IconFaceId : IconFingerprint} loading={busy} onPress={tryUnlock} />
      <Button
        label={t('live.lock.usePassword')}
        tone="ghost"
        disabled={busy}
        onPress={() => {
          clearLock();
          void logout();
        }}
      />
    </SignInFrame>
  );
}
