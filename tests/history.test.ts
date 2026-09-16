import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../src/types';
import { sanitizeStoredState, useStore } from '../src/store/useStore';
const product: Product = { barcode: 'SCAN_OCR', name: 'Photo fictive', ingredientsText: 'lait', allergensHierarchy: ['en:milk'], tracesTags: [], source: 'photo' };
test('migration removes broken entries, not valid photos', () => {
  const state = sanitizeStoredState({ allergies: ['milk', 'unknown'], history: [{ id: 'photo', date: 100, product, result: { status: 'SAFE' } }, { id: 'broken', date: 101 }, { id: 'photo', date: 102, product }] });
  assert.deepEqual(state.allergies, ['milk']); assert.equal(state.history.length, 1); assert.equal(state.history[0].product.source, 'photo'); assert.equal(state.history[0].result.status, 'AVOID');
});
test('scan saved once and reanalysed with current profile', () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const id = useStore.getState().recordScan(product); const item = useStore.getState().history[0];
  assert.equal(item.id, id); assert.equal(item.result.status, 'AVOID'); assert.deepEqual(item.allergiesAtScan, ['milk']);
  useStore.getState().addHistoryItem(item); assert.equal(useStore.getState().history.length, 1);
  useStore.getState().toggleAllergy('milk'); assert.equal(useStore.getState().history[0].result.status, 'UNCERTAIN');
  useStore.getState().toggleAllergy('milk'); assert.equal(useStore.getState().history[0].result.status, 'AVOID');
  assert.equal(useStore.getState().history[0].date, item.date);
});
test('50 scan limit preserved', () => { useStore.setState({ history: [] }); for (let i = 0; i < 55; i++) useStore.getState().recordScan(product); assert.equal(useStore.getState().history.length, 50); });
test('reset profile keeps history and removes reassuring statuses', () => { useStore.getState().resetProfile(); assert.deepEqual(useStore.getState().allergies, []); assert.equal(useStore.getState().history.length, 50); assert.ok(useStore.getState().history.every(item => item.result.status === 'UNCERTAIN')); });
test('photo restored from persisted storage after rehydration', async () => {
  useStore.setState({ allergies: ['milk'], history: [] });
  const id = useStore.getState().recordScan(product);
  const snapshot = localStorage.getItem('safe-eat-storage'); assert.ok(snapshot);
  useStore.setState({ allergies: [], history: [] });
  localStorage.setItem('safe-eat-storage', snapshot);
  await useStore.persist.rehydrate();
  const restored = useStore.getState().history.find(item => item.id === id);
  assert.equal(restored?.product.barcode, 'SCAN_OCR'); assert.equal(restored?.result.status, 'AVOID');
});
