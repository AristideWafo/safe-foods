import { AllergenDef } from '../types';

export const ALLERGENS: AllergenDef[] = [
  { id: 'gluten', label: 'Gluten', icon: 'Wheat', offTags: ['en:gluten', 'fr:gluten', 'en:wheat', 'fr:blé', 'fr:ble', 'en:oats', 'en:barley', 'en:rye'] },
  { id: 'crustaceans', label: 'Crustacés', icon: 'Shrimp', offTags: ['en:crustaceans', 'fr:crustacés', 'fr:crustaces', 'en:shrimp', 'fr:crevette'] },
  { id: 'eggs', label: 'Œufs', icon: 'Egg', offTags: ['en:eggs', 'fr:œufs', 'fr:oeufs', 'en:egg', 'fr:oeuf'] },
  { id: 'fish', label: 'Poissons', icon: 'Fish', offTags: ['en:fish', 'fr:poissons', 'fr:poisson'] },
  { id: 'peanuts', label: 'Arachides', icon: 'NutOff', offTags: ['en:peanuts', 'fr:arachides', 'fr:arachide', 'en:peanut'] },
  { id: 'soybeans', label: 'Soja', icon: 'Sprout', offTags: ['en:soybeans', 'fr:soja', 'en:soy', 'fr:soya'] },
  { id: 'milk', label: 'Lait', icon: 'Milk', offTags: ['en:milk', 'fr:lait', 'en:dairy'] },
  { id: 'nuts', label: 'Fruits à coque', icon: 'Nut', offTags: ['en:nuts', 'fr:fruits à coque', 'fr:fruits-a-coque', 'en:almonds', 'fr:amandes', 'en:hazelnuts', 'fr:noisettes', 'en:walnuts', 'fr:noix', 'en:cashews', 'fr:noix de cajou', 'en:pecans'] },
  { id: 'celery', label: 'Céleri', icon: 'Leaf', offTags: ['en:celery', 'fr:céleri', 'fr:celeri'] },
  { id: 'mustard', label: 'Moutarde', icon: 'Droplet', offTags: ['en:mustard', 'fr:moutarde'] },
  { id: 'sesame', label: 'Sésame', icon: 'CircleDot', offTags: ['en:sesame-seeds', 'fr:graines de sésame', 'en:sesame', 'fr:sésame', 'fr:sesame'] },
  { id: 'sulphites', label: 'Sulfites', icon: 'TestTube', offTags: ['en:sulphur-dioxide-and-sulphites', 'fr:anhydride sulfureux et sulfites', 'en:sulphites', 'fr:sulfites', 'en:sulfites'] },
  { id: 'lupin', label: 'Lupin', icon: 'Flower2', offTags: ['en:lupin', 'fr:lupin'] },
  { id: 'molluscs', label: 'Mollusques', icon: 'Shell', offTags: ['en:molluscs', 'fr:mollusques', 'fr:mollusque'] },
];
