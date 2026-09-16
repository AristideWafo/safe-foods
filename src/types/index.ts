export type AllergenId = 
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs'
  | `custom:${string}`;

export type AnalysisStatus = 'SAFE' | 'AVOID' | 'UNCERTAIN';

export type AllergenIconName = 'Wheat' | 'Shrimp' | 'Egg' | 'Fish' | 'NutOff' | 'Sprout' | 'Milk' | 'Nut' | 'Leaf' | 'Droplet' | 'CircleDot' | 'TestTube' | 'Flower2' | 'Shell';

export interface AllergenDef {
  id: AllergenId;
  label: string;
  icon: AllergenIconName;
  offTags: string[]; // OpenFoodFacts tags to match (en or fr)
  keywords?: string[];
}

export interface UserProfile {
  allergies: AllergenId[];
}

export interface Product {
  barcode: string;
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  ingredientsText: string;
  allergensHierarchy: string[];
  tracesTags: string[];
  source?: "openfoodfacts" | "photo";
  fetchedAt?: number;
  updatedAt?: number;
  analysisModel?: string;
}

export interface AnalysisResult {
  status: AnalysisStatus;
  explanation: string;
  detectedAllergens: AllergenId[];
  detectedTraces: AllergenId[];
  textualMatches?: AllergenId[];
}

export interface ScanHistoryItem {
  id: string;
  date: number;
  barcode: string;
  product: Product;
  allergiesAtScan?: AllergenId[];
  result: AnalysisResult;
  isFavorite?: boolean;
}
