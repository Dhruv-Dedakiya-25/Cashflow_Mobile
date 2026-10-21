import type { GroupReport, ReportRow, TransactionReport } from '@/api/types';
import { amount, category, longDate, nameOf, person, unit, vendor } from '@/lib/format';
import { rowName, type ReportView } from '@/mock/report';

import type { ReportTable } from './share-report';

type T = (key: string, options?: Record<string, unknown>) => string;

/** What a summary row is about, as the names in rowName are looked up: a category, unit, person or merchant. */
export const rowKeyOf = (view: Exclude<ReportView, 'transactions'>, row: ReportRow) =>
  view === 'category' ? row.categoryId! : view === 'employee' ? row.employeeId! : view === 'vendor' ? (row.vendorId ?? `payee:${row.payeeName ?? ''}`) : row.unitId!;

/** A report as a table, for the PDF and the spreadsheet, with the columns the web's export has. */
export function reportTable(view: ReportView, data: GroupReport | TransactionReport, t: T, code: string, details: string[]): ReportTable {
  const money = (n?: number | null) => (n === undefined || n === null ? '' : amount(n, code));
  const title = `${t('tabs.reports')} · ${t(`web:report.column.${view}`)}`;

  if (view === 'transactions') {
    const d = data as TransactionReport;
    return {
      title,
      details,
      columns: [
        { label: t('web:report.column.reference') },
        { label: t('web:report.column.date') },
        { label: t('web:report.column.employee') },
        { label: t('web:report.column.vendor') },
        { label: t('web:report.column.category') },
        { label: t('web:report.column.charged') },
        { label: t('web:report.column.status') },
        { label: t('web:report.column.total'), numeric: true },
      ],
      rows: d.rows.map((r) => [
        r.reference,
        longDate(r.expenseDate, code),
        nameOf(person(r.beneficiaryId), code),
        r.vendorId ? nameOf(vendor(r.vendorId), code) : (r.payeeName ?? ''),
        nameOf(category(r.categoryId), code),
        nameOf(unit(r.costId), code),
        t(`web:report.status.${r.reportStatus}`),
        money(r.gross),
      ]),
      totals: [t('web:report.totalRow'), '', '', '', '', '', '', money(d.totals.claimed)],
    };
  }

  const d = data as GroupReport;
  const extra: { label: string; of: (r: ReportRow) => string | number; total: string | number }[] =
    view === 'category'
      ? [{ label: t('web:report.column.share'), of: (r) => `${Math.round((r.share ?? 0) * 10) / 10}%`, total: '100%' }]
      : view === 'department' || view === 'project'
        ? [
            { label: t('web:report.column.allocated'), of: (r) => money(r.allocated), total: money(d.totals.allocated) },
            { label: t('web:report.column.available'), of: (r) => money(r.available), total: money(d.totals.available) },
          ]
        : view === 'employee'
          ? [{ label: t('web:report.column.approved'), of: (r) => money(r.approved), total: '' }]
          : [];
  return {
    title,
    details,
    columns: [
      { label: t(`web:report.column.${view}`) },
      { label: t('web:report.column.claims'), numeric: true },
      { label: t('web:report.column.claimed'), numeric: true },
      ...extra.map((e) => ({ label: e.label, numeric: true })),
      { label: t('web:report.column.paid'), numeric: true },
      { label: t('web:report.column.pending'), numeric: true },
    ],
    rows: d.rows.map((r) => [rowName(view, rowKeyOf(view, r), code), r.claims, money(r.claimed), ...extra.map((e) => e.of(r)), money(r.paid), money(r.pending)]),
    totals: [t('web:report.totalRow'), d.totals.claims, money(d.totals.claimed), ...extra.map((e) => e.total), money(d.totals.paid), money(d.totals.pending)],
  };
}
