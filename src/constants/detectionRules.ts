import type { AllergenId } from '../types';

// Limited lexical rules, not medical equivalences or an exhaustive ontology.
// EU label categories: https://eur-lex.europa.eu/eli/reg/2011/1169/oj
export const DICTIONARY_VERSION = '2026-09-16.1';
export const AMBIGUOUS_KEYWORDS: Partial<Record<AllergenId, string[]>> = {
  gluten: ['malt'], eggs: ['albumine', 'albumin', 'lysozyme', 'e1105'],
};
export const EXCLUDED_PHRASES: Partial<Record<AllergenId, string[]>> = {
  nuts: ['noix de coco', 'noix de muscade', 'coconut'],
  milk: ['beurre de cacao', 'beurre de karité', 'lait de coco', 'lait d’amande'],
};
