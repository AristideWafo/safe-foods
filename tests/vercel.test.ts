import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../api/index';

test('Vercel entrypoint exposes health and API JSON errors without starting the local server', async () => {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200); assert.equal(health.body.status, 'ok');
  const invalid = await request(app).post('/api/suggest-synonyms').send({ name: '' });
  assert.equal(invalid.status, 400); assert.equal(invalid.body.error.code, 'INVALID_ALLERGEN_NAME');
  const unknown = await request(app).get('/api/unknown');
  assert.equal(unknown.status, 404); assert.match(unknown.headers['content-type'], /json/);
});

test('Vercel HTTPS origin is recognized through its reverse proxy', async () => {
  const response = await request(app).post('/api/suggest-synonyms').set('Host', 'preview.example').set('X-Forwarded-Proto', 'https').set('Origin', 'https://preview.example').send({ name: '' });
  assert.equal(response.status, 400); assert.equal(response.body.error.code, 'INVALID_ALLERGEN_NAME');
  const foreign = await request(app).post('/api/suggest-synonyms').set('Host', 'preview.example').set('X-Forwarded-Proto', 'https').set('Origin', 'https://other.example').send({ name: '' });
  assert.equal(foreign.status, 403);
});
