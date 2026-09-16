import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors';
import { parseImage, parseAnalysis } from './image';
import type { ImageAnalyzer } from './gemini';

export interface AppOptions { analyzer?: ImageAnalyzer; model?: string; timeoutMs?: number; concurrency?: number; dailyLimit?: number; trustProxy?: number; rateLimit?: number; }
export const createApp = (options: AppOptions = {}) => {
  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', options.trustProxy);
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'strict-origin-when-cross-origin'); next(); });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', aiConfigured: !!options.analyzer }));
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, limit: options.rateLimit ?? 30, standardHeaders: 'draft-8', legacyHeaders: false,
    skip: req => req.method !== 'POST',
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Trop de demandes. Réessayez dans quelques minutes.', retryable: true } }),
  }));
  app.use('/api', express.json({ limit: '6mb' }));
  let active = 0;
  let used = 0;
  let day = new Date().toISOString().slice(0, 10);
  app.post('/api/analyze-image', async (req, res) => {
    const requestId = randomUUID();
    let admitted = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClose = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', onClose);
    try {
      if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) throw new ApiError(403, 'ORIGIN_DENIED', 'Cette requête doit provenir de l’application.');
      if (!req.is('application/json')) throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'Le corps doit être au format JSON.');
      const image = parseImage(req.body?.imageBase64);
      if (req.body?.consent !== true) throw new ApiError(400, 'PHOTO_CONSENT_REQUIRED', 'Confirmez l’envoi de cette photo à Google Gemini.');
      if (!options.analyzer) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'L’analyse photo n’est pas configurée. Utilisez un code-barres.', false);
      const today = new Date().toISOString().slice(0, 10);
      if (today !== day) { day = today; used = 0; }
      if (active >= (options.concurrency ?? 2)) throw new ApiError(429, 'AI_BUSY', 'Des analyses sont déjà en cours. Réessayez dans un instant.', true);
      if (used >= (options.dailyLimit ?? 100)) throw new ApiError(429, 'DAILY_LIMIT_REACHED', 'La limite quotidienne d’analyse photo est atteinte. Utilisez un code-barres.', false);
      active++; used++; admitted = true;
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ApiError(504, 'AI_TIMEOUT', 'L’analyse prend trop de temps. Réessayez.', true)); }, options.timeoutMs ?? 30000);
      });
      const raw = await Promise.race([options.analyzer(image, controller.signal), deadline]);
      const analysis = parseAnalysis(raw);
      if (!controller.signal.aborted) res.json({ ...analysis, source: 'photo', fetchedAt: Date.now(), analysisModel: options.model });
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError(503, 'AI_SERVICE_UNAVAILABLE', 'Le service d’analyse est indisponible. Réessayez ou utilisez un code-barres.', true);
      // Do not log images, labels, credentials or raw provider errors.
      if (failure.status >= 500) console.error(JSON.stringify({ requestId, code: failure.code }));
      if (!res.destroyed) res.status(failure.status).json({ error: { code: failure.code, message: failure.message, retryable: failure.retryable }, requestId });
    } finally {
      if (timer) clearTimeout(timer);
      res.off('close', onClose);
      if (admitted) active--;
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route inconnue.', retryable: false } }));
  const errors: ErrorRequestHandler = (error: { type?: string }, _req, res, _next) => {
    const large = error.type === 'entity.too.large';
    res.status(large ? 413 : 400).json({ error: { code: large ? 'IMAGE_TOO_LARGE' : 'INVALID_JSON', message: large ? 'L’image envoyée est trop volumineuse.' : 'Le corps JSON est invalide.', retryable: false } });
  };
  app.use(errors);
  return app;
};
