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
    source: value.source === 'label' ? 'label' : value.source === 'photo' || value.barcode === 'SCAN_OCR' ? 'photo' : 'openfoodfacts',
    warningsText: typeof value.warningsText === 'string' ? value.warningsText : undefined,
    language: typeof value.language === 'string' ? value.language : undefined,
    labelReadable: typeof value.labelReadable === 'boolean' ? value.labelReadable : undefined,
    ingredientsComplete: typeof value.ingredientsComplete === 'boolean' ? value.ingredientsComplete : undefined,
    warningsComplete: typeof value.warningsComplete === 'boolean' ? value.warningsComplete : undefined,
    labelVerified: value.labelVerified === true,
    verifiedAt: typeof value.verifiedAt === 'number' && Number.isFinite(value.verifiedAt) ? value.verifiedAt : undefined,
    sourceConflict: value.sourceConflict === true,
    comparison: isRecord(value.comparison) && typeof value.comparison.name === 'string' && typeof value.comparison.ingredientsText === 'string' && typeof value.comparison.warningsText === 'string' ? {
      name: value.comparison.name, ingredientsText: value.comparison.ingredientsText, warningsText: value.comparison.warningsText,
      source: typeof value.comparison.source === 'string' ? value.comparison.source : undefined,
      fetchedAt: typeof value.comparison.fetchedAt === 'number' && Number.isFinite(value.comparison.fetchedAt) ? value.comparison.fetchedAt : undefined,
    } : undefined,
    fetchedAt: typeof value.fetchedAt === 'number' && Number.isFinite(value.fetchedAt) ? value.fetchedAt : undefined,
    updatedAt: typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : undefined,
    analysisModel: typeof value.analysisModel === 'string' ? value.analysisModel : undefined,
  };
};
