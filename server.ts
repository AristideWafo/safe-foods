import express from 'express';
import path from 'node:path';
import { config } from './server/config';
import { createConfiguredApp } from './server/runtime';

async function startServer() {
  const app = createConfiguredApp();
  let closeVite: (() => Promise<void>) | undefined;
  if (!config.production) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    closeVite = () => vite.close();
  } else {
    const client = path.resolve('dist/client');
    app.use(express.static(client));
    app.get('*', (req, res) => {
      if (path.extname(req.path)) { res.status(404).send('Fichier introuvable.'); return; }
      res.sendFile(path.join(client, 'index.html'));
    });
  }
  const server = app.listen(config.port, config.host, () => {
    console.log(`SafeEat: http://${config.host}:${config.port} (${config.production ? 'production' : 'development'}, photo ${config.apiKey && config.apiKey !== 'MY_GEMINI_API_KEY' ? 'configured' : 'disabled'})`);
  });
  server.on('error', () => { console.error('Le serveur ne peut pas démarrer. Vérifiez le port et la configuration.'); process.exitCode = 1; });
  const shutdown = () => {
    const force = setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => { void Promise.resolve(closeVite?.()).finally(() => { clearTimeout(force); process.exit(0); }); });
  };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
startServer().catch(() => { console.error('Échec du démarrage. Vérifiez la configuration et les fichiers compilés.'); process.exitCode = 1; });
