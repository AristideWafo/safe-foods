import type { Product } from '../types';
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const tags = (value: unknown): string[] | null => value === undefined ? [] : Array.isArray(value) && value.every(v => typeof v === 'string') ? value : null;
export const parseProduct = (value: unknown): Product | null => {
  if (!isRecord(value) || typeof value.barcode !== 'string' || typeof value.name !== 'string' || typeof value.ingredientsText !== 'string') return null;
  const allergensHierarchy = tags(value.allergensHierarchy), tracesTags = tags(value.tracesTags);
  if (!allergensHierarchy || !tracesTags) return null;
  const safeImage = typeof value.imageUrl === 'string' && /^https:\/\//.test(value.imageUrl) ? value.imageUrl : undefined;
  return {
    barcode: value.barcode, name: value.name || 'Produit inconnu', ingredientsText: value.ingredientsText,
    brand: typeof value.brand === 'string' ? value.brand : undefined,
    quantity: typeof value.quantity === 'string' ? value.quantity : undefined,
    allergensHierarchy, tracesTags, imageUrl: safeImage,
    source: value.source === 'photo' || value.barcode === 'SCAN_OCR' ? 'photo' : 'openfoodfacts',
    fetchedAt: typeof value.fetchedAt === 'number' && Number.isFinite(value.fetchedAt) ? value.fetchedAt : undefined,
    updatedAt: typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : undefined,
    analysisModel: typeof value.analysisModel === 'string' ? value.analysisModel : undefined,
  };
};
