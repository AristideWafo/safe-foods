import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProduct } from '../src/services/AnalysisEngine';
import request from 'supertest';
import { createApp } from '../server/app';
import { MAX_IMAGE_BYTES } from '../server/image';
const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
const payload = { imageBase64, consent: true };
const answer = { labelReadable: true, ingredientsComplete: true, ingredientsText: 'Lait, sucre', allergensHierarchy: ['en:milk'], tracesTags: [] };
const app = () => createApp({ analyzer: async () => answer, model: 'test-model' });
test('health works without credentials', async () => { const r = await request(createApp()).get('/api/health'); assert.equal(r.status, 200); assert.equal(r.body.aiConfigured, false); });
test('missing image is 400 JSON', async () => { const r = await request(app()).post('/api/analyze-image').send({}); assert.equal(r.status, 400); assert.equal(r.body.error.code, 'INVALID_IMAGE'); });
test('numeric image is a client error, not provider failure', async () => assert.equal((await request(app()).post('/api/analyze-image').send({ imageBase64: 123 })).status, 400));
test('malformed JSON never returns HTML or a stack', async () => { const r = await request(app()).post('/api/analyze-image').set('Content-Type', 'application/json').send('{'); assert.equal(r.status, 400); assert.match(r.headers['content-type'], /json/); assert.equal(r.body.error.code, 'INVALID_JSON'); });
test('MIME mismatch rejected', async () => assert.equal((await request(app()).post('/api/analyze-image').send({ imageBase64: 'data:image/jpeg;base64,YWJjZA==', consent: true })).status, 400));
test('photo requires explicit consent', async () => { const r = await request(app()).post('/api/analyze-image').send({ imageBase64 }); assert.equal(r.status, 400); assert.equal(r.body.error.code, 'PHOTO_CONSENT_REQUIRED'); });
test('unconfigured photo has actionable error', async () => { const r = await request(createApp()).post('/api/analyze-image').send(payload); assert.equal(r.status, 503); assert.equal(r.body.error.code, 'AI_NOT_CONFIGURED'); });
test('valid analysis contains provenance', async () => { const r = await request(app()).post('/api/analyze-image').send(payload); assert.equal(r.status, 200); assert.equal(r.body.ingredientsText, answer.ingredientsText); assert.equal(r.body.source, 'photo'); assert.equal(r.body.analysisModel, 'test-model'); assert.equal(typeof r.body.fetchedAt, 'number'); });
for (const raw of [{}, { ...answer, ingredientsComplete: 'yes' }, { ...answer, allergensHierarchy: ['en:unknown'] }, { ...answer, ingredientsText: '' }, null]) test(`unusable provider response rejected: ${JSON.stringify(raw)}`, async () => assert.equal((await request(createApp({ analyzer: async () => raw })).post('/api/analyze-image').send(payload)).status, 422));
test('provider exception is sanitized', async () => { const r = await request(createApp({ analyzer: async () => { throw new Error('secret-key'); } })).post('/api/analyze-image').send(payload); assert.equal(r.status, 503); assert.doesNotMatch(JSON.stringify(r.body), /secret-key/); });
test('partial photo retains a positive alert through the API', async () => {
  const r = await request(createApp({ analyzer: async () => ({ ...answer, labelReadable: false, ingredientsComplete: false }) })).post('/api/analyze-image').send(payload);
  assert.equal(r.status, 200); assert.equal(r.body.ingredientsComplete, false); assert.equal(r.body.labelVerified, false);
  assert.equal(analyzeProduct({ ...r.body, barcode: 'SCAN_OCR', name: 'Photo' }, ['milk']).status, 'AVOID');
});
test('complete model extraction without user review remains inconclusive', async () => {
  const r = await request(createApp({ analyzer: async () => ({ ...answer, ingredientsText: 'sucre', allergensHierarchy: [], warningsComplete: true, language: 'fr' }) })).post('/api/analyze-image').send(payload);
  assert.equal(r.status, 200);
  assert.equal(analyzeProduct({ ...r.body, barcode: 'SCAN_OCR', name: 'Photo' }, ['milk']).status, 'UNCERTAIN');
});
test('deadline aborts request', async () => {
  let signal: AbortSignal | undefined;
  const r = await request(createApp({ timeoutMs: 20, analyzer: async (_image, s) => { signal = s; return new Promise(() => {}); } })).post('/api/analyze-image').send(payload);
  assert.equal(r.status, 504); assert.equal(signal?.aborted, true);
});
test('rate limit returns consistent JSON', async () => { const a = createApp({ analyzer: async () => answer, rateLimit: 1 }); await request(a).post('/api/analyze-image').send(payload); const r = await request(a).post('/api/analyze-image').send(payload); assert.equal(r.status, 429); assert.equal(r.body.error.code, 'RATE_LIMITED'); });
test('daily budget bounds all clients', async () => { const a = createApp({ analyzer: async () => answer, dailyLimit: 1 }); await request(a).post('/api/analyze-image').send(payload); const r = await request(a).post('/api/analyze-image').send(payload); assert.equal(r.body.error.code, 'DAILY_LIMIT_REACHED'); });
test('concurrent requests bounded and slot released', async () => {
  let release: (value: unknown) => void = () => {};
  let started: () => void = () => {};
  const ready = new Promise<void>(resolve => { started = resolve; });
  const a = createApp({ concurrency: 1, analyzer: async () => { started(); return new Promise(resolve => { release = resolve; }); } });
  const first = request(a).post('/api/analyze-image').send(payload).then(r => r);
  await ready;
  const second = await request(a).post('/api/analyze-image').send(payload);
  assert.equal(second.body.error.code, 'AI_BUSY'); release(answer); assert.equal((await first).status, 200);
});
test('cross origin image request rejected', async () => assert.equal((await request(app()).post('/api/analyze-image').set('Origin', 'https://other.example').send(payload)).status, 403));
test('decoded image size bounded', async () => {
  const b = Buffer.alloc(MAX_IMAGE_BYTES + 1); Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  const r = await request(app()).post('/api/analyze-image').send({ imageBase64: `data:image/png;base64,${b.toString('base64')}`, consent: true }); assert.equal(r.status, 413);
});
test('unknown API route stays JSON', async () => assert.equal((await request(app()).get('/api/unknown')).body.error.code, 'NOT_FOUND'));
