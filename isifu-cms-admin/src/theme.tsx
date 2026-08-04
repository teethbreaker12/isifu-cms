import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
export type Accent = 'blue' | 'green' | 'violet' | 'amber' | 'rose' | 'slate';

const themes: Theme[] = ['light', 'dark', 'system'];
const accents: Accent[] = ['blue', 'green', 'violet', 'amber', 'rose', 'slate'];

function readStoredTheme(): Theme {
  const stored = localStorage.getItem('cms_theme');
  return themes.includes(stored as Theme) ? (stored as Theme) : 'system';
}

function readStoredAccent(): Accent {
  const stored = localStorage.getItem('cms_accent');
  return accents.includes(stored as Accent) ? (stored as Accent) : 'green';
}

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}>({
  theme: 'system',
  resolvedTheme: 'light',
  accent: 'green',
  setTheme: () => undefined,
  setAccent: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [accent, setAccent] = useState<Accent>(readStoredAccent);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const resolvedTheme = theme === 'system' ? systemTheme : theme;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = theme;
    localStorage.setItem('cms_theme', theme);
  }, [theme, systemTheme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem('cms_accent', accent);
  }, [accent]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme === 'system' ? systemTheme : theme,
      accent,
      setTheme,
      setAccent,
    }),
    [theme, systemTheme, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
