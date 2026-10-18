import { IconLayoutDashboard, IconSettings } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';
import { useLanguage } from '@/i18n';
import { usePalette } from '@/theme/tokens';

function greetingKey(hour: number) {
  if (hour < 12) return 'home.morning';
  if (hour < 17) return 'home.afternoon';
  return 'home.evening';
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  const now = new Date();
  const today = new Intl.DateTimeFormat(language.code, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);

  return (
    <Screen
      eyebrow={today}
      title={t(greetingKey(now.getHours()))}
      subtitle={t('home.subtitle')}
      action={
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.open')}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}>
          <IconSettings size={22} color={palette.textSecondary} strokeWidth={1.8} />
        </Pressable>
      }>
      <Placeholder icon={IconLayoutDashboard} body={t('placeholder.home')} />
    </Screen>
  );
}
