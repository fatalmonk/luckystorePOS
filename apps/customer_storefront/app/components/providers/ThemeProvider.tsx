'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'lucky-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function getPreferredTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme, withTransition = false) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (withTransition) {
    root.classList.add('theme-transitioning');
    requestAnimationFrame(() => {
      window.setTimeout(() => root.classList.remove('theme-transitioning'), 200);
    });
  }

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }

  root.style.colorScheme = theme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0B0B0D' : '#FDFBF7');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    setThemeState(preferredTheme);
    applyTheme(preferredTheme);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (getStoredTheme()) return;
      const nextTheme: Theme = event.matches ? 'dark' : 'light';
      setThemeState(nextTheme);
      applyTheme(nextTheme, true);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // @ts-ignore - legacy Safari fallback
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        // @ts-ignore - legacy Safari fallback
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The theme still applies when storage is unavailable.
    }
    applyTheme(nextTheme, true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // The theme still applies when storage is unavailable.
      }
      applyTheme(nextTheme, true);
      return nextTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
