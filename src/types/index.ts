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
  | 'molluscs';

export type AnalysisStatus = 'SAFE' | 'AVOID' | 'UNCERTAIN';

export interface AllergenDef {
  id: AllergenId;
  label: string;
  icon: string; // lucide icon name
  offTags: string[]; // OpenFoodFacts tags to match (en or fr)
}

export interface UserProfile {
  allergies: AllergenId[];
}

export interface Product {
  barcode: string;
  name: string;
  imageUrl?: string;
  ingredientsText: string;
  allergensHierarchy: string[];
  tracesTags: string[];
}

export interface AnalysisResult {
  status: AnalysisStatus;
  explanation: string;
  detectedAllergens: AllergenId[];
  detectedTraces: AllergenId[];
}

export interface ScanHistoryItem {
  id: string;
  date: number;
  barcode: string;
  product?: Product;
  result: AnalysisResult;
}
