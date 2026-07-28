import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccentColor = 'emerald' | 'blue' | 'purple' | 'pink' | 'orange';

interface ThemeState {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentColor: 'emerald',
      setAccentColor: (color) => set({ accentColor: color }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
