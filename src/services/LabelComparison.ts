import type { Product } from '../types';
import { normalizeIngredientText } from './AnalysisEngine';

// A disagreement is not resolved by voting or overwriting the earlier observation.
// Formatting differences can also trigger review; this deliberately favors abstention.
export const compareLabelObservation = (reference: Product, photo: Product): Product => ({
  ...photo, labelVerified: false, verifiedAt: undefined,
  sourceConflict: reference.sourceConflict === true || photo.sourceConflict === true
    || normalizeIngredientText(reference.ingredientsText).trim() !== normalizeIngredientText(photo.ingredientsText).trim()
    || normalizeIngredientText(reference.warningsText || '').trim() !== normalizeIngredientText(photo.warningsText || '').trim()
    || [...reference.allergensHierarchy, ...reference.tracesTags].some(tag => ![...photo.allergensHierarchy, ...photo.tracesTags].includes(tag)),
  comparison: { name: reference.name, ingredientsText: reference.ingredientsText, warningsText: reference.warningsText || '', source: reference.source, fetchedAt: reference.fetchedAt },
});
