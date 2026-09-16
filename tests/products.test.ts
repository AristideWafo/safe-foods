import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchProductByBarcode, ProductFetchError } from '../src/services/OpenFoodFacts';
import { isValidBarcode } from '../src/services/Barcode';
const code = '3017620422003';
const nativeFetch = globalThis.fetch;
const mock = async (fn: typeof fetch, check: () => Promise<void>) => { globalThis.fetch = fn; try { await check(); } finally { globalThis.fetch = nativeFetch; } };
test('barcode formats and check digit', () => {
  assert.equal(isValidBarcode(code), true); assert.equal(isValidBarcode('3017620422004'), false);
  assert.equal(isValidBarcode('96385074'), true); assert.equal(isValidBarcode('012345678905'), true); assert.equal(isValidBarcode('03017620422003'), true);
  assert.equal(isValidBarcode('https://example.com'), false); assert.equal(isValidBarcode('123'), false);
});
test('invalid code never calls provider', async () => mock(async () => { throw new Error('should not fetch'); }, async () => { await assert.rejects(fetchProductByBarcode('bad'), e => e instanceof ProductFetchError && e.code === 'INVALID_BARCODE'); }));
test('OFF prefers French and stores real dates', async () => mock(async () => Response.json({ status: 1, product: { product_name: 'English', product_name_fr: 'Français', ingredients_text: 'milk', ingredients_text_fr: 'lait', allergens_hierarchy: ['en:milk'], last_modified_t: 1000 } }), async () => {
  const p = await fetchProductByBarcode(code); assert.equal(p?.name, 'Français'); assert.equal(p?.ingredientsText, 'lait'); assert.equal(p?.updatedAt, 1000000); assert.equal(p?.source, 'openfoodfacts');
}));
test('absent product is null', async () => mock(async () => Response.json({ status: 0 }), async () => assert.equal(await fetchProductByBarcode(code), null)));
test('HTTP 404 is absent', async () => mock(async () => new Response('{}', { status: 404 }), async () => assert.equal(await fetchProductByBarcode(code), null)));
for (const [name, status, expected] of [['limit', 429, 'RATE_LIMITED'], ['provider', 503, 'UNAVAILABLE']] as const) test(name, async () => mock(async () => new Response('{}', { status }), async () => { await assert.rejects(fetchProductByBarcode(code), e => e instanceof ProductFetchError && e.code === expected); }));
test('network failure is distinct from absence', async () => mock(async () => { throw new TypeError('offline'); }, async () => { await assert.rejects(fetchProductByBarcode(code), e => e instanceof ProductFetchError && e.code === 'NETWORK'); }));
for (const product of [{ ingredients_text_fr: 123 }, { allergens_hierarchy: 'milk' }, { traces_tags: [123] }]) test(`bad data cannot become SAFE: ${JSON.stringify(product)}`, async () => mock(async () => Response.json({ status: 1, product }), async () => { await assert.rejects(fetchProductByBarcode(code), e => e instanceof ProductFetchError && e.code === 'INVALID_DATA'); }));
test('navigation cancellation aborts fetch', async () => mock(async (_url, init) => { if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError'); return new Response('{}'); }, async () => { const controller = new AbortController(); controller.abort(); await assert.rejects(fetchProductByBarcode(code, controller.signal), e => e instanceof DOMException && e.name === 'AbortError'); }));
