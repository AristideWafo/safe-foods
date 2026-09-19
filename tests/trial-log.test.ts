import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Product, ScanHistoryItem } from '../src/types';
import { sanitizeStoredState, useStore } from '../src/store/useStore';
import { HISTORY_LIMIT, HISTORY_WARN_AT, historyCapacityNotice } from '../src/constants/history';
import { BOM, buildTrialCsv, shareTrialCsv, TRIAL_CSV_COLUMNS } from '../src/services/TrialLog';
import { parseLabelCheck, parseStatus } from '../src/services/LabelCheck';
import { ResultView } from '../src/pages/Result';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import { DEFAULT_CUSTOM_ALLERGENS } from '../src/constants/customAllergens';

const product: Product = { barcode: '3017620422003', name: 'Biscuit test', ingredientsText: 'farine, lait', allergensHierarchy: ['en:milk'], tracesTags: [] };
const scanOf = (over: Partial<ScanHistoryItem> & { name?: string } = {}): ScanHistoryItem => {
  const { name, ...rest } = over;
  return { id: 'x', date: 1000, barcode: product.barcode, product: { ...product, ...(name ? { name } : {}) },
    result: { status: 'AVOID', explanation: '', detectedAllergens: ['milk'], detectedTraces: [] }, ...rest };
};
// Minimal RFC 4180 reader: proves every record stays on one row with the expected number of fields.
const parseCsv = (text: string) => {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch; continue; }
    if (ch === '"') quoted = true; else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
};

test('verdict at scan is stored and survives a profile change', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const id = useStore.getState().recordScan(product);
  assert.equal(useStore.getState().history[0].statusAtScan, 'AVOID');
  useStore.getState().toggleAllergy('milk');
  const item = useStore.getState().history.find(scan => scan.id === id);
  assert.equal(item?.statusAtScan, 'AVOID'); assert.equal(item?.result.status, 'UNCERTAIN');
});

test('label check is saved, trimmed, capped and does not change the analysis', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const id = useStore.getState().recordScan(product);
  const before = useStore.getState().history[0].result.status;
  useStore.getState().setLabelCheck(id, 'has_allergen', `  ${'x'.repeat(400)}  `);
  const item = useStore.getState().history[0];
  assert.equal(item.labelCheck?.truth, 'has_allergen'); assert.equal(item.labelCheck?.note?.length, 300);
  assert.equal(item.result.status, before);
  useStore.getState().setLabelCheck(id, 'unsure');
  assert.equal(useStore.getState().history[0].labelCheck?.note, undefined);
});

test('label check on an unknown id is a no-op; a blank note is dropped; saving again replaces the check', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const id = useStore.getState().recordScan(product);
  useStore.getState().setLabelCheck('missing', 'unsure', 'x');
  assert.equal(useStore.getState().history[0].labelCheck, undefined);
  useStore.getState().setLabelCheck(id, 'unsure', '   ');
  assert.deepEqual(Object.keys(useStore.getState().history[0].labelCheck ?? {}).sort(), ['at', 'truth']);
  useStore.getState().setLabelCheck(id, 'no_allergen', 'ok');
  assert.equal(useStore.getState().history[0].labelCheck?.truth, 'no_allergen'); assert.equal(useStore.getState().history[0].labelCheck?.note, 'ok');
});

test('stored label checks are validated and old scans stay valid', () => {
  assert.equal(parseLabelCheck({ truth: 'bogus', at: 1 }), undefined);
  assert.equal(parseLabelCheck({ truth: 'unsure', at: Number.NaN }), undefined);
  assert.equal(parseLabelCheck({ truth: 'unsure', at: Infinity }), undefined);
  assert.equal(parseLabelCheck(null), undefined); assert.equal(parseLabelCheck('unsure'), undefined);
  assert.deepEqual(parseLabelCheck({ truth: 'unsure', note: '   ', at: 1 }), { truth: 'unsure', at: 1 });
  assert.equal(parseLabelCheck({ truth: 'unsure', note: 42, at: 1 })?.note, undefined);
  assert.equal(parseLabelCheck({ truth: 'unsure', note: 'y'.repeat(500), at: 1 })?.note?.length, 300);
  assert.equal(parseStatus('SAFE'), 'SAFE'); assert.equal(parseStatus('toString'), undefined); assert.equal(parseStatus(3), undefined);
  const state = sanitizeStoredState({ history: [
    { id: 'old', date: 1, product },
    { id: 'new', date: 2, product, statusAtScan: 'SAFE', labelCheck: { truth: 'no_allergen', note: 'ok', at: 3 } },
    { id: 'bad', date: 3, product, statusAtScan: 'HACK', labelCheck: { truth: 'nope', at: 3 } },
  ] });
  assert.equal(state.history[0].statusAtScan, undefined); assert.equal(state.history[0].labelCheck, undefined);
  assert.equal(state.history[1].statusAtScan, 'SAFE'); assert.equal(state.history[1].labelCheck?.truth, 'no_allergen');
  assert.equal(state.history[2].statusAtScan, undefined); assert.equal(state.history[2].labelCheck, undefined);
});

test('CSV export: header, oldest first, quoting, formula neutralised, blank verdict for old scans', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const evil = { ...product, name: '=HYPERLINK("http://x","a"),b', barcode: 'SCAN_OCR' };
  const first = useStore.getState().recordScan(product);
  useStore.getState().recordScan(evil);
  useStore.getState().setLabelCheck(first, 'no_allergen', 'ligne 1\nligne 2, "ok"');
  const history = useStore.getState().history.map(scan => scan.id === first ? { ...scan, date: 1000 } : { ...scan, date: 2000, statusAtScan: undefined });
  const csv = buildTrialCsv(history, DEFAULT_CUSTOM_ALLERGENS);
  assert.ok(csv.startsWith(BOM + TRIAL_CSV_COLUMNS.join(',') + '\r\n'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^1970-01-01T00:00:01\.000Z,Biscuit test,3017620422003,openfoodfacts,à éviter,à éviter,Lait,,Lait,Aucun de mes allergènes,"ligne 1 ligne 2, ""ok"""/);
  assert.match(lines[2], /^1970-01-01T00:00:02\.000Z,"'=HYPERLINK\(""http:\/\/x"",""a""\),b",SCAN_OCR,photo,,/);
});

test('CSV export: leading formula characters are neutralised and line breaks never split a record', () => {
  const names = ['+1', '-1', '@a', '\tx', 'a\rb', 'a\nb', 'a\r\nb', `a${String.fromCharCode(11)}b`];
  const csv = buildTrialCsv(names.map((name, i) => scanOf({ id: String(i), date: 1000 + i, name })), DEFAULT_CUSTOM_ALLERGENS);
  const rows = parseCsv(csv.slice(BOM.length));
  assert.equal(rows.length, names.length + 1);
  for (const row of rows) assert.equal(row.length, TRIAL_CSV_COLUMNS.length);
  assert.deepEqual(rows.slice(1, 5).map(row => row[1]), ["'+1", "'-1", "'@a", "'\tx"]);
  assert.deepEqual(rows.slice(5).map(row => row[1]), ['a b', 'a b', 'a b', 'a b']);
});

test('CSV export: empty history is header only; allergens and traces are split and named; unknown ids stay raw', () => {
  assert.equal(buildTrialCsv([], DEFAULT_CUSTOM_ALLERGENS), BOM + TRIAL_CSV_COLUMNS.join(',') + '\r\n');
  const row = parseCsv(buildTrialCsv([scanOf({
    result: { status: 'AVOID', explanation: '', detectedAllergens: ['milk', 'milk'], detectedTraces: ['nuts', 'custom:gone'] },
    allergiesAtScan: ['milk', 'peanuts'], engineVersionAtScan: '2.0.0', dictionaryVersionAtScan: 'd1',
  })], DEFAULT_CUSTOM_ALLERGENS).slice(BOM.length))[1];
  const col = (name: string) => row[TRIAL_CSV_COLUMNS.indexOf(name)];
  assert.equal(col('allergens_detected'), 'Lait');
  assert.equal(col('traces_detected'), 'Fruits à coque / custom:gone');
  assert.equal(col('allergies_at_scan').split(' / ').length, 2);
  assert.equal(col('engine'), '2.0.0'); assert.equal(col('dictionary'), 'd1');
});

test('CSV export survives a corrupt scan date instead of throwing', () => {
  const rows = parseCsv(buildTrialCsv([scanOf({ date: 1e20 }), scanOf({ id: 'y', date: 5 })], DEFAULT_CUSTOM_ALLERGENS).slice(BOM.length));
  assert.equal(rows.length, 3);
  assert.equal(rows[2][0], '');
});

// --- shareTrialCsv: browser globals are stubbed and restored so the four branches can be checked in Node ---
type Stubs = { canShare?: () => boolean; share?: () => Promise<void> };
type Seen = { shared: string[]; links: { download: string; clicked: number }[]; revoke: number[]; timers: number[] };
const withBrowser = async (stubs: Stubs, run: (seen: Seen) => Promise<void>) => {
  const keys = ['navigator', 'document', 'setTimeout'] as const;
  const saved = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const seen: Seen = { shared: [], links: [], revoke: [], timers: [] };
  const { createObjectURL, revokeObjectURL } = URL;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { canShare: stubs.canShare, share: async (data: { files: { name: string }[] }) => { seen.shared.push(data.files[0].name); return stubs.share?.(); } } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => { const link = { download: '', clicked: 0, click() { this.clicked++; }, remove() {} }; seen.links.push(link); return link; }, body: { append() {} } } });
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: (_fn: () => void, ms: number) => { seen.timers.push(ms); return 0; } });
  URL.createObjectURL = () => 'blob:test'; URL.revokeObjectURL = () => { seen.revoke.push(1); };
  try { await run(seen); }
  finally {
    keys.forEach((key, i) => { const descriptor = saved[i]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as Record<string, unknown>)[key]; });
    URL.createObjectURL = createObjectURL; URL.revokeObjectURL = revokeObjectURL;
  }
};
const day = new Date('2026-01-02T12:00:00Z');
const fail = (name: string) => async () => { throw new DOMException('x', name); };

test('share sheet used when the browser can share files', () => withBrowser({ canShare: () => true }, async seen => {
  assert.equal(await shareTrialCsv('a', day), 'shared');
  assert.deepEqual(seen.shared, ['safeeat-journal-2026-01-02.csv']); assert.equal(seen.links.length, 0);
}));
test('cancelling the share sheet, or tapping while one is open, never triggers a download', async () => {
  for (const name of ['AbortError', 'InvalidStateError']) await withBrowser({ canShare: () => true, share: fail(name) }, async seen => {
    assert.equal(await shareTrialCsv('a', day), 'cancelled'); assert.equal(seen.links.length, 0);
  });
});
test('other share failures fall back to a download whose URL is revoked later, not immediately', () => withBrowser({ canShare: () => true, share: fail('NotAllowedError') }, async seen => {
  assert.equal(await shareTrialCsv('a', day), 'downloaded');
  assert.equal(seen.links.length, 1); assert.equal(seen.links[0].download, 'safeeat-journal-2026-01-02.csv'); assert.equal(seen.links[0].clicked, 1);
  assert.equal(seen.revoke.length, 0); assert.deepEqual(seen.timers, [30000]);
}));
test('browsers without file sharing download the file', () => withBrowser({}, async seen => {
  assert.equal(await shareTrialCsv('a', day), 'downloaded'); assert.equal(seen.shared.length, 0); assert.equal(seen.links[0].clicked, 1);
}));

test('result page shows the journal section only when a handler is provided, and stays out of the verdict', () => {
  const result = analyzeProduct(product, ['milk'], DEFAULT_CUSTOM_ALLERGENS);
  const base = { product, result, onBack() {}, onScan() {}, onProfile() {}, profileEmpty: false };
  const off = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ResultView, base)));
  assert.doesNotMatch(off, /Journal d’essai/);
  const empty = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ResultView, { ...base, onLabelCheck() {} })));
  assert.match(empty, /<button[^>]*disabled=""[^>]*>[^<]*Enregistrer dans le journal/);
  const on = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ResultView, { ...base, onLabelCheck() {}, labelCheck: { truth: 'unsure', note: 'flou', at: 5 } })));
  assert.match(on, /Journal d’essai/); assert.match(on, /Je ne sais pas/); assert.match(on, /ne change pas le résultat/); assert.match(on, /Mettre à jour le journal/);
  assert.match(on, /checked=""[^>]*\/><span>Je ne sais pas/);
  assert.doesNotMatch(on, /<button[^>]*disabled=""[^>]*>[^<]*Mettre à jour/);
});

test('the 51st scan evicts the oldest one together with its label check, and keeps the verdict at scan on the newest', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const first = useStore.getState().recordScan(product);
  useStore.getState().setLabelCheck(first, 'has_allergen', 'note');
  for (let i = 1; i < HISTORY_LIMIT; i++) useStore.getState().recordScan(product);
  assert.equal(useStore.getState().history.length, HISTORY_LIMIT);
  assert.ok(useStore.getState().history.some(scan => scan.id === first));
  const newest = useStore.getState().recordScan(product);
  const { history } = useStore.getState();
  assert.equal(history.length, HISTORY_LIMIT);
  assert.ok(!history.some(scan => scan.id === first));
  assert.equal(history[0].id, newest); assert.equal(history[0].statusAtScan, 'AVOID');
});

test('history notice: none below the threshold, counts down after it, says full at the limit', () => {
  assert.equal(historyCapacityNotice(0), null);
  assert.equal(historyCapacityNotice(HISTORY_WARN_AT - 1), null);
  assert.match(historyCapacityNotice(HISTORY_WARN_AT) ?? '', new RegExp(`bientôt plein : encore ${HISTORY_LIMIT - HISTORY_WARN_AT} scans`));
  assert.match(historyCapacityNotice(HISTORY_LIMIT - 1) ?? '', /encore 1 scans/);
  assert.match(historyCapacityNotice(HISTORY_LIMIT) ?? '', /Historique plein : chaque nouveau scan supprime le plus ancien/);
});
