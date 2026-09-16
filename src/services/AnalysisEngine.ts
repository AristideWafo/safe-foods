import type { Product, AnalysisResult, AllergenId, AllergenDef, AnalysisEvidence } from '../types';
import { INGREDIENT_KEYWORDS } from '../constants/allergens';
import { AMBIGUOUS_KEYWORDS, DICTIONARY_VERSION, EXCLUDED_PHRASES } from '../constants/detectionRules';
import { DEFAULT_CUSTOM_ALLERGENS, getAllergenDefinitions } from '../constants/customAllergens';

export const ENGINE_VERSION = '2.0.0';
export const normalizeIngredientText = (text: string) => text
  .toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ');
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternFor = (keyword: string) => new RegExp(`(?<![a-z0-9])${/^e\d+$/.test(keyword) ? `e\\s*${keyword.slice(1)}` : escapeRegex(normalizeIngredientText(keyword))}(?:s|es)?(?![a-z0-9])`, 'g');
const precaution = /\b(?:peut contenir|peuvent contenir|traces?|may contain|might contain)\b/;
const facility = /\b(?:atelier|usine|facility|fabrique dans|equipements? partages?)\b/;

export const analyzeProduct = (product: Product, userAllergies: AllergenId[], custom: AllergenDef[] = DEFAULT_CUSTOM_ALLERGENS): AnalysisResult => {
  const definitions = getAllergenDefinitions(custom);
  const selected = definitions.filter(a => userAllergies.includes(a.id));
  const evidence: AnalysisEvidence[] = [];
  const qualityIssues: string[] = [];
  if (!selected.length) qualityIssues.push('Aucune allergie renseignée.');
  if (selected.length !== new Set(userAllergies).size) qualityIssues.push('Une restriction du profil n’est pas prise en charge.');
  if (!product.ingredientsText.trim()) qualityIssues.push('Liste des ingrédients absente.');
  if (product.ingredientsComplete !== true) qualityIssues.push('Complétude des ingrédients non vérifiée.');
  if (product.labelReadable !== true) qualityIssues.push('Lisibilité de l’étiquette non vérifiée.');
  if (product.warningsComplete !== true) qualityIssues.push('Zones d’avertissements non vérifiées.');
  if (product.language !== 'fr') qualityIssues.push('Langue non vérifiée ou hors périmètre français du POC.');
  if (product.labelVerified !== true) qualityIssues.push('Étiquette réelle et identité du produit non relues par l’utilisateur.');
  if (product.sourceConflict) qualityIssues.push('Contradiction entre sources non résolue.');
  if (selected.some(a => a.id.startsWith('custom:'))) qualityIssues.push('Recherche personnalisée limitée aux mots-clés configurés.');

  for (const a of selected) {
    for (const [tags, kind, source] of [
      [product.allergensHierarchy, 'declared', 'allergen_tags'],
      [product.tracesTags, 'possible_presence', 'trace_tags'],
    ] as const) {
      for (const tag of tags || []) if (a.offTags.includes(tag.toLowerCase()))
        evidence.push({ allergen: a.id, kind, source, rule: `tag:${tag}` });
    }
    for (const [raw, source] of [[product.ingredientsText, 'ingredients'], [product.warningsText || '', 'warnings']] as const) {
      // A comma must not reset the scope of a precautionary warning.
      for (const sentence of raw.split(/[.;\n]+/).filter(s => s.trim())) {
        const text = normalizeIngredientText(sentence);
        for (const [keywords, ambiguous] of [
          [a.keywords || INGREDIENT_KEYWORDS[a.id] || [a.label], false],
          [AMBIGUOUS_KEYWORDS[a.id] || [], true],
        ] as const) for (const keyword of keywords) {
          for (const match of text.matchAll(patternFor(keyword))) {
            const start = match.index!;
            const excluded = (EXCLUDED_PHRASES[a.id] || []).some(phrase => {
              for (const occurrence of text.matchAll(patternFor(phrase)))
                if (start >= occurrence.index! && start < occurrence.index! + occurrence[0].length) return true;
              return false;
            });
            if (excluded) continue;
            const before = text.slice(0, start);
            const localBefore = before.split(',').at(-1)!;
            const after = text.slice(start + match[0].length);
            const negated = /(?:\bsans|\bexempt(?:e)? de|\bne contient pas(?: de)?|\bfree (?:of|from))(?:\s+d[eu])?\s*$/.test(localBefore) || /^\s*free\b/.test(after);
            const unclearNegative = /\b(?:sans|ne contient|free from)\b/.test(localBefore) && !/\bingredients\s*:/.test(localBefore);
            const kind = negated ? 'claim' : precaution.test(before) ? 'possible_presence'
              : facility.test(before) ? 'facility' : ambiguous || unclearNegative ? 'ambiguous'
              : source === 'warnings' && !/\b(?:contient|contains)\b/.test(before) ? 'ambiguous' : 'ingredient';
            const proof: AnalysisEvidence = { allergen: a.id, kind, source, quote: sentence.trim(), rule: `keyword:${keyword}` };
            if (!evidence.some(e => e.allergen === proof.allergen && e.kind === proof.kind && e.source === proof.source && e.quote === proof.quote)) evidence.push(proof);
          }
        }
        if (precaution.test(text) || facility.test(text)) {
          if (!evidence.some(e => e.source === source && e.quote === sentence.trim() && ['possible_presence', 'facility'].includes(e.kind))) {
            const issue = 'Avertissement dont la portée n’est pas résolue.';
            if (!qualityIssues.includes(issue)) qualityIssues.push(issue);
          }
        }
      }
    }
  }
  const ids = (kinds: AnalysisEvidence['kind'][]) => [...new Set(evidence.filter(e => kinds.includes(e.kind)).map(e => e.allergen))];
  const detectedAllergens = ids(['declared']);
  const detectedTraces = ids(['possible_presence', 'facility']);
  const textualMatches = ids(['ingredient', 'ambiguous']);
  const positive = ids(['declared', 'ingredient']);
  const caution = ids(['possible_presence', 'facility', 'ambiguous']);
  const names = (allergens: AllergenId[]) => definitions.filter(a => allergens.includes(a.id)).map(a => a.label).join(', ');
  const base = { detectedAllergens, detectedTraces, textualMatches, evidence, qualityIssues, engineVersion: ENGINE_VERSION, dictionaryVersion: DICTIONARY_VERSION };
  if (positive.length) return { ...base, status: 'AVOID', explanation: `Correspondance identifiée : ${names(positive)}. Vérifiez l’étiquette physique.${qualityIssues.length ? ' L’analyse reste incomplète : d’autres informations peuvent manquer.' : ''}` };
  if (caution.length || qualityIssues.length) return { ...base, status: 'UNCERTAIN', explanation: `${caution.length ? `Présence possible ou mention ambiguë : ${names(caution)}. ` : ''}Impossible de conclure à l’absence de correspondance. Vérifiez l’étiquette avant de consommer.` };
  return { ...base, status: 'SAFE', explanation: 'Aucun allergène de votre profil identifié dans les données relues. Cela ne garantit pas l’absence d’allergènes ou de contamination croisée.' };
};
