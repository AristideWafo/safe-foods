import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EvidenceAccordion, ResultView } from '../src/pages/Result';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import type { Product } from '../src/types';
const product: Product = { barcode: '3017620422003', name: 'Test', ingredientsText: 'beurre, sucre', allergensHierarchy: [], tracesTags: [], source: 'openfoodfacts' };
test('textual proof is honest and full ingredients stay visible', () => {
  const html = renderToStaticMarkup(createElement(EvidenceAccordion, { product, result: analyzeProduct(product, ['milk']) }));
  assert.match(html, /Mention trouvée dans le texte/); assert.match(html, /beurre, sucre/); assert.doesNotMatch(html, /déclarée par le fabricant/);
});
test('missing update date is not fabricated', () => {
  const html = renderToStaticMarkup(createElement(ResultView, { product, result: analyzeProduct(product, []), onBack: () => {}, onScan: () => {}, onProfile: () => {}, profileEmpty: true }));
  assert.match(html, /non renseignée/); assert.match(html, /Configurer mes allergies/); assert.doesNotMatch(html, /aujourd.hui/);
});
test('review requires explicit checks and a separate observation', () => {
  const html = renderToStaticMarkup(createElement(ResultView, { product, result: analyzeProduct(product, ['milk']), onBack: () => {}, onScan: () => {}, onProfile: () => {}, onVerify: () => {}, profileEmpty: false }));
  assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
  assert.match(html, /disabled=""[^>]*>Enregistrer une relecture séparée/);
  assert.match(html, /Ce qui empêche de conclure/);
  assert.match(html, /Aucun texte fourni par la source/);
});
test('unresolved conflict offers no simple confirmation', () => {
  const p = { ...product, sourceConflict: true };
  const html = renderToStaticMarkup(createElement(ResultView, { product: p, result: analyzeProduct(p, ['milk']), onBack: () => {}, onScan: () => {}, onProfile: () => {}, onVerify: () => {}, profileEmpty: false }));
  assert.doesNotMatch(html, /Enregistrer une relecture séparée/);
});
