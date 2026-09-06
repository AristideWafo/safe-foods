import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AllergenId, ScanHistoryItem } from '../types';

interface SafeEatState {
  allergies: AllergenId[];
  history: ScanHistoryItem[];
  toggleAllergy: (id: AllergenId) => void;
  addHistoryItem: (item: ScanHistoryItem) => void;
  clearHistory: () => void;
}

export const useStore = create<SafeEatState>()(
  persist(
    (set) => ({
      allergies: [],
      history: [],
      toggleAllergy: (id) =>
        set((state) => ({
          allergies: state.allergies.includes(id)
            ? state.allergies.filter((a) => a !== id)
            : [...state.allergies, id],
        })),
      addHistoryItem: (item) =>
        set((state) => ({
          history: [item, ...state.history].slice(0, 50), // Keep last 50 scans
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'safe-eat-storage',
    }
  )
);
