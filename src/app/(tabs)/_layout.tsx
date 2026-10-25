import { IconChartBar, IconInbox, IconReceipt, IconHome } from '@tabler/icons-react-native';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { holds, useAcknowledgements, useInbox, useMyDashboard } from '@/api/live';
import { useAppSession } from '@/auth/use-app-session';
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
  const { user } = useAppSession();
  const myDashboard = useMyDashboard();
  // The tabs follow the person's rights, as the web menu does: Inbox for those who approve, or who
  // hold a float or have cash to acknowledge (being listed as a recipient alone is not enough) and
  // whose role acknowledges: an employee's cash counts when paid, with nothing to confirm (manager's
  // review). Reports for those whose role may see them. The demo's employee decides nothing and sees no reports.
  const acknowledges = user ? holds(user, 'Acknowledgements', 'acknowledge') : persona !== 'employee';
  const holdsCash = !!myDashboard.data && (myDashboard.data.custodian.length > 0 || myDashboard.data.toAcknowledge.length > 0);
  const showInbox = user ? holds(user, 'ApprovalInbox') || (holdsCash && acknowledges) : persona !== 'employee';
  const showReports = user ? holds(user, 'Reports') : persona !== 'employee';
  // The Inbox's count: requests the person can decide now, and cash paid to them not yet confirmed.
  const inbox = useInbox(showInbox);
  const acks = useAcknowledgements(showInbox && acknowledges);
  const waiting = user
    ? (inbox.data?.filter((i) => i.canDecide).length ?? 0) + (acks.data?.filter((a) => a.recipientId === user.employeeId && !a.acknowledgement).length ?? 0)
    : inboxFor(state, personId).length + acksFor(state, personId).length;

  const tabs = [
    <TabTrigger key="home" name="home" href="/" asChild>
      <TabButton icon={IconHome} label={t('tabs.home')} />
    </TabTrigger>,
    <TabTrigger key="claims" name="claims" href="/claims" asChild>
      <TabButton icon={IconReceipt} label={t('tabs.claims')} />
    </TabTrigger>,
    showInbox ? (
      <TabTrigger key="inbox" name="inbox" href="/inbox" asChild>
        <TabButton icon={IconInbox} label={t('tabs.inbox')} badge={waiting} />
      </TabTrigger>
    ) : null,
    showReports ? (
      <TabTrigger key="reports" name="reports" href="/reports" asChild>
        <TabButton icon={IconChartBar} label={t('tabs.reports')} />
      </TabTrigger>
    ) : null,
  ].filter(Boolean);
  // Submit Bill sits in the middle: second of three, third of four or five.
  tabs.splice(Math.floor((tabs.length + 1) / 2), 0, (
    <TabTrigger key="scan" name="scan" href="/scan" asChild>
      <ScanButton label={t('tabs.scan')} />
    </TabTrigger>
  ));

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
        {tabs}
      </TabList>
    </Tabs>
  );
}
