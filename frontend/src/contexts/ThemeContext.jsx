import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const applyTheme = (theme) => {
  const root = document.documentElement;
  const resolved =
    theme === 'system' ? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light') : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'system');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);

    // Sistem teması seçiliyse işletim sistemi değişikliğini canlı takip et.
    if (theme !== 'system') return undefined;

    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleChange = () => applyTheme('system');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- context ile aynı dosyada kalması okunaklı
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır');
  return context;
};
