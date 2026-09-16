import 'dotenv/config';

const integer = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid configuration: ${name}`);
  return value;
};
export const config = {
  port: integer('PORT', 3000, 1, 65535),
  host: process.env.HOST || '127.0.0.1',
  production: process.env.NODE_ENV ? process.env.NODE_ENV === 'production' : process.argv[1]?.endsWith('.cjs') === true,
  apiKey: process.env.GEMINI_API_KEY?.trim(),
  model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  timeoutMs: integer('AI_TIMEOUT_MS', 30000, 100, 120000),
  concurrency: integer('AI_MAX_CONCURRENCY', 2, 1, 20),
  dailyLimit: integer('AI_DAILY_LIMIT', 100, 1, 10000),
  trustProxy: integer('TRUST_PROXY_HOPS', 0, 0, 5),
};
