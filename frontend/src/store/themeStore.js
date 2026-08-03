import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useThemeStore = create()(persist((set) => ({
    accentColor: 'emerald',
    setAccentColor: (color) => set({ accentColor: color }),
}), {
    name: 'theme-storage',
}));
//# sourceMappingURL=themeStore.js.map