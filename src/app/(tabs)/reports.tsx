import { IconChartBar } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';

export default function ReportsScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('tabs.reports')}>
      <Placeholder icon={IconChartBar} body={t('placeholder.reports')} />
    </Screen>
  );
}
