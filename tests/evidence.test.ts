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
  assert.match(html, /Dans les ingrédients/); assert.match(html, /beurre<\/strong><\/span>, sucre/); assert.doesNotMatch(html, /déclarée par le fabricant/);
});
test('missing update date is not fabricated', () => {
  const html = renderToStaticMarkup(createElement(ResultView, { product, result: analyzeProduct(product, []), onBack: () => {}, onScan: () => {}, onProfile: () => {}, profileEmpty: true }));
  assert.match(html, /non renseignée/); assert.match(html, /Configurer mes allergies/); assert.doesNotMatch(html, /aujourd.hui/);
});
test('review requires explicit checks and a separate observation', () => {
  const html = renderToStaticMarkup(createElement(ResultView, { product, result: analyzeProduct(product, ['eggs']), onBack: () => {}, onScan: () => {}, onProfile: () => {}, onVerify: () => {}, profileEmpty: false }));
  assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
  assert.match(html, /disabled=""[^>]*>Enregistrer une relecture séparée/);
  assert.match(html, /Ce qui empêche de conclure/);
  assert.match(html, /La source ne fournit pas d’avertissements/);
});
test('unresolved conflict offers no simple confirmation', () => {
  const p = { ...product, sourceConflict: true };
  const html = renderToStaticMarkup(createElement(ResultView, { product: p, result: analyzeProduct(p, ['milk']), onBack: () => {}, onScan: () => {}, onProfile: () => {}, onVerify: () => {}, profileEmpty: false }));
  assert.doesNotMatch(html, /Enregistrer une relecture séparée/);
});

test('avoid hides review and incomplete data prompts but offers a photo check', () => {
  const html = renderToStaticMarkup(createElement(ResultView, { product, result: analyzeProduct(product, ['milk']), onBack: () => {}, onScan: () => {}, onProfile: () => {}, onVerify: () => {}, onCheckLabel: () => {}, profileEmpty: false }));
  assert.doesNotMatch(html, /type="checkbox"|Ce qui empêche de conclure|Relire l’étiquette réelle/);
  assert.match(html, /Allergène détecté : Lait/);
  assert.match(html, /Un doute \? Vérifier avec une photo/);
});
test('proofs are grouped and excluded ingredients are not emphasized', () => {
  const p = { ...product, ingredientsText: 'beurre de cacao, lait écrémé, lait entier, beurre concentré', allergensHierarchy: ['en:milk'] };
  const html = renderToStaticMarkup(createElement(EvidenceAccordion, { product: p, result: analyzeProduct(p, ['milk']) }));
  assert.equal((html.match(/<h3[^>]*>Lait<\/h3>/g) || []).length, 1);
  assert.equal((html.match(/<strong class="font-extrabold[^>]*>lait<\/strong>/g) || []).length, 2);
  assert.doesNotMatch(html, /<strong[^>]*>beurre<\/strong><\/span> de cacao|keyword:|tag:|Règle/);
  assert.match(html, /Allergène signalé dans la fiche produit/);
});

test('a negative claim is not highlighted alongside a positive ingredient', () => {
  const p = { ...product, ingredientsText: 'sans lait, beurre concentré' };
  const html = renderToStaticMarkup(createElement(EvidenceAccordion, { product: p, result: analyzeProduct(p, ['milk']) }));
  assert.doesNotMatch(html, /<strong class="font-extrabold[^>]*>lait/);
  assert.match(html, /<strong class="font-extrabold[^>]*>beurre/);
});
