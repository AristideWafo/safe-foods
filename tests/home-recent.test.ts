import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { getLatestTodayScans, HomeRecentScanRow } from '../src/components/history/HomeRecentScanRow';
import type { ScanHistoryItem } from '../src/types';

const scanAt = (id: string, date: number): ScanHistoryItem => ({ id, date, barcode: 'test', product: { barcode: 'test', name: 'Produit test', ingredientsText: 'lait', allergensHierarchy: ['en:milk'], tracesTags: [] }, result: { status: 'AVOID', explanation: 'Lait', detectedAllergens: ['milk'], detectedTraces: [] } });

test('home selects only the latest three scans of the local day without mutating history', () => {
  const now = new Date(2026, 8, 16, 12).getTime();
  const midnight = new Date(2026, 8, 16).getTime();
  const items = [scanAt('old', midnight - 1), scanAt('1', midnight), scanAt('3', now - 3000), scanAt('2', now - 4000), scanAt('4', now - 1000), scanAt('future', now + 1000)];
  assert.deepEqual(getLatestTodayScans(items, now).map(scan => scan.id), ['4', '3', '2']);
  assert.equal(items[0].id, 'old');
  assert.deepEqual(getLatestTodayScans([items[0]], now), []);
});
test('home starts a new selection at midnight', () => {
  const midnight = new Date(2026, 8, 17).getTime();
  assert.deepEqual(getLatestTodayScans([scanAt('yesterday', midnight - 1), scanAt('today', midnight)], midnight).map(scan => scan.id), ['today']);
});
test('compact home card links to the analysis and has no history favorite control', () => {
  const now = Date.now();
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeRecentScanRow, { scan: scanAt('compact', now - 3600000), now })));
  assert.match(html, /Il y a 1 h/);
  assert.match(html, /Contient : lait/);
  assert.match(html, /href="\/scan\/compact"/);
  assert.doesNotMatch(html, /stitch-product-card|stitch-product-favorite|<button|Sans danger/);
});
