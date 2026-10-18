import type { Icon } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, space, usePalette } from '@/theme/tokens';

/** Stands in for a screen until its design is done: what the screen will hold, and that it is being designed. */
export function Placeholder({ icon: IconComponent, body }: { icon: Icon; body: string }) {
  const palette = usePalette();
  const { t } = useTranslation();
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: radius.xl,
        paddingVertical: space.xxxl,
        paddingHorizontal: space.xxl,
        alignItems: 'center',
        gap: space.lg,
      }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: palette.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <IconComponent size={30} color={palette.primary} strokeWidth={1.8} />
      </View>
      <AppText variant="bodyLarge" tone="secondary" align="center" style={{ maxWidth: 300 }}>
        {body}
      </AppText>
      <View style={{ backgroundColor: palette.surfaceStrong, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs }}>
        <AppText variant="caption" weight="semibold" tone="muted" align="center">
          {t('placeholder.next')}
        </AppText>
      </View>
    </View>
  );
}
