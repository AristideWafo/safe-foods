import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AllergenId, AllergenDef, Product, ScanHistoryItem } from '../types';
import { DEFAULT_CUSTOM_ALLERGENS, getAllergenDefinitions } from '../constants/customAllergens';
import { analyzeProduct, normalizeIngredientText } from '../services/AnalysisEngine';
import { isRecord, parseProduct } from '../services/ProductValidation';

export interface SafeEatState {
  customAllergens: AllergenDef[];
  addCustomAllergen: (label: string, keywords?: string[]) => void;
  preferences: { traceAlerts: boolean; sensoryAlerts: boolean };
  setPreference: (key: 'traceAlerts' | 'sensoryAlerts', enabled: boolean) => void;
  allergies: AllergenId[];
  history: ScanHistoryItem[];
  toggleAllergy: (id: AllergenId) => void;
  addHistoryItem: (item: ScanHistoryItem) => void;
  recordScan: (product: Product) => string;
  clearHistory: () => void;
  resetProfile: () => void;
  toggleFavorite: (id: string) => void;
}
const parseAllergies = (value: unknown, custom: AllergenDef[]): AllergenId[] => getAllergenDefinitions(custom).filter(a => Array.isArray(value) && value.includes(a.id)).map(a => a.id);
export const sanitizeStoredState = (value: unknown): Pick<SafeEatState, 'allergies' | 'history' | 'preferences' | 'customAllergens'> => {
  const state = isRecord(value) ? value : {};
  const customAllergens = [...DEFAULT_CUSTOM_ALLERGENS];
  if (Array.isArray(state.customAllergens)) for (const entry of state.customAllergens.slice(0, 30)) {
    if (customAllergens.length >= 30) break;
    if (!isRecord(entry) || typeof entry.id !== 'string' || !/^custom:[a-zA-Z0-9-]{1,64}$/.test(entry.id) || typeof entry.label !== 'string' || !entry.label.trim() || entry.label.length > 60 || !Array.isArray(entry.keywords) || !entry.keywords.length || entry.keywords.length > 20 || !entry.keywords.every(k => typeof k === 'string' && k.trim().length > 0 && k.length <= 60)) continue;
    const label = entry.label.trim();
    if (getAllergenDefinitions(customAllergens).some(a => a.id === entry.id || normalizeIngredientText(a.label) === normalizeIngredientText(label))) continue;
    customAllergens.push({ id: entry.id as AllergenId, label, keywords: entry.keywords as string[], icon: 'Flower2', offTags: [] });
  }
  const allergies = parseAllergies(state.allergies, customAllergens);
  const history: ScanHistoryItem[] = [];
  if (Array.isArray(state.history)) for (const entry of state.history) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.date !== 'number' || !Number.isFinite(entry.date)) continue;
    const product = parseProduct(entry.product);
    if (!product || history.some(scan => scan.id === entry.id)) continue;
    history.push({ id: entry.id, date: entry.date, barcode: product.barcode, product, result: analyzeProduct(product, allergies, customAllergens), allergiesAtScan: Array.isArray(entry.allergiesAtScan) ? parseAllergies(entry.allergiesAtScan, customAllergens) : undefined, isFavorite: entry.isFavorite === true });
    if (history.length === 50) break;
  }
  const settings = isRecord(state.preferences) ? state.preferences : {};
  return { allergies, history, customAllergens, preferences: { traceAlerts: typeof settings.traceAlerts === 'boolean' ? settings.traceAlerts : true, sensoryAlerts: typeof settings.sensoryAlerts === 'boolean' ? settings.sensoryAlerts : true } };
};
export const useStore = create<SafeEatState>()(persist((set, get) => ({
  allergies: [], history: [],
  customAllergens: DEFAULT_CUSTOM_ALLERGENS,
  addCustomAllergen: (input, aliases = []) => {
    const label = input.trim();
    const state = get();
    if (label.length < 2 || label.length > 60 || !/[\p{L}\p{N}]/u.test(label)) throw new Error('Saisissez un nom de 2 à 60 caractères.');
    if (state.customAllergens.length >= 30) throw new Error('La limite de 30 allergènes personnalisés est atteinte.');
    if (getAllergenDefinitions(state.customAllergens).some(a => normalizeIngredientText(a.label) === normalizeIngredientText(label))) throw new Error('Cet allergène existe déjà.');
    const keywords = [...new Set([label, ...aliases.map(k => k.trim()).filter(Boolean)])];
    if (keywords.length > 20 || keywords.some(k => k.length > 60)) throw new Error('Utilisez au plus 19 mots-clés supplémentaires de 60 caractères maximum.');
    const id: AllergenId = `custom:${crypto.randomUUID()}`;
    const customAllergens: AllergenDef[] = [...state.customAllergens, { id, label, keywords, icon: 'Flower2', offTags: [] }];
    const allergies = [...state.allergies, id];
    set({ customAllergens, allergies, history: state.history.map(scan => ({ ...scan, result: analyzeProduct(scan.product, allergies, customAllergens) })) });
  },
  preferences: { traceAlerts: true, sensoryAlerts: true },
  setPreference: (key, enabled) => set(state => ({ preferences: { ...state.preferences, [key]: enabled } })),
  toggleAllergy: id => set(state => {
    const allergies = state.allergies.includes(id) ? state.allergies.filter(a => a !== id) : [...state.allergies, id];
    return { allergies, history: state.history.map(scan => ({ ...scan, result: analyzeProduct(scan.product, allergies, state.customAllergens) })) };
  }),
  addHistoryItem: item => set(state => ({ history: state.history.some(scan => scan.id === item.id) ? state.history : [item, ...state.history].slice(0, 50) })),
  recordScan: product => {
    const id = crypto.randomUUID();
    const allergies = [...get().allergies];
    get().addHistoryItem({ id, date: Date.now(), barcode: product.barcode, product, result: analyzeProduct(product, allergies, get().customAllergens), allergiesAtScan: allergies });
    return id;
  },
  clearHistory: () => set({ history: [] }),
  toggleFavorite: id => set(state => ({ history: state.history.map(scan => scan.id === id ? { ...scan, isFavorite: !scan.isFavorite } : scan) })),
  resetProfile: () => set(state => ({ allergies: [], history: state.history.map(scan => ({ ...scan, result: analyzeProduct(scan.product, []) })) })),
}), {
  name: 'safe-eat-storage', version: 2, storage: createJSONStorage(() => globalThis.localStorage),
  migrate: value => sanitizeStoredState(value),
  merge: (persisted, current) => ({ ...current, ...sanitizeStoredState(persisted) }),
}));
