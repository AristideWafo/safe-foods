import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import type { Product, AllergenId, AnalysisStatus } from '../src/types';
const product = (text: string, tags: string[] = [], traces: string[] = []): Product => ({ barcode: '12345678', name: 'Test', ingredientsText: text, allergensHierarchy: tags, tracesTags: traces });
const cases: [string, string, AllergenId[], AnalysisStatus][] = [
  ['négation locale', 'sans lait, beurre', ['milk'], 'AVOID'],
  ['occurrences répétées', 'sans lait. Ingrédients : lait', ['milk'], 'AVOID'],
  ['autre dérivé après négation', 'milk free, whey', ['milk'], 'AVOID'],
  ['amande singulier', 'poudre d’amande', ['nuts'], 'AVOID'],
  ['orge français', 'farine d’orge', ['gluten'], 'AVOID'],
  ['avoine français', 'flocons d’avoine', ['gluten'], 'AVOID'],
  ['seigle', 'seigle', ['gluten'], 'AVOID'],
  ['pluriels français', 'crevettes', ['crustaceans'], 'AVOID'],
  ['accents', 'CELERI', ['celery'], 'AVOID'],
  ['ligature', 'ŒUFS', ['eggs'], 'AVOID'],
  ['sulfites code', 'conservateur E223', ['sulphites'], 'AVOID'],
  ['poisson espèce', 'saumon', ['fish'], 'AVOID'],
  ['sésame dérivé', 'tahini', ['sesame'], 'AVOID'],
  ['coco', 'noix de coco', ['nuts'], 'UNCERTAIN'],
  ['muscade', 'noix de muscade', ['nuts'], 'UNCERTAIN'],
  ['coco et vraie noix', 'noix de coco, noix', ['nuts'], 'AVOID'],
  ['frontières', 'laitue, beurre de cacao', ['eggs'], 'UNCERTAIN'],
  ['sans lait', 'sans lait', ['milk'], 'UNCERTAIN'],
  ['anglais', 'milk free', ['milk'], 'UNCERTAIN'],
  ['sans gluten et blé', 'sans gluten, farine de blé', ['gluten'], 'AVOID'],
  ['profil vide', 'lait', [], 'UNCERTAIN'],
  ['ingrédients absents', '', ['milk'], 'UNCERTAIN'],
  ['contamination anglais', 'sugar. May contain unknown allergens', ['milk'], 'UNCERTAIN'],
];
for (const [name, text, allergies, status] of cases) test(name, () => assert.equal(analyzeProduct(product(text), allergies).status, status));
test('tags prioritaires et traces distinctes', () => {
  const r = analyzeProduct(product('lait, soja', ['en:milk'], ['en:soybeans']), ['milk', 'soybeans']);
  assert.equal(r.status, 'AVOID'); assert.deepEqual(r.detectedAllergens, ['milk']); assert.deepEqual(r.detectedTraces, ['soybeans']);
});
test('mentions textuelles ne deviennent pas traces déclarées', () => {
  const r = analyzeProduct(product('beurre'), ['milk']);
  assert.deepEqual(r.detectedTraces, []); assert.deepEqual(r.textualMatches, ['milk']);
});
test('photo sans détection reste incertaine', () => assert.equal(analyzeProduct({ ...product('sucre'), barcode: 'SCAN_OCR' }, ['milk']).status, 'UNCERTAIN'));
