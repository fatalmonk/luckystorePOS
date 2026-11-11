'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTheme } from '../../providers/ThemeProvider';

export type Resolved = 'light' | 'dark';
export type ThemeSelection = Resolved | 'system';
export type Direction = 'ltr' | 'rtl' | 'ttb' | 'btt';

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

const WIPE_TYPE = 'animate-ui-theme';

function clipKeyframes(direction: Direction): [string, string] {
  switch (direction) {
    case 'rtl':
      return ['inset(0 0 0 100%)', 'inset(0 0 0 0)'];
    case 'ttb':
      return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
    case 'btt':
      return ['inset(100% 0 0 0)', 'inset(0 0 0 0)'];
    default:
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
  }
}

function systemTheme(): Resolved {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * One shared stylesheet rule covers the theme wipe. This component does not
 * emit a <style> tag, so header and drawer toggles do not repeat it.
 */
export function ThemeToggler({
  direction = 'ltr',
  onImmediateChange,
  children,
}: ThemeTogglerProps) {
  const themeContext = useTheme();
  const theme = themeContext?.theme ?? 'light';
  const setTheme = themeContext?.setTheme;
  const [resolved, setResolved] = useState<Resolved>(theme);
  const [fromClip, toClip] = clipKeyframes(direction);

  useEffect(() => {
    setResolved(theme);
  }, [theme]);

  const toggleTheme = useCallback((nextTheme?: ThemeSelection) => {
    const selection: ThemeSelection = nextTheme ?? (resolved === 'dark' ? 'light' : 'dark');
    const nextResolved = selection === 'system' ? systemTheme() : selection;
    onImmediateChange?.(selection);
    if (!setTheme) return;

    const apply = () => {
      setResolved(nextResolved);
      document.documentElement.classList.toggle('dark', nextResolved === 'dark');
      if (nextResolved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      setTheme(nextResolved);
    };

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const startViewTransition = document.startViewTransition?.bind(document);
    if (reduced || !startViewTransition) {
      flushSync(apply);
      return;
    }

    let transition: { ready: Promise<void> };
    try {
      transition = document.startViewTransition({
        update: () => {
          flushSync(apply);
        },
        types: [WIPE_TYPE],
      });
    } catch {
      flushSync(apply);
      return;
    }
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [fromClip, toClip] },
        { duration: 700, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
      );
    });
  }, [fromClip, onImmediateChange, resolved, setTheme, toClip]);

  if (typeof children !== 'function') return null;

  return children({ theme: resolved, resolved, toggleTheme });
}
