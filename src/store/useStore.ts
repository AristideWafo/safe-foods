import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AllergenId, Product, ScanHistoryItem } from '../types';
import { ALLERGENS } from '../constants/allergens';
import { analyzeProduct } from '../services/AnalysisEngine';
import { isRecord, parseProduct } from '../services/ProductValidation';

export interface SafeEatState {
  allergies: AllergenId[];
  history: ScanHistoryItem[];
  toggleAllergy: (id: AllergenId) => void;
  addHistoryItem: (item: ScanHistoryItem) => void;
  recordScan: (product: Product) => string;
  clearHistory: () => void;
  resetProfile: () => void;
}
const parseAllergies = (value: unknown): AllergenId[] => ALLERGENS.filter(a => Array.isArray(value) && value.includes(a.id)).map(a => a.id);
export const sanitizeStoredState = (value: unknown): Pick<SafeEatState, 'allergies' | 'history'> => {
  const state = isRecord(value) ? value : {};
  const allergies = parseAllergies(state.allergies);
  const history: ScanHistoryItem[] = [];
  if (Array.isArray(state.history)) for (const entry of state.history) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.date !== 'number' || !Number.isFinite(entry.date)) continue;
    const product = parseProduct(entry.product);
    if (!product || history.some(scan => scan.id === entry.id)) continue;
    history.push({ id: entry.id, date: entry.date, barcode: product.barcode, product, result: analyzeProduct(product, allergies), allergiesAtScan: Array.isArray(entry.allergiesAtScan) ? parseAllergies(entry.allergiesAtScan) : undefined });
    if (history.length === 50) break;
  }
  return { allergies, history };
};
export const useStore = create<SafeEatState>()(persist((set, get) => ({
  allergies: [], history: [],
  toggleAllergy: id => set(state => {
    const allergies = state.allergies.includes(id) ? state.allergies.filter(a => a !== id) : [...state.allergies, id];
    return { allergies, history: state.history.map(scan => ({ ...scan, result: analyzeProduct(scan.product, allergies) })) };
  }),
  addHistoryItem: item => set(state => ({ history: state.history.some(scan => scan.id === item.id) ? state.history : [item, ...state.history].slice(0, 50) })),
  recordScan: product => {
    const id = crypto.randomUUID();
    const allergies = [...get().allergies];
    get().addHistoryItem({ id, date: Date.now(), barcode: product.barcode, product, result: analyzeProduct(product, allergies), allergiesAtScan: allergies });
    return id;
  },
  clearHistory: () => set({ history: [] }),
  resetProfile: () => set(state => ({ allergies: [], history: state.history.map(scan => ({ ...scan, result: analyzeProduct(scan.product, []) })) })),
}), {
  name: 'safe-eat-storage', version: 2, storage: createJSONStorage(() => globalThis.localStorage),
  migrate: value => sanitizeStoredState(value),
  merge: (persisted, current) => ({ ...current, ...sanitizeStoredState(persisted) }),
}));
