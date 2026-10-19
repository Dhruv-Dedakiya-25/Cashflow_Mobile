import { IconArrowBackUp, IconCheck, IconClock, IconPlayerSkipForward, IconX } from '@tabler/icons-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { RouteStep } from '@/api/types';
import { AppText } from '@/components/app-text';
import { useLanguage } from '@/i18n';
import { dateTime, nameOf, person } from '@/lib/format';
import { space, usePalette } from '@/theme/tokens';

/** The steps a request goes through, each with who decides it and where it stands. */
export function ApprovalPath({ route }: { route: RouteStep[] }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const { language } = useLanguage();
  if (!route.length) return <AppText tone="muted">{t('web:txn.path.notSent')}</AppText>;

  return (
    <View>
      {route.map((step, i) => {
        const look = {
          approved: { color: palette.success, bg: palette.successSoft, icon: IconCheck },
          pending: { color: palette.warning, bg: palette.warningSoft, icon: IconClock },
          waiting: { color: palette.textMuted, bg: palette.surfaceStrong, icon: IconClock },
          skipped: { color: palette.textMuted, bg: palette.surfaceStrong, icon: IconPlayerSkipForward },
          returned: { color: palette.danger, bg: palette.dangerSoft, icon: IconArrowBackUp },
          rejected: { color: palette.danger, bg: palette.dangerSoft, icon: IconX },
        }[step.state];
        const IconComponent = look.icon;
        const approvers = step.approverIds.map((id) => person(id));
        const names = approvers.map((p) => nameOf(p, language.code)).join(', ');
        const decider = person(step.approvedByIds[0] ?? step.approverIds[0]);
        const last = i === route.length - 1;
        let note: string;
        if (step.state === 'skipped') note = t(`web:workflow.example.why.${step.skipReason}`, { defaultValue: t('web:txn.path.state.skipped') });
        else if ((step.state === 'approved' || step.state === 'returned' || step.state === 'rejected') && step.decidedAtUtc)
          note = t(`web:txn.path.decidedBy.${step.state}`, { name: nameOf(decider, language.code), time: dateTime(step.decidedAtUtc, language.code) });
        else if (step.state === 'pending' && step.startedAtUtc) note = t('web:txn.path.waitingSince', { time: dateTime(step.startedAtUtc, language.code), hours: step.slaHours });
        else note = t('web:txn.path.state.waiting');

        return (
          <View key={step.stepId} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                <IconComponent size={16} color={look.color} strokeWidth={2.4} />
              </View>
              {!last ? <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: palette.border, marginVertical: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : space.lg, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                  {names || t('web:txn.path.state.skipped')}
                </AppText>
                <AppText variant="caption" weight="semibold" style={{ color: look.color }}>
                  {t(`web:txn.path.state.${step.state}`)}
                </AppText>
              </View>
              {approvers[0] ? (
                <AppText variant="caption" tone="muted">
                  {approvers[0].designation}
                </AppText>
              ) : null}
              <AppText variant="small" tone="secondary">
                {note}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
