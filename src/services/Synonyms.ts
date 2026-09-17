import { isRecord } from './ProductValidation.js';

export const MAX_SYNONYMS = 19;
export const cleanSynonyms = (value: unknown, name: string): string[] | null => {
  if (!Array.isArray(value) || value.length > MAX_SYNONYMS || !value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 60 && !/[\n\r,;]/.test(item) && /[\p{L}\p{N}]/u.test(item))) return null;
  return [...new Set(value.map(item => (item as string).trim().toLowerCase().replace(/\s+/g, ' ')))].filter(item => item !== name.trim().toLowerCase());
};
export const cleanSuggestedName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 60 && !/[\n\r,;]/.test(value) && /[\p{L}\p{N}]/u.test(name) ? name : null;
};
export const suggestAllergen = async (name: string, signal: AbortSignal): Promise<{ name: string; synonyms: string[] }> => {
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
  const correctedName = isRecord(data) && data.name !== undefined ? cleanSuggestedName(data.name) : name;
  if (!correctedName) throw new Error('Le nom proposé est invalide. Réessayez.');
  return { name: correctedName, synonyms };
};

export const suggestSynonyms = async (name: string, signal: AbortSignal): Promise<string[]> => (await suggestAllergen(name, signal)).synonyms;
