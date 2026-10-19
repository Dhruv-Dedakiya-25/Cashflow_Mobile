import { IconBulb, IconCamera, IconFileInvoice, IconFocusCentered, IconKeyboard, IconPhoto } from '@tabler/icons-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { radius, space, usePalette } from '@/theme/tokens';

function Option({ icon: IconComponent, label, onPress }: { icon: typeof IconPhoto; label: string; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Card onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <IconComponent size={22} color={palette.primary} strokeWidth={1.9} />
      </View>
      <AppText variant="small" weight="semibold" align="center">
        {label}
      </AppText>
    </Card>
  );
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const [denied, setDenied] = useState(false);

  const open = (uri?: string) => router.push({ pathname: '/scan-review', params: uri ? { uri } : { sample: '1' } });

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setDenied(true);
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ['images'] });
    if (!result.canceled) open(result.assets[0].uri);
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
    if (!result.canceled) open(result.assets[0].uri);
  };

  return (
    <Screen title={t('tabs.scan')} subtitle={t('web:scan.subtitle')}>
      <Pressable onPress={takePhoto} accessibilityRole="button" style={({ pressed }) => ({ borderRadius: radius.xl, overflow: 'hidden', transform: [{ scale: pressed ? 0.99 : 1 }] })}>
        <View style={{ backgroundColor: palette.primary, padding: space.xl, gap: space.lg, minHeight: 210, justifyContent: 'space-between' }}>
          <View style={{ position: 'absolute', end: -40, bottom: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ position: 'absolute', end: 40, top: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <IconCamera size={32} color={palette.onPrimary} strokeWidth={1.8} />
          </View>
          <View style={{ gap: 4 }}>
            <AppText variant="title" weight="bold" tone="onPrimary">
              {t('scan.takePhoto')}
            </AppText>
            <AppText tone="onPrimary" style={{ opacity: 0.85 }}>
              {t('scan.takePhotoHint')}
            </AppText>
          </View>
        </View>
      </Pressable>

      {denied ? <AppText tone="danger">{t('scan.cameraDenied')}</AppText> : null}

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Option icon={IconPhoto} label={t('scan.choosePhoto')} onPress={choosePhoto} />
        <Option icon={IconFileInvoice} label={t('web:scan.useSample')} onPress={() => open()} />
      </View>

      <Card style={{ gap: space.md }}>
        {[
          { icon: IconFocusCentered, text: t('web:scan.tip.whole') },
          { icon: IconBulb, text: t('web:scan.tip.light') },
        ].map(({ icon: IconComponent, text }) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconComponent size={20} color={palette.teal} />
            <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
              {text}
            </AppText>
          </View>
        ))}
      </Card>

      <Pressable onPress={() => router.push({ pathname: '/scan-review', params: { manual: '1' } })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.md }}>
        <IconKeyboard size={18} color={palette.primary} />
        <AppText weight="semibold" tone="primary">
          {t('web:scan.noReceipt')} {t('scan.manual')}
        </AppText>
      </Pressable>
    </Screen>
  );
}
