'use client';

import React, { useCallback } from 'react';
import {
  ThemeToggler as PrimitiveThemeToggler,
  type Resolved,
  type ThemeSelection,
  type Direction,
} from '@animate-ui/react/primitives/effects/theme-toggler';
import { useTheme } from '../../providers/ThemeProvider';

export type { Resolved, ThemeSelection, Direction };

export interface ThemeTogglerRenderState {
  theme: ThemeSelection;
  resolved: Resolved;
  toggleTheme: (nextTheme?: ThemeSelection) => void;
}

export interface ThemeTogglerProps {
  direction?: Direction;
  onImmediateChange?: (theme: ThemeSelection) => void;
  children?: (state: ThemeTogglerRenderState) => React.ReactNode;
}

export function ThemeToggler({
  direction = 'ltr',
  onImmediateChange,
  children,
}: ThemeTogglerProps) {
  const themeContext = useTheme();
  const theme = themeContext?.theme ?? 'light';
  const setTheme = themeContext?.setTheme;

  const handleSetTheme = useCallback(
    (next: ThemeSelection) => {
      if (!setTheme) return;
      if (next === 'system') {
        const isSystemDark =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isSystemDark ? 'dark' : 'light');
      } else {
        setTheme(next);
      }
    },
    [setTheme],
  );

  return (
    <PrimitiveThemeToggler
      theme={theme as ThemeSelection}
      resolvedTheme={theme as Resolved}
      setTheme={handleSetTheme}
      direction={direction}
      onImmediateChange={onImmediateChange}
    >
      {({ resolved, effective, toggleTheme }) => {
        const handleToggle = (nextTheme?: ThemeSelection) => {
          if (nextTheme) {
            toggleTheme(nextTheme);
          } else {
            toggleTheme(resolved === 'dark' ? 'light' : 'dark');
          }
        };

        if (typeof children === 'function') {
          return children({
            theme: effective,
            resolved,
            toggleTheme: handleToggle,
          });
        }

        return null;
      }}
    </PrimitiveThemeToggler>
  );
}

export { PrimitiveThemeToggler };
