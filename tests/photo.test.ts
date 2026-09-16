import { test } from 'node:test'; import assert from 'node:assert/strict';
import { analyzePhoto } from '../src/services/Photo';
const nativeFetch = globalThis.fetch;
test('photo API failures retain actionable message', async () => {
  globalThis.fetch = async () => Response.json({ error: { code: 'IMAGE_UNREADABLE', message: 'Photographiez toute la liste.' } }, { status: 422 });
  try { await assert.rejects(analyzePhoto('test', new AbortController().signal), /Photographiez toute la liste/); } finally { globalThis.fetch = nativeFetch; }
});
test('photo response validated and source retained', async () => {
  globalThis.fetch = async () => Response.json({ ingredientsText: 'lait', allergensHierarchy: ['en:milk'], tracesTags: [], source: 'photo', fetchedAt: 123 });
  try { const p = await analyzePhoto('test', new AbortController().signal); assert.equal(p.barcode, 'SCAN_OCR'); assert.equal(p.source, 'photo'); assert.equal(p.fetchedAt, 123); } finally { globalThis.fetch = nativeFetch; }
});
test('invalid photo tags rejected before analysis', async () => {
  globalThis.fetch = async () => Response.json({ ingredientsText: 'lait', allergensHierarchy: 'milk' });
  try { await assert.rejects(analyzePhoto('test', new AbortController().signal), /ingrédients sont illisibles/); } finally { globalThis.fetch = nativeFetch; }
});
