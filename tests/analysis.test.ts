import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import type { Product, AllergenId, AnalysisStatus } from '../src/types';
const product = (text: string, tags: string[] = [], traces: string[] = []): Product => ({ barcode: '12345678', name: 'Test', ingredientsText: text, allergensHierarchy: tags, tracesTags: traces });
const cases: [string, string, AllergenId[], AnalysisStatus][] = [
  ['négation locale', 'sans lait, beurre', ['milk'], 'UNCERTAIN'],
  ['occurrences répétées', 'sans lait. Ingrédients : lait', ['milk'], 'UNCERTAIN'],
  ['autre dérivé après négation', 'milk free, whey', ['milk'], 'UNCERTAIN'],
  ['amande singulier', 'poudre d’amande', ['nuts'], 'UNCERTAIN'],
  ['orge français', 'farine d’orge', ['gluten'], 'UNCERTAIN'],
  ['avoine français', 'flocons d’avoine', ['gluten'], 'UNCERTAIN'],
  ['seigle', 'seigle', ['gluten'], 'UNCERTAIN'],
  ['pluriels français', 'crevettes', ['crustaceans'], 'UNCERTAIN'],
  ['accents', 'CELERI', ['celery'], 'UNCERTAIN'],
  ['ligature', 'ŒUFS', ['eggs'], 'UNCERTAIN'],
  ['sulfites code', 'conservateur E223', ['sulphites'], 'UNCERTAIN'],
  ['poisson espèce', 'saumon', ['fish'], 'UNCERTAIN'],
  ['sésame dérivé', 'tahini', ['sesame'], 'UNCERTAIN'],
  ['coco', 'noix de coco', ['nuts'], 'SAFE'],
  ['muscade', 'noix de muscade', ['nuts'], 'SAFE'],
  ['coco et vraie noix', 'noix de coco, noix', ['nuts'], 'UNCERTAIN'],
  ['frontières', 'laitue, beurre de cacao', ['eggs'], 'SAFE'],
  ['sans lait', 'sans lait', ['milk'], 'SAFE'],
  ['anglais', 'milk free', ['milk'], 'SAFE'],
  ['sans gluten et blé', 'sans gluten, farine de blé', ['gluten'], 'UNCERTAIN'],
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
