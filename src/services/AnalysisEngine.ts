import type { Product, AnalysisResult, AllergenId } from '../types';
import { ALLERGENS, INGREDIENT_KEYWORDS } from '../constants/allergens';

export const normalizeIngredientText = (text: string) => text
  .toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ');

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasUnnegatedMention = (text: string, keywords: string[]) => keywords.some(keyword => {
  const word = escapeRegex(normalizeIngredientText(keyword));
  // Word boundaries prevent matches in unrelated ingredient names; allow plurals.
  const pattern = new RegExp(`(?<![a-z])${word}(?:s|es)?(?![a-z])`, 'g');
  for (const match of text.matchAll(pattern)) {
    const before = text.slice(0, match.index);
    const after = text.slice(match.index! + match[0].length);
    // A claim only negates this occurrence, never another ingredient elsewhere.
    const negated = /(?:\bsans|\bexempt(?:e)? de|\bne contient pas(?: de)?|\bfree (?:of|from))(?:\s+d[eu])?\s*$/.test(before)
      || /^\s*free\b/.test(after);
    if (!negated) return true;
  }
  return false;
});

export const analyzeProduct = (product: Product, userAllergies: AllergenId[]): AnalysisResult => {
  const detectedAllergens: AllergenId[] = [];
  const detectedTraces: AllergenId[] = [];
  const textualMatches: AllergenId[] = [];
  const base = { detectedAllergens, detectedTraces, textualMatches };
  const selected = ALLERGENS.filter(allergen => userAllergies.includes(allergen.id));
  if (!selected.length) return { ...base, status: 'UNCERTAIN', explanation: 'Aucune allergie renseignée : configurez votre profil avant une analyse personnalisée.' };

  const ingredients = normalizeIngredientText(product.ingredientsText || '');
  for (const allergen of selected) {
    const tagged = product.allergensHierarchy?.some(tag => allergen.offTags.includes(tag.toLowerCase()));
    const trace = product.tracesTags?.some(tag => allergen.offTags.includes(tag.toLowerCase()));
    // Coconut and nutmeg are not evidence of tree nuts; remove only these phrases.
    const text = allergen.id === 'nuts'
      ? ingredients.replace(/\bnoix de (?:coco|muscade)\b/g, '').replace(/\bcoconut(?:s)?\b/g, '')
      : ingredients;
    if (tagged) detectedAllergens.push(allergen.id);
    if (trace) detectedTraces.push(allergen.id);
    if (!tagged && !trace && hasUnnegatedMention(text, INGREDIENT_KEYWORDS[allergen.id])) textualMatches.push(allergen.id);
  }
  const names = (ids: AllergenId[]) => ALLERGENS.filter(a => ids.includes(a.id)).map(a => a.label).join(', ');
  if (detectedAllergens.length) return {
    ...base, status: 'AVOID',
    explanation: `Allergène(s) signalé(s) dans les données du produit : ${names(detectedAllergens)}. Vérifiez l’étiquette physique.`,
  };
  if (detectedTraces.length || textualMatches.length) return {
    ...base, status: 'UNCERTAIN',
    explanation: [
      detectedTraces.length ? `Traces signalées : ${names(detectedTraces)}.` : '',
      textualMatches.length ? `Mentions détectées dans le texte, non confirmées par les tags : ${names(textualMatches)}.` : '',
      'Vérifiez l’étiquette avant de consommer.',
    ].filter(Boolean).join(' '),
  };
  if (!ingredients.trim()) return { ...base, status: 'UNCERTAIN', explanation: 'La liste des ingrédients est absente. Vérifiez l’emballage.' };
  if (/(?:peut contenir|traces|may contain|atelier utilisant|facility|fabrique dans)/.test(ingredients)) return {
    ...base, status: 'UNCERTAIN', explanation: 'L’étiquette mentionne des traces ou un risque de contamination. Vérifiez l’emballage.',
  };
  if (product.barcode === 'SCAN_OCR') return { ...base, status: 'UNCERTAIN', explanation: 'Aucun allergène du profil repéré sur la photo. Une lecture automatique peut omettre des informations : vérifiez l’étiquette.' };
  return { ...base, status: 'SAFE', explanation: 'Aucun allergène de votre profil détecté dans les données disponibles. Cela ne garantit pas l’absence d’allergènes : vérifiez l’étiquette.' };
};
