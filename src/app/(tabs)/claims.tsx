import { IconReceipt } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';

export default function ClaimsScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('tabs.claims')}>
      <Placeholder icon={IconReceipt} body={t('placeholder.claims')} />
    </Screen>
  );
}
