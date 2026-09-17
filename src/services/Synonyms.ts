import { isRecord } from './ProductValidation.js';

export const MAX_SYNONYMS = 19;
export const cleanSynonyms = (value: unknown, name: string): string[] | null => {
  if (!Array.isArray(value) || value.length > MAX_SYNONYMS || !value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 60 && !/[\n\r,;]/.test(item) && /[\p{L}\p{N}]/u.test(item))) return null;
  return [...new Set(value.map(item => (item as string).trim().toLowerCase().replace(/\s+/g, ' ')))].filter(item => item !== name.trim().toLowerCase());
};
export const suggestSynonyms = async (name: string, signal: AbortSignal): Promise<string[]> => {
  const response = await fetch('/api/suggest-synonyms', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }), signal,
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback = response.status === 404
      ? 'Le service de suggestions n’est pas disponible sur cette version. Vous pouvez saisir les autres noms.'
      : 'Les suggestions IA sont momentanément indisponibles. Réessayez ou saisissez les autres noms.';
    throw new Error(isRecord(data) && isRecord(data.error) && typeof data.error.message === 'string' ? data.error.message : fallback);
  }
  if (data === null) throw new Error('Les suggestions reçues sont illisibles. Réessayez.');
  const synonyms = isRecord(data) ? cleanSynonyms(data.synonyms, name) : null;
  if (!synonyms) throw new Error('Les suggestions reçues sont invalides. Vous pouvez saisir les noms vous-même.');
  return synonyms;
};
