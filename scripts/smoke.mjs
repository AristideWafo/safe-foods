import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { once } from 'node:events';
const port = process.env.SMOKE_PORT || '3101';
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/server.cjs'], { env: { ...process.env, PORT: port, HOST: '127.0.0.1', NODE_ENV: 'production', GEMINI_API_KEY: '' }, stdio: 'ignore' });
const exit = once(server, 'exit');
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error('Production server exited during startup');
    try { const health = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) }); if (health.ok) { assert.equal((await health.json()).aiConfigured, false); ready = true; break; } } catch { /* Wait for startup. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Production server must become healthy');
  for (const route of ['/', '/profile', '/scan/missing']) {
    const response = await fetch(url + route); assert.equal(response.status, 200);
    const html = await response.text(); assert.ok(html.includes('/assets/')); assert.ok(!html.includes('/@vite/client'));
    const asset = html.match(/src="([^"]+\.js)"/); assert.ok(asset); assert.equal((await fetch(url + asset[1])).status, 200);
  }
  for (const file of ['/server.cjs', '/server.cjs.map', '/assets/missing.js']) assert.equal((await fetch(url + file)).status, 404, `${file} must not expose server artifacts or SPA HTML`);
  const bad = await fetch(`${url}/api/analyze-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(bad.status, 400); assert.equal((await bad.json()).error.code, 'INVALID_IMAGE');
  assert.equal((await fetch(`${url}/api/unknown`)).status, 404);
  console.log('Production smoke: health, SPA routes, client assets, API errors and private server artifacts OK');
} finally {
  server.kill('SIGTERM');
  const force = setTimeout(() => server.kill('SIGKILL'), 5000).unref();
  await exit; clearTimeout(force);
}
