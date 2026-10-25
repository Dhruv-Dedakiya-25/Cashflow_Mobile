import { IconBulb, IconCamera, IconFileInvoice, IconFileTypePdf, IconFocusCentered, IconKeyboard, IconPhoto, IconSparkles } from '@tabler/icons-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { useDocumentOptions } from '@/api/live';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { authMode } from '@/config';
import { radius, space, type, usePalette } from '@/theme/tokens';

/** One way to start a claim. The photo, what most people do, is the blue tile. */
function Tile({ icon: IconComponent, label, onPress, primary, badge }: { icon: typeof IconPhoto; label: string; onPress: () => void; primary?: boolean; badge?: string }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 132,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: primary ? palette.primary : palette.border,
        backgroundColor: primary ? (pressed ? palette.primaryPressed : palette.primary) : pressed ? palette.surface : palette.card,
      })}>
      {badge ? (
        <View style={{ position: 'absolute', top: space.sm, end: space.sm, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: primary ? 'rgba(255,255,255,0.22)' : palette.primarySoft }}>
          <IconSparkles size={12} color={primary ? palette.onPrimary : palette.primary} strokeWidth={2} />
          <AppText variant="caption" weight="bold" tone={primary ? 'onPrimary' : 'primary'} maxFontSizeMultiplier={1.2}>
            {badge}
          </AppText>
        </View>
      ) : null}
      <View style={{ width: 48, height: 48, borderRadius: radius.lg, backgroundColor: primary ? 'rgba(255,255,255,0.18)' : palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <IconComponent size={24} color={primary ? palette.onPrimary : palette.primary} strokeWidth={1.9} />
      </View>
      {/* Room for two lines, so the icons line up whether a label wraps or not. */}
      <AppText variant="small" weight="semibold" align="center" tone={primary ? 'onPrimary' : 'default'} style={{ minHeight: type.small.lineHeight * 2 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const [denied, setDenied] = useState(false);
  // The AI badge only while AI & Document Processing reads receipts; the demo always reads its sample.
  // Its word is the short form in every language (AI, KI, IA, ИИ…), so it never reaches the camera icon.
  const documents = useDocumentOptions();
  const aiReads = authMode === 'api' ? !!documents.data?.extractionEnabled : true;

  const open = (photo?: ImagePicker.ImagePickerAsset) =>
    router.push({ pathname: '/scan-review', params: photo ? { uri: photo.uri, width: String(photo.width) } : { sample: '1' } });

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setDenied(true);
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (!result.canceled) open(result.assets[0]);
  };

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (!result.canceled) open(result.assets[0]);
  };

  // A PDF bill is stored as it is; AI reads photos only, so its details are typed in.
  const choosePdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const pdf = result.assets[0];
    router.push({ pathname: '/scan-review', params: { pdf: pdf.uri, name: pdf.name, size: String(pdf.size ?? 0) } });
  };

  return (
    <Screen title={t('tabs.scan')} subtitle={t('web:scan.subtitle')}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Tile icon={IconCamera} label={t('scan.takePhoto')} onPress={takePhoto} primary badge={aiReads ? t('scan.ai') : undefined} />
          <Tile icon={IconKeyboard} label={t('web:reimb.entry.manual')} onPress={() => router.push({ pathname: '/scan-review', params: { manual: '1' } })} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Tile icon={IconPhoto} label={t('scan.choosePhoto')} onPress={choosePhoto} />
          {authMode === 'api' ? (
            <Tile icon={IconFileTypePdf} label={t('scan.choosePdf')} onPress={choosePdf} />
          ) : (
            <Tile icon={IconFileInvoice} label={t('web:scan.useSample')} onPress={() => open()} />
          )}
        </View>
      </View>

      {denied ? <AppText tone="danger">{t('scan.cameraDenied')}</AppText> : null}

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

    </Screen>
  );
}
