// Copies the web app's translations for words both apps share (statuses, claim fields,
// sign-in, approvals, receipt scanning) into src/locales/web, in all 29 languages, so the
// phone and the web read the same and nothing is translated twice.
//
//   node scripts/sync-web-strings.mjs [path to the web app's public/locales]
//
// Run it after the web's wording changes, and commit the result. The app never reads the
// web project at runtime.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webLocales = process.argv[2] ?? join(root, '..', 'CashFlow', 'public', 'locales');

const folders = {
  en: 'english', ar: 'arabic', bn: 'bengali', de: 'german', es: 'spanish', fa: 'persian', fr: 'french',
  he: 'hebrew', hi: 'hindi', id: 'indonesian', it: 'italian', ja: 'japanese', kn: 'kannada', ko: 'korean',
  ml: 'malayalam', ms: 'malay', ne: 'nepali', nl: 'dutch', pl: 'polish', pt: 'portuguese', ru: 'russian',
  si: 'sinhala', ta: 'tamil', th: 'thai', tr: 'turkish', uk: 'ukrainian', ur: 'urdu', vi: 'vietnamese',
  zh: 'chinese-simplified',
};

// [web namespace, path inside it]. The path is kept, so pages.scan.title becomes web:scan.title.
const sections = [
  ['common', 'action'],
  ['common', 'status'],
  ['pages', 'txn'],
  ['pages', 'auth'],
  ['pages', 'scan'],
  ['pages', 'approval'],
  ['pages', 'ack'],
  ['pages', 'claim'],
  ['pages', 'reimb'],
  ['pages', 'dash.my'],
  ['pages', 'dash.chart'],
  ['pages', 'dash.finance'],
  ['pages', 'dash.column'],
  ['pages', 'dash.attention'],
  ['pages', 'allocation'],
  ['pages', 'file'],
  ['pages', 'preExpense'],
  ['pages', 'report'],
  ['pages', 'payment'],
  ['masters', 'workflow.example.why'],
];

const pick = (tree, path) => path.split('.').reduce((node, key) => node?.[key], tree);

function place(target, path, value) {
  const keys = path.split('.');
  let node = target;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  node[keys.at(-1)] = value;
}

const outDir = join(root, 'src', 'locales', 'web');
mkdirSync(outDir, { recursive: true });

for (const [code, folder] of Object.entries(folders)) {
  const files = {};
  const out = {};
  for (const [ns, path] of sections) {
    files[ns] ??= JSON.parse(readFileSync(join(webLocales, folder, `${folder}.${ns}.json`), 'utf8'));
    const value = pick(files[ns], path);
    if (value === undefined) throw new Error(`${folder}.${ns}.json has no ${path}`);
    place(out, path, value);
  }
  writeFileSync(join(outDir, `${code}.json`), JSON.stringify(out, null, 2) + '\n');
}
console.log(`Copied ${sections.length} sections for ${Object.keys(folders).length} languages into src/locales/web.`);
