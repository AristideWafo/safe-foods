import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createApp } from '../server/app';
import { CustomAllergenForm } from '../src/components/allergies/CustomAllergenForm';
import { cleanSynonyms, suggestSynonyms } from '../src/services/Synonyms';
import { useStore } from '../src/store/useStore';
const route = '/api/suggest-synonyms';

test('synonyms are cleaned, deduplicated and omit the main name', async () => {
  let received = '';
  const app = createApp({ synonymSuggester: async name => { received = name; return { synonyms: [' Kiwi ', 'KIWIFRUIT', 'kiwifruit', '  actinidia   deliciosa '] }; } });
  const r = await request(app).post(route).send({ name: ' Kiwi ' });
  assert.equal(r.status, 200); assert.equal(received, 'Kiwi');
  assert.deepEqual(r.body.synonyms, ['kiwifruit', 'actinidia deliciosa']);
});
for (const name of [undefined, 123, '', 'x', 'x'.repeat(61), 'kiwi\nignore', '!!!']) test(`invalid name is rejected before Gemini: ${JSON.stringify(name)}`, async () => {
  let called = false;
  const r = await request(createApp({ synonymSuggester: async () => { called = true; return {}; } })).post(route).send({ name });
  assert.equal(r.status, 400); assert.equal(called, false);
});
test('missing configuration allows manual entry', async () => {
  const r = await request(createApp()).post(route).send({ name: 'Kiwi' });
  assert.equal(r.status, 503); assert.equal(r.body.error.code, 'AI_NOT_CONFIGURED'); assert.match(r.body.error.message, /saisir/);
});
for (const raw of [null, {}, { synonyms: [''] }, { synonyms: [123] }, { synonyms: ['x'.repeat(61)] }, { synonyms: ['kiwi, fruit'] }, { synonyms: Array(20).fill('kiwi') }]) test('malformed Gemini suggestions are rejected', async () => {
  const r = await request(createApp({ synonymSuggester: async () => raw })).post(route).send({ name: 'Kiwi' });
  assert.equal(r.status, 422); assert.equal(r.body.error.code, 'INVALID_SUGGESTIONS');
});
test('empty suggestions are a valid result', async () => {
  const r = await request(createApp({ synonymSuggester: async () => ({ synonyms: [] }) })).post(route).send({ name: 'Kiwi' });
  assert.equal(r.status, 200); assert.deepEqual(r.body.synonyms, []);
});
test('provider errors do not expose secrets', async () => {
  const r = await request(createApp({ synonymSuggester: async () => { throw new Error('secret-key'); } })).post(route).send({ name: 'Kiwi' });
  assert.equal(r.status, 503); assert.doesNotMatch(JSON.stringify(r.body), /secret-key/);
});
test('synonym deadline aborts the provider', async () => {
  let signal: AbortSignal | undefined;
  const r = await request(createApp({ timeoutMs: 20, synonymSuggester: async (_name, s) => { signal = s; return new Promise(() => {}); } })).post(route).send({ name: 'Kiwi' });
  assert.equal(r.status, 504); assert.equal(signal?.aborted, true);
});
test('suggestions share the daily AI budget with photo analysis', async () => {
  const app = createApp({ dailyLimit: 1, synonymSuggester: async () => ({ synonyms: ['kiwifruit'] }), analyzer: async () => ({}) });
  assert.equal((await request(app).post(route).send({ name: 'Kiwi' })).status, 200);
  const r = await request(app).post('/api/analyze-image').send({ consent: true, imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==' });
  assert.equal(r.status, 429); assert.equal(r.body.error.code, 'DAILY_LIMIT_REACHED');
});
test('suggestions obey rate and origin restrictions', async () => {
  const options = { synonymSuggester: async () => ({ synonyms: [] }) };
  assert.equal((await request(createApp(options)).post(route).set('Origin', 'https://other.example').send({ name: 'Kiwi' })).status, 403);
  const app = createApp({ ...options, rateLimit: 1 });
  await request(app).post(route).send({ name: 'Kiwi' });
  assert.equal((await request(app).post(route).send({ name: 'Kiwi' })).status, 429);
});
test('client validates response and sends only the name without modifying the store', async () => {
  const original = globalThis.fetch;
  const before = useStore.getState().customAllergens;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, route); assert.deepEqual(JSON.parse(init!.body as string), { name: 'Kiwi' });
      return new Response(JSON.stringify({ synonyms: ['KIWIFRUIT'] }), { status: 200 });
    };
    assert.deepEqual(await suggestSynonyms('Kiwi', new AbortController().signal), ['kiwifruit']);
    assert.equal(useStore.getState().customAllergens, before);
    globalThis.fetch = async () => new Response(JSON.stringify({ synonyms: [123] }), { status: 200 });
    await assert.rejects(suggestSynonyms('Kiwi', new AbortController().signal), /invalides/);
    assert.equal(cleanSynonyms(['kiwi\nfruit'], 'Kiwi'), null);
  } finally { globalThis.fetch = original; }
});
test('AI badge is accessible and inactive until a name is entered', () => {
  const html = renderToStaticMarkup(createElement(CustomAllergenForm));
  assert.match(html, /disabled="" aria-label="Compléter avec l’IA"/);
  assert.match(html, /bg-blue-600/); assert.match(html, /Google Gemini/);
});

test('plain-text server failures are reported as service errors rather than unreadable AI', async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, message] of [[500, /momentanément indisponibles/], [404, /pas disponible sur cette version/]] as const) {
      globalThis.fetch = async () => new Response('FUNCTION_INVOCATION_FAILED', { status });
      await assert.rejects(suggestSynonyms('cacao', new AbortController().signal), message);
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Quota atteint.' } }), { status: 429 });
    await assert.rejects(suggestSynonyms('cacao', new AbortController().signal), /Quota atteint/);
    globalThis.fetch = async () => new Response('not JSON', { status: 200 });
    await assert.rejects(suggestSynonyms('cacao', new AbortController().signal), /illisibles/);
  } finally { globalThis.fetch = original; }
});
