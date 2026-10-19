import { IconCircleCheck } from '@tabler/icons-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { nameOf, omr, person } from '@/lib/format';
import { useMockState } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

export default function ScanDoneScreen() {
  const { id, resent } = useLocalSearchParams<{ id: string; resent?: string }>();
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { language, isRTL } = useLanguage();
  const claim = useMockState().claims.find((c) => c.id === id);
  const waitingFor = claim?.currentStep !== undefined ? claim.route[claim.currentStep].approverIds.map((p) => nameOf(person(p), language.code)).join(', ') : '';

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, direction: isRTL ? 'rtl' : 'ltr', paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.lg), paddingHorizontal: space.xl }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: palette.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <IconCircleCheck size={56} color={palette.success} strokeWidth={1.6} />
        </View>
        <AppText variant="heading" weight="bold" align="center">
          {t(resent ? 'scan.resentTitle' : 'scan.sentTitle')}
        </AppText>
        {claim ? (
          <>
            <AppText variant="display" weight="bold" align="center" style={{ fontVariant: ['tabular-nums'] }}>
              {omr(claim.gross, language.code)}
            </AppText>
            <AppText tone="secondary" align="center" style={{ maxWidth: 320 }}>
              {t('scan.sentText', { reference: claim.reference, name: waitingFor })}
            </AppText>
          </>
        ) : null}
      </View>
      <View style={{ gap: space.sm }}>
        {claim ? <Button label={t('scan.viewClaim')} onPress={() => router.replace({ pathname: '/claim/[id]', params: { id: claim.id } })} /> : null}
        <Button label={t('web:scan.startAgain')} tone="secondary" onPress={() => router.replace('/scan')} />
      </View>
    </View>
  );
}
