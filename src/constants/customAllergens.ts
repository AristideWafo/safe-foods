import type { AllergenDef } from '../types';
import { ALLERGENS } from './allergens';
export const DEFAULT_CUSTOM_ALLERGENS: AllergenDef[] = [
  { id: 'custom:sunflower', label: 'Tournesol', icon: 'Flower2', offTags: [], keywords: ['tournesol', 'sunflower'] },
  { id: 'custom:pineapple', label: 'Ananas', icon: 'Leaf', offTags: [], keywords: ['ananas', 'pineapple'] },
];
export const getAllergenDefinitions = (custom: AllergenDef[] = DEFAULT_CUSTOM_ALLERGENS) => [...custom, ...ALLERGENS];
