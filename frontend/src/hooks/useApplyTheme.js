import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { THEME_COLORS } from '../lib/themeColors';
export function useApplyTheme() {
    const accentColor = useThemeStore((state) => state.accentColor);
    useEffect(() => {
        const colors = THEME_COLORS[accentColor] || THEME_COLORS.emerald;
        const root = document.documentElement;
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-primary-hover', colors.primaryHover);
        root.style.setProperty('--color-primary-light', colors.primaryLight);
    }, [accentColor]);
}
//# sourceMappingURL=useApplyTheme.js.map