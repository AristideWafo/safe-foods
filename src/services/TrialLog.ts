import type { AllergenDef, AllergenId, AnalysisStatus, ScanHistoryItem } from '../types';
import { getAllergenDefinitions } from '../constants/customAllergens';
import { LABEL_TRUTH_TEXT } from './LabelCheck';

// Product names and notes are untrusted text (Open Food Facts, OCR): strip every line break so a
// row cannot be split, and neutralise a leading = + - @ that Excel or Sheets would run as a formula.
const cell = (value: string | number | undefined) => {
  const text = String(value ?? '').replace(/[\r\n\v\f\u2028\u2029]+/g, ' ');
  const safe = /^[=+\-@\t]/.test(text) ? `'${text}` : text;
  return /[",]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
// UTF-8 byte order mark so Excel reads accents correctly.
export const BOM = String.fromCharCode(0xfeff);
export const TRIAL_CSV_COLUMNS = ['date', 'product', 'barcode', 'source', 'verdict_at_scan', 'verdict_now', 'allergens_detected', 'traces_detected', 'allergies_at_scan', 'label_says', 'note', 'engine', 'dictionary'];
const VERDICT_TEXT: Record<AnalysisStatus, string> = { SAFE: 'aucune correspondance', AVOID: 'à éviter', UNCERTAIN: 'à vérifier' };
const isoDate = (time: number) => { const date = new Date(time); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); };
// Same rule as product parsing: an OCR product may still lack `source` until the next reload.
const sourceOf = (scan: ScanHistoryItem) => scan.product.source ?? (scan.barcode === 'SCAN_OCR' || scan.barcode.startsWith('OCR-') ? 'photo' : 'openfoodfacts');

// Oldest first, one row per scan. verdict_at_scan and allergies_at_scan are blank for scans saved before the trial log existed.
// allergens_detected = declared in ingredients; traces_detected = possible presence ("may contain").
export const buildTrialCsv = (history: ScanHistoryItem[], customAllergens: AllergenDef[]): string => {
  const labels = new Map(getAllergenDefinitions(customAllergens).map(item => [item.id, item.label]));
  const names = (ids: string[]) => [...new Set(ids)].map(id => labels.get(id as AllergenId) ?? id).join(' / ');
  const rows = [...history].sort((a, b) => a.date - b.date).map(scan => [
    isoDate(scan.date), scan.product.name, scan.barcode, sourceOf(scan),
    scan.statusAtScan ? VERDICT_TEXT[scan.statusAtScan] : '', VERDICT_TEXT[scan.result.status],
    names(scan.result.detectedAllergens), names(scan.result.detectedTraces), names(scan.allergiesAtScan ?? []),
    scan.labelCheck ? LABEL_TRUTH_TEXT[scan.labelCheck.truth] : '', scan.labelCheck?.note ?? '',
    scan.engineVersionAtScan ?? '', scan.dictionaryVersionAtScan ?? '',
  ].map(cell).join(','));
  return `${BOM}${[TRIAL_CSV_COLUMNS.join(','), ...rows].join('\r\n')}\r\n`;
};

export type ExportOutcome = 'shared' | 'downloaded' | 'cancelled';
// Errors that mean the user backed out or a share sheet is already open: never fall back to a download.
const CANCEL_ERRORS = new Set(['AbortError', 'InvalidStateError']);

// Share sheet on phones (WhatsApp, mail), plain download elsewhere. Nothing leaves the device unless the user picks a target.
// Any other share failure (not allowed, unsupported target) intentionally falls through to the download.
export const shareTrialCsv = async (csv: string, now = new Date()): Promise<ExportOutcome> => {
  const name = `safeeat-journal-${now.toISOString().slice(0, 10)}.csv`;
  const file = new File([csv], name, { type: 'text/csv' });
  let canShare = false;
  try { canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }); } catch { /* some engines throw: fall back to a download */ }
  if (canShare) {
    try { await navigator.share({ files: [file], title: 'Journal SafeEat' }); return 'shared'; }
    catch (error) { if (error instanceof DOMException && CANCEL_ERRORS.has(error.name)) return 'cancelled'; }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link); link.click(); link.remove();
  // Safari and Firefox start the download asynchronously: revoking now can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
};
