import { IconCheck } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useEnabledLanguages } from '@/api/live';
import { AppText } from '@/components/app-text';
import { Page } from '@/components/page';
import { Card } from '@/components/ui';
import { setLanguage, useLanguage } from '@/i18n';
import { appLanguages } from '@/i18n/languages';
import { space, usePalette } from '@/theme/tokens';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  // Live: the languages the administrator has switched on, keeping the one in use; demo: all 29.
  const enabled = useEnabledLanguages().data;
  const offered = enabled ? appLanguages.filter((l) => enabled.includes(l.code) || l.code === language.code) : appLanguages;

  return (
    <Page title={t('settings.language')}>
      <Card padded={false} style={{ gap: 0, overflow: 'hidden' }}>
        {offered.map((l, i) => {
          const selected = l.code === language.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                minHeight: 54,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: palette.border,
                backgroundColor: pressed ? palette.surfaceStrong : selected ? palette.primarySoft : 'transparent',
              })}>
              <View style={{ flex: 1 }}>
                <AppText weight={selected ? 'semibold' : 'medium'}>{l.nativeName}</AppText>
                {l.nativeName !== l.name ? (
                  <AppText variant="small" tone="muted">
                    {l.name}
                  </AppText>
                ) : null}
              </View>
              {selected ? <IconCheck size={20} color={palette.primary} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
      </Card>
    </Page>
  );
}
