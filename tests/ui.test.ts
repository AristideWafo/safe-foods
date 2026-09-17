import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { BottomNavigation } from '../src/components/navigation/BottomNavigation';
import { ProductMascot } from '../src/components/scanner/ProductMascot';
import { Profile } from '../src/pages/Profile';
import { RecentScanRow } from '../src/components/history/RecentScanRow';
import { useStore } from '../src/store/useStore';
import { CountBadge } from '../src/components/feedback/CountBadge';
import { ManualBarcodeForm } from '../src/components/scanner/ManualBarcodeSheet';

test('floating navigation preserves all four app destinations', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BottomNavigation)));
  for (const path of ['/', '/scanner', '/history', '/profile']) assert.ok(html.includes(`href="${path}"`));
  assert.match(html, /Navigation principale/);
});

test('profile uses local data rather than Stitch sample identity or certifications', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Profile)));
  assert.match(html, /Mon profil/);
  assert.match(html, /sans synchronisation entre appareils/);
  assert.doesNotMatch(html, /Lucas Miller|142|RGPD Santé|FAMILLE PROTÉGÉE/);
});

test('Stitch mascot is decorative and does not require a hosted image', () => {
  const html = renderToStaticMarkup(createElement(ProductMascot));
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /https?:/);
});
test('product card exposes an independent favorite control and real description', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const id = useStore.getState().recordScan({ barcode: 'SCAN_OCR', name: 'Yaourt test', brand: 'Marque test', quantity: '125 g', ingredientsText: 'lait', allergensHierarchy: ['en:milk'], tracesTags: [] });
  useStore.getState().toggleFavorite(id);
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RecentScanRow, { id, scanItem: useStore.getState().history[0], barcode: 'SCAN_OCR', productName: 'Yaourt test', scannedAt: '10:00', status: 'AVOID' })));
  assert.match(html, /Marque test • 125 g/);
  assert.match(html, /Retirer Yaourt test des favoris/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Lait/);
  assert.doesNotMatch(html, /Réaction sévère|100% Sûr/);
  assert.ok(html.indexOf('</a>') < html.indexOf('<button'));
});
test('section count uses a blue badge including zero', () => {
  const html = renderToStaticMarkup(createElement(CountBadge, { count: 0 }));
  assert.match(html, /bg-primary-500/);
  assert.match(html, /text-white/);
  assert.match(html, />0<\/span>/);
});
test('inline barcode form accepts valid codes and disables invalid or busy submissions', () => {
  const render = (value: string, disabled = false) => renderToStaticMarkup(createElement(ManualBarcodeForm, { value, onValueChange: () => {}, onSubmit: () => {}, disabled }));
  assert.doesNotMatch(render('3017620422003'), /disabled=""/);
  assert.match(render('123'), /aria-invalid="true"/);
  assert.match(render('123'), /disabled=""/);
  assert.match(render('3017620422003', true), /disabled=""/);
  assert.doesNotMatch(render('3017620422003'), /<dialog/);
});

test('profile limits the initial allergen grid to six cards and shows a count in the heading', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Profile)));
  assert.equal((html.match(/aria-pressed=/g) || []).length, 6);
  assert.match(html, /Mes Allergènes &amp; Intolérances<span[^>]*>\d+<\/span>/);
});
