import { isRecord } from './ProductValidation';

export const MAX_SYNONYMS = 19;
export const cleanSynonyms = (value: unknown, name: string): string[] | null => {
  if (!Array.isArray(value) || value.length > MAX_SYNONYMS || !value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 60 && !/[\n\r,;]/.test(item) && /[\p{L}\p{N}]/u.test(item))) return null;
  return [...new Set(value.map(item => (item as string).trim().toLowerCase().replace(/\s+/g, ' ')))].filter(item => item !== name.trim().toLowerCase());
};
export const suggestSynonyms = async (name: string, signal: AbortSignal): Promise<string[]> => {
  const response = await fetch('/api/suggest-synonyms', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }), signal,
  });
  const data: unknown = await response.json().catch(() => { throw new Error('Les suggestions reçues sont illisibles. Réessayez.'); });
  if (!response.ok) throw new Error(isRecord(data) && isRecord(data.error) && typeof data.error.message === 'string' ? data.error.message : 'Les suggestions sont indisponibles.');
  const synonyms = isRecord(data) ? cleanSynonyms(data.synonyms, name) : null;
  if (!synonyms) throw new Error('Les suggestions reçues sont invalides. Vous pouvez saisir les noms vous-même.');
  return synonyms;
};
