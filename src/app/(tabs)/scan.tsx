import { IconCamera } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';

export default function ScanScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('tabs.scan')}>
      <Placeholder icon={IconCamera} body={t('placeholder.scan')} />
    </Screen>
  );
}
