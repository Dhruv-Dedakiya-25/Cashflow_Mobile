import { IconInbox } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/placeholder';
import { Screen } from '@/components/screen';

export default function InboxScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('tabs.inbox')}>
      <Placeholder icon={IconInbox} body={t('placeholder.inbox')} />
    </Screen>
  );
}
