import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import { DEFAULT_CUSTOM_ALLERGENS } from '../src/constants/customAllergens';
import { sanitizeStoredState, useStore } from '../src/store/useStore';
import type { Product } from '../src/types';
const product = (ingredientsText: string): Product => ({ barcode: '3017620422003', name: 'Test', ingredientsText, allergensHierarchy: [], tracesTags: [] });

test('sunflower and pineapple are first and are detected in French and English', () => {
  assert.deepEqual(DEFAULT_CUSTOM_ALLERGENS.map(a => a.label), ['Tournesol', 'Ananas']);
  for (const text of ['huile de tournesol', 'sunflower oil', 'graines de tournesol']) assert.deepEqual(analyzeProduct(product(text), ['custom:sunflower']).textualMatches, ['custom:sunflower']);
  for (const text of ['jus d’ananas', 'pineapple juice']) assert.deepEqual(analyzeProduct(product(text), ['custom:pineapple']).textualMatches, ['custom:pineapple']);
});
test('negative claims and word boundaries remain conservative', () => {
  assert.deepEqual(analyzeProduct(product('sans tournesol, sucre'), ['custom:sunflower']).textualMatches, []);
  assert.deepEqual(analyzeProduct(product('sans tournesol, huile de tournesol'), ['custom:sunflower']).textualMatches, ['custom:sunflower']);
  assert.deepEqual(analyzeProduct(product('ananasine'), ['custom:pineapple']).textualMatches, []);
  assert.equal(analyzeProduct(product('sucre'), ['custom:sunflower']).status, 'UNCERTAIN');
});
test('custom creation activates the restriction, recalculates scans and rejects duplicates', () => {
  useStore.setState({ allergies: [], history: [], customAllergens: DEFAULT_CUSTOM_ALLERGENS });
  useStore.getState().recordScan(product('kiwifruit, sucre'));
  useStore.getState().addCustomAllergen('Kiwi', ['kiwifruit']);
  const state = useStore.getState();
  const kiwi = state.customAllergens.find(a => a.label === 'Kiwi')!;
  assert.ok(state.allergies.includes(kiwi.id));
  assert.ok(state.history[0].result.textualMatches?.includes(kiwi.id));
  assert.equal(state.history[0].result.status, 'UNCERTAIN');
  assert.throws(() => state.addCustomAllergen('KIWI'), /existe déjà/);
  assert.throws(() => state.addCustomAllergen('Lait'), /existe déjà/);
  assert.throws(() => state.addCustomAllergen(''), /2 à 60/);
});
test('custom definitions and selections survive rehydration', async () => {
  const snapshot = localStorage.getItem('safe-eat-storage');
  assert.ok(snapshot);
  useStore.setState({ allergies: [], history: [], customAllergens: DEFAULT_CUSTOM_ALLERGENS });
  localStorage.setItem('safe-eat-storage', snapshot);
  await useStore.persist.rehydrate();
  const kiwi = useStore.getState().customAllergens.find(a => a.label === 'Kiwi')!;
  assert.ok(kiwi);
  assert.ok(useStore.getState().allergies.includes(kiwi.id));
  assert.ok(useStore.getState().history[0].result.textualMatches?.includes(kiwi.id));
});
test('stored definitions cannot inject trusted taxonomy tags or invalid selections', () => {
  const state = sanitizeStoredState({ customAllergens: [{ id: 'custom:test', label: 'Kiwi', keywords: ['kiwi'], offTags: ['en:milk'] }, { id: 'bad', label: 'Invalid', keywords: [] }], allergies: ['custom:test', 'custom:missing'] });
  assert.deepEqual(state.customAllergens.find(a => a.id === 'custom:test')?.offTags, []);
  assert.deepEqual(state.allergies, ['custom:test']);
});
