import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../dist/api-runtime/api/index.js';

// Exercise the emitted ESM function in plain Node, without tsx or Vite's resolver.
const server = app.listen(0, '127.0.0.1');
try {
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const invalid = await fetch(`${origin}/api/suggest-synonyms`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '' }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_ALLERGEN_NAME');
  console.log('Compiled API starts successfully in plain Node; health and synonym validation pass.');
} finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
