import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomAllergenForm } from '../src/components/allergies/CustomAllergenForm';
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
  assert.equal(state.history[0].result.status, 'AVOID');
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

test('editing keeps the custom ID and active state, updates keywords and recalculates history', async () => {
  useStore.setState({ allergies: [], history: [], customAllergens: [] });
  useStore.getState().addCustomAllergen('Cacao', ['cocoa']);
  const id = useStore.getState().customAllergens[0].id;
  useStore.getState().recordScan(product('chocolat'));
  assert.equal(useStore.getState().history[0].result.status, 'UNCERTAIN');
  useStore.getState().updateCustomAllergen(id, 'Cacao amer', ['chocolat']);
  assert.equal(useStore.getState().customAllergens[0].id, id);
  assert.ok(useStore.getState().allergies.includes(id));
  assert.equal(useStore.getState().history[0].result.status, 'AVOID');
  assert.throws(() => useStore.getState().updateCustomAllergen(id, 'Lait'), /existe déjà/);
  const snapshot = localStorage.getItem('safe-eat-storage')!;
  useStore.setState({ customAllergens: [], allergies: [] });
  localStorage.setItem('safe-eat-storage', snapshot); await useStore.persist.rehydrate();
  assert.deepEqual(useStore.getState().customAllergens[0].keywords, ['Cacao amer', 'chocolat']);
});
test('deleting a selected custom allergen removes it and recalculates retained scans', async () => {
  const state = useStore.getState();
  const id = state.customAllergens[0].id;
  state.removeCustomAllergen(id);
  assert.equal(useStore.getState().customAllergens.length, 0);
  assert.ok(!useStore.getState().allergies.includes(id));
  assert.equal(useStore.getState().history.length, 1);
  assert.equal(useStore.getState().history[0].result.status, 'UNCERTAIN');
  const snapshot = localStorage.getItem('safe-eat-storage')!;
  useStore.setState({ customAllergens: DEFAULT_CUSTOM_ALLERGENS });
  localStorage.setItem('safe-eat-storage', snapshot); await useStore.persist.rehydrate();
  assert.deepEqual(useStore.getState().customAllergens, []);
  assert.throws(() => useStore.getState().removeCustomAllergen('milk'), /n’existe plus/);
});
test('default custom definitions can be edited or removed without being restored at reload', () => {
  const customAllergens = [ { ...DEFAULT_CUSTOM_ALLERGENS[0], label: 'Tournesol modifié', keywords: ['tournesol'] } ];
  const restored = sanitizeStoredState({ customAllergens });
  assert.deepEqual(restored.customAllergens.map(a => a.label), ['Tournesol modifié']);
  assert.deepEqual(sanitizeStoredState({}).customAllergens, DEFAULT_CUSTOM_ALLERGENS);
});

test('editing form loads the existing name and aliases', () => {
  const allergen = { ...DEFAULT_CUSTOM_ALLERGENS[0], label: 'Cacao', keywords: ['Cacao', 'cocoa', 'theobroma cacao'] };
  const html = renderToStaticMarkup(createElement(CustomAllergenForm, { allergen, onDone: () => {} }));
  assert.match(html, /Modifier mon allergène/);
  assert.match(html, /value="Cacao"/);
  assert.match(html, /value="cocoa, theobroma cacao"/);
  assert.match(html, /Enregistrer les modifications/);
});
