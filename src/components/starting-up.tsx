import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui';
import { logout } from '@/auth/session';
import { space, usePalette } from '@/theme/tokens';

/** Shown after signing in while the names behind the ids load, or when they could not. */
export function StartingUp({ error, onRetry }: { error?: Error | null; onRetry: () => void }) {
  const { t } = useTranslation();
  const palette = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl }}>
      <BrandMark size={56} />
      {error ? (
        <>
          <AppText tone="secondary" align="center" style={{ maxWidth: 320 }}>
            {error.message}
          </AppText>
          <View style={{ alignSelf: 'stretch', gap: space.sm, maxWidth: 360, width: '100%' }}>
            <Button label={t('live.retry')} onPress={onRetry} />
            <Button label={t('profile.signOut')} tone="ghost" onPress={logout} />
          </View>
        </>
      ) : (
        <ActivityIndicator color={palette.primary} />
      )}
    </View>
  );
}
