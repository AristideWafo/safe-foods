import { config } from './config';
import { createApp } from './app';
import { createGeminiAnalyzer, createGeminiSynonymSuggester } from './gemini';

// Shared API setup for the local server and the Vercel function; no listening socket here.
export const createConfiguredApp = (trustProxy = config.trustProxy) => {
  const key = config.apiKey && config.apiKey !== 'MY_GEMINI_API_KEY' ? config.apiKey : undefined;
  return createApp({
    ...config, trustProxy,
    analyzer: key ? createGeminiAnalyzer(key, config.model, config.timeoutMs) : undefined,
    synonymSuggester: key ? createGeminiSynonymSuggester(key, config.model, config.timeoutMs) : undefined,
  });
};
