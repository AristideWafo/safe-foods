import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import { parseAnalysis } from '../server/image';
import { parseProduct } from '../src/services/ProductValidation';
import { sanitizeStoredState } from '../src/store/useStore';
import { compareLabelObservation } from '../src/services/LabelComparison';
import type { AllergenId, Product } from '../src/types';

// Synthetic, frozen regression corpus. Not a medically validated benchmark.
const reviewed = (ingredientsText: string, overrides: Partial<Product> = {}): Product => ({
  barcode: '3017620422003', name: 'Étiquette fictive', source: 'openfoodfacts', ingredientsText,
  allergensHierarchy: [], tracesTags: [], language: 'fr', labelReadable: true,
  ingredientsComplete: true, warningsComplete: true, labelVerified: true, ...overrides,
});
const positiveCases: [AllergenId, string][] = [
  ['milk', 'protéines de lactosérum'], ['milk', 'sans lactose. Ingrédients : lait'],
  ['milk', 'sucre, caséinate'], ['gluten', 'malt d’orge'], ['eggs', 'ovalbumine'],
  ['crustaceans', 'crevettes'], ['fish', 'saumon'], ['peanuts', 'cacahuètes'],
  ['soybeans', 'tofu'], ['nuts', 'noix de coco, amandes'], ['celery', 'céleri'],
  ['mustard', 'moutarde'], ['sesame', 'tahini'], ['sulphites', 'E228'], ['sulphites', 'E 223'],
  ['lupin', 'lupin'], ['molluscs', 'moules'], ['custom:sunflower', 'huile de tournesol'],
];
for (const [allergen, text] of positiveCases) test(`corpus: alerte traçable ${allergen}: ${text}`, () => {
  const r = analyzeProduct(reviewed(text), [allergen]);
  assert.equal(r.status, 'AVOID');
  assert.ok(r.evidence?.some(e => e.allergen === allergen && e.kind === 'ingredient' && e.quote && text.includes(e.quote)));
});
for (const [key, value] of [
  ['ingredientsComplete', false], ['labelReadable', false], ['warningsComplete', false],
  ['labelVerified', false], ['language', 'en'], ['language', undefined], ['sourceConflict', true],
] as const) test(`corpus: ${key}=${value} interdit le verdict rassurant`, () => {
  assert.equal(analyzeProduct(reviewed('sucre', { [key]: value }), ['milk']).status, 'UNCERTAIN');
  assert.equal(analyzeProduct(reviewed('lait', { [key]: value }), ['milk']).status, 'AVOID');
});
test('corpus: absence de correspondance exige tous les contrôles', () => {
  assert.equal(analyzeProduct(reviewed('sucre, eau'), ['milk']).status, 'SAFE');
  assert.equal(analyzeProduct(reviewed('sucre, eau', { labelVerified: undefined }), ['milk']).status, 'UNCERTAIN');
});
test('corpus: claims never cancel another positive occurrence', () => {
  const r = analyzeProduct(reviewed('sans lait. Ingrédients : beurre'), ['milk']);
  assert.equal(r.status, 'AVOID');
  assert.ok(r.evidence?.some(e => e.kind === 'claim' && e.quote === 'sans lait'));
  assert.ok(r.evidence?.some(e => e.kind === 'ingredient' && e.quote === 'Ingrédients : beurre'));
});
test('corpus: precautionary list remains distinct from ingredients', () => {
  const r = analyzeProduct(reviewed('sucre', { warningsText: 'Peut contenir du lait, des œufs et du sésame' }), ['milk', 'eggs', 'sesame']);
  assert.equal(r.status, 'UNCERTAIN');
  assert.deepEqual(r.detectedTraces, ['eggs', 'milk', 'sesame']);
  assert.ok(r.evidence?.every(e => e.kind === 'possible_presence' && e.source === 'warnings'));
});
test('corpus: facility warning is not quantified contamination', () => {
  const r = analyzeProduct(reviewed('sucre', { warningsText: 'Fabriqué dans un atelier utilisant du lait' }), ['milk']);
  assert.equal(r.status, 'UNCERTAIN'); assert.equal(r.evidence?.[0].kind, 'facility');
});
test('corpus: affirmative allergen warning is a positive alert', () => {
  assert.equal(analyzeProduct(reviewed('sucre', { warningsText: 'Contient du lait' }), ['milk']).status, 'AVOID');
});
test('corpus: compound negative claim remains inconclusive', () => {
  assert.equal(analyzeProduct(reviewed('sucre', { warningsText: 'Sans lait et œufs' }), ['eggs']).status, 'UNCERTAIN');
});
for (const [id, text] of [['gluten', 'malt'], ['eggs', 'albumine'], ['eggs', 'lysozyme']] as const)
  test(`corpus: origine ambiguë ${text}`, () => {
    const r = analyzeProduct(reviewed(text), [id]);
    assert.equal(r.status, 'UNCERTAIN'); assert.equal(r.evidence?.[0].kind, 'ambiguous');
  });
test('corpus: limited exceptions do not remove nearby real allergens', () => {
  assert.equal(analyzeProduct(reviewed('noix de coco, noix de muscade'), ['nuts']).status, 'SAFE');
  assert.equal(analyzeProduct(reviewed('beurre de cacao'), ['milk']).status, 'SAFE');
  assert.equal(analyzeProduct(reviewed('beurre de cacao, beurre'), ['milk']).status, 'AVOID');
});
test('corpus: photo extraction flags survive validation and persistence', () => {
  const extraction = parseAnalysis({ labelReadable: false, ingredientsComplete: false, warningsComplete: false,
    language: 'fr', ingredientsText: 'LAIT', warningsText: '', allergensHierarchy: [], tracesTags: [] });
  const p = parseProduct({ ...extraction, barcode: 'SCAN_OCR', name: 'Photo tronquée', source: 'photo', fetchedAt: 123 });
  assert.ok(p);
  const state = sanitizeStoredState({ allergies: ['milk'], history: [{ id: 'partial', date: 124, product: p }] });
  assert.equal(state.history[0].result.status, 'AVOID');
  assert.equal(state.history[0].product.ingredientsComplete, false);
  assert.ok(state.history[0].result.qualityIssues?.length);
  assert.equal(state.history[0].product.fetchedAt, 123);
});
test('corpus: no tag citation is invented', () => {
  const r = analyzeProduct(reviewed('', { allergensHierarchy: ['en:milk'] }), ['milk']);
  assert.equal(r.status, 'AVOID'); assert.equal(r.evidence?.[0].quote, undefined);
});
test('corpus: old reassuring history is recalculated conservatively', () => {
  const p = reviewed('sucre', { ingredientsComplete: undefined, labelVerified: undefined });
  const state = sanitizeStoredState({ allergies: ['milk'], history: [{ id: 'old', date: 100, product: p, result: { status: 'SAFE' } }] });
  assert.equal(state.history[0].result.status, 'UNCERTAIN'); assert.equal(state.history[0].date, 100);
});
test('corpus: unknown configured restriction cannot become reassuring', () => {
  assert.equal(analyzeProduct(reviewed('sucre'), ['custom:missing']).status, 'UNCERTAIN');
});
test('corpus: divergent photo never silently replaces OFF evidence', () => {
  const reference = reviewed('lait', { allergensHierarchy: ['en:milk'] });
  const photo = reviewed('sucre', { source: 'photo' });
  const compared = compareLabelObservation(reference, photo);
  assert.equal(compared.sourceConflict, true); assert.equal(compared.comparison?.ingredientsText, 'lait');
  assert.equal(analyzeProduct(compared, ['milk']).status, 'UNCERTAIN');
  assert.equal(parseProduct(compared)?.comparison?.ingredientsText, 'lait');
  assert.equal(reference.ingredientsText, 'lait');
});
