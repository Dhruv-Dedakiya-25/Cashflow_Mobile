import { IconFileSpreadsheet, IconFileTypePdf } from '@tabler/icons-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { exportReport, holds } from '@/api/live';
import type { GroupReport, TransactionReport } from '@/api/types';
import { useAppSession } from '@/auth/use-app-session';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { reportRange, useReportFilter } from '@/lib/filters';
import { accountOf, dateTime, longDate } from '@/lib/format';
import { reportTable } from '@/lib/report-tables';
import { ensureCanShare, shareReport } from '@/lib/share-report';
import type { ReportView } from '@/mock/report';
import { space } from '@/theme/tokens';

/**
 * Share as PDF or Excel, for those whose role may export reports, as on the web. The figures are
 * fetched again as an export, so the API records who exported what in the Audit Log.
 */
export function ReportShare({ view }: { view: ReportView }) {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const code = language.code;
  const { user } = useAppSession();
  const { period, search } = useReportFilter();
  const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!user || !holds(user, 'Reports', 'export')) return null;

  const share = async (format: 'pdf' | 'excel') => {
    const range = reportRange(period);
    const filters = [t('web:report.periodClaims', { from: longDate(range.from, code), to: longDate(range.to, code) }), ...(search.trim() ? [`${t('web:report.filter.search')}: ${search.trim()}`] : [])];
    setBusy(format);
    setError(null);
    try {
      await ensureCanShare();
      const data = await exportReport<GroupReport | TransactionReport>(view, range, search, format, filters.join(' · '));
      const details = [...filters, t('web:export.footer', { name: accountOf(user, code).name, time: dateTime(new Date().toISOString(), code) })];
      await shareReport(reportTable(view, data, t, code, details), format, `cashflow-${view}-${range.from}-${range.to}`, isRTL);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={t('live.report.pdf')} tone="secondary" icon={IconFileTypePdf} loading={busy === 'pdf'} disabled={!!busy} onPress={() => share('pdf')} compact />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('live.report.excel')} tone="secondary" icon={IconFileSpreadsheet} loading={busy === 'excel'} disabled={!!busy} onPress={() => share('excel')} compact />
        </View>
      </View>
      {error ? <AppText variant="small" tone="danger">{error}</AppText> : null}
    </View>
  );
}
