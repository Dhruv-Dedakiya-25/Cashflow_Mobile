import { IconChartBar, IconInbox, IconReceipt, IconHome } from '@tabler/icons-react-native';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanButton, TabButton } from '@/components/tab-buttons';
import { useLanguage } from '@/i18n';
import { acksFor, inboxFor, useMockState, useSession } from '@/mock/store';
import { space, usePalette } from '@/theme/tokens';

export default function TabLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const state = useMockState();
  const { persona, personId } = useSession();
  // Employees decide nothing and see no reports, as their role's permissions say.
  const approves = persona !== 'employee';
  const waiting = inboxFor(state, personId).length + acksFor(state, personId).length;

  const claimsTab = (
    <TabTrigger name="claims" href="/claims" asChild>
      <TabButton icon={IconReceipt} label={t('tabs.claims')} />
    </TabTrigger>
  );
  const scanTab = (
    <TabTrigger name="scan" href="/scan" asChild>
      <ScanButton label={t('tabs.scan')} />
    </TabTrigger>
  );

  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          direction: isRTL ? 'rtl' : 'ltr',
          backgroundColor: palette.card,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          paddingHorizontal: space.xs,
          paddingBottom: Math.max(insets.bottom, space.sm),
          shadowColor: palette.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton icon={IconHome} label={t('tabs.home')} />
        </TabTrigger>
        {/* Submit Bill stays in the middle: second of three for employees, third of five for approvers. */}
        {approves ? claimsTab : scanTab}
        {approves ? scanTab : claimsTab}
        {approves ? (
          <TabTrigger name="inbox" href="/inbox" asChild>
            <TabButton icon={IconInbox} label={t('tabs.inbox')} badge={waiting} />
          </TabTrigger>
        ) : null}
        {approves ? (
          <TabTrigger name="reports" href="/reports" asChild>
            <TabButton icon={IconChartBar} label={t('tabs.reports')} />
          </TabTrigger>
        ) : null}
      </TabList>
    </Tabs>
  );
}
