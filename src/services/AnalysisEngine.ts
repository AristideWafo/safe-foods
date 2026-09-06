import { Product, AnalysisResult, AllergenId } from '../types';
import { ALLERGENS } from '../constants/allergens';

export const analyzeProduct = (product: Product, userAllergies: AllergenId[]): AnalysisResult => {
  const detectedAllergens: AllergenId[] = [];
  const detectedTraces: AllergenId[] = [];
  let hasTextualMatchButNoTag = false;
  let conflictExplanation = "";

  const ingredientsLower = (product.ingredientsText || '').toLowerCase();
  
  // Helper to check for negation
  const hasNegation = (keyword: string, text: string) => {
    const negationPatterns = [
      new RegExp(`sans\\s+${keyword}`),
      new RegExp(`${keyword}\\s+free`),
      new RegExp(`ne\\s+contient\\s+pas\\s+(de\\s+)?${keyword}`),
      new RegExp(`exempt\\s+de\\s+${keyword}`),
      new RegExp(`fabriqué\\s+sans\\s+${keyword}`)
    ];
    return negationPatterns.some(pattern => pattern.test(text));
  };

  // Check each user allergy
  userAllergies.forEach(allergyId => {
    const allergenDef = ALLERGENS.find(a => a.id === allergyId);
    if (!allergenDef) return;

    // 1. Check in OFF Tags
    const isInAllergens = product.allergensHierarchy?.some(tag => 
      allergenDef.offTags.includes(tag.toLowerCase())
    );

    // 2. Check in Traces
    const isInTraces = product.tracesTags?.some(tag => 
      allergenDef.offTags.includes(tag.toLowerCase())
    );

    // 3. Text analysis
    let isTextMatch = false;
    let isNegated = false;

    if (ingredientsLower) {
      const keywords = allergenDef.offTags.map(tag => tag.replace(/^(en|fr):/, '').replace(/-/g, ' '));
      // Add custom keywords if needed, e.g., 'lait' for milk
      if (allergyId === 'milk') keywords.push('lait', 'beurre', 'crème', 'lactosérum', 'fromage');
      if (allergyId === 'eggs') keywords.push('oeuf', 'œuf', 'oeufs', 'œufs');
      if (allergyId === 'peanuts') keywords.push('arachide', 'cacahuète');
      
      const foundKeyword = keywords.find(keyword => ingredientsLower.includes(keyword));
      
      if (foundKeyword) {
        if (hasNegation(foundKeyword, ingredientsLower)) {
          isNegated = true;
        } else {
          isTextMatch = true;
        }
      }
    }

    if (isInAllergens) {
      detectedAllergens.push(allergyId);
    } else if (isInTraces) {
      detectedTraces.push(allergyId);
    } else if (isTextMatch && !isNegated) {
      hasTextualMatchButNoTag = true;
      conflictExplanation = `Mention de "${allergenDef.label}" détectée dans le texte des ingrédients, mais non confirmée par les tags officiels.`;
      // Don't push to detectedAllergens yet, keep it as uncertain
      if (!detectedTraces.includes(allergyId)) {
        detectedTraces.push(allergyId); // Treat as trace/uncertain
      }
    }
  });

  const hasPeutContenirText = ingredientsLower.includes('peut contenir') || ingredientsLower.includes('traces éventuelles');

  // Priority 1: Confirmed Allergen
  if (detectedAllergens.length > 0) {
    const allergenNames = detectedAllergens.map(id => ALLERGENS.find(a => a.id === id)?.label).join(', ');
    return {
      status: 'AVOID',
      explanation: `Allergène(s) détecté(s) formellement dans ce produit : ${allergenNames}.`,
      detectedAllergens,
      detectedTraces,
    };
  }

  // Priority 2: Traces or Textual Match
  if (detectedTraces.length > 0) {
    const tracesNames = detectedTraces.map(id => ALLERGENS.find(a => a.id === id)?.label).join(', ');
    return {
      status: 'UNCERTAIN',
      explanation: hasTextualMatchButNoTag 
        ? `${conflictExplanation} Par mesure de précaution (SafeEat), le statut est incertain.`
        : `Traces potentielles détectées pour : ${tracesNames}.`,
      detectedAllergens: [],
      detectedTraces,
    };
  }

  // Empty ingredients text without tags
  if (!product.ingredientsText || product.ingredientsText.trim() === '') {
    return {
      status: 'UNCERTAIN',
      explanation: "La liste des ingrédients n'est pas disponible pour ce produit. Vérifiez l'emballage.",
      detectedAllergens: [],
      detectedTraces: [],
    };
  }

  // General warning if 'peut contenir' is present but no specific matched trace
  if (hasPeutContenirText && userAllergies.length > 0) {
    return {
      status: 'UNCERTAIN',
      explanation: "L'étiquette mentionne des 'traces possibles' ou 'peut contenir' des allergènes, prudence.",
      detectedAllergens: [],
      detectedTraces: [],
    };
  }

  // Priority 3: SAFE
  return {
    status: 'SAFE',
    explanation: "Aucun allergène détecté dans les données disponibles. Restez vigilant.",
    detectedAllergens: [],
    detectedTraces: [],
  };
};
