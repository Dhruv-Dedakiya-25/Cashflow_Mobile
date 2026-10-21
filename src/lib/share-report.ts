/**
 * A report as a file in the phone's share sheet: a PDF drawn from a plain table, or a CSV that Excel
 * and Numbers open (with a byte-order mark, so Arabic names come through). The figures come from the
 * API's own export, which records the export in the Audit Log as the web's do.
 */
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import i18n from '@/i18n';

export type ReportTable = {
  title: string;
  /** The lines under the title: the period, the search, who exported it. */
  details: string[];
  columns: { label: string; numeric?: boolean }[];
  rows: (string | number)[][];
  totals?: (string | number)[];
};

const html = (s: string | number) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const csv = (s: string | number) => (/[",\r\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));

function pdfPage(table: ReportTable, rtl: boolean) {
  const cell = (tag: 'td' | 'th', value: string | number, i: number) => `<${tag}${table.columns[i]?.numeric ? ' class="n"' : ''}>${html(value)}</${tag}>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 11px; color: #172033; margin: 28px; }
    h1 { font-size: 18px; margin: 0 0 6px; } p { margin: 0 0 2px; color: #53627A; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { text-align: start; background: #EEF2F7; padding: 6px; font-weight: 600; }
    td { padding: 6px; border-bottom: 1px solid #E4E9F1; vertical-align: top; }
    .n { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
    tfoot td { font-weight: 700; border-top: 2px solid #172033; border-bottom: 0; }
  </style></head><body dir="${rtl ? 'rtl' : 'ltr'}">
    <h1>${html(table.title)}</h1>${table.details.map((d) => `<p>${html(d)}</p>`).join('')}
    <table><thead><tr>${table.columns.map((c, i) => cell('th', c.label, i)).join('')}</tr></thead>
    <tbody>${table.rows.map((r) => `<tr>${r.map((v, i) => cell('td', v, i)).join('')}</tr>`).join('')}</tbody>
    ${table.totals ? `<tfoot><tr>${table.totals.map((v, i) => cell('td', v, i)).join('')}</tr></tfoot>` : ''}</table>
  </body></html>`;
}

/** Refuses before anything is exported when the device cannot share, so the Audit Log records only real exports. */
export async function ensureCanShare() {
  if (!(await Sharing.isAvailableAsync())) throw new Error(i18n.t('live.report.noShare'));
}

/** Makes the file and opens the share sheet. `name` becomes the CSV's file name. */
export async function shareReport(table: ReportTable, format: 'pdf' | 'excel', name: string, rtl: boolean) {
  if (format === 'pdf') {
    const { uri } = await Print.printToFileAsync({ html: pdfPage(table, rtl) });
    return Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: table.title });
  }
  const lines = [table.columns.map((c) => c.label), ...table.rows, ...(table.totals ? [table.totals] : [])];
  const file = new File(Paths.cache, `${name}.csv`);
  file.create({ overwrite: true });
  file.write(`﻿${lines.map((r) => r.map(csv).join(',')).join('\r\n')}`);
  return Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: table.title });
}
