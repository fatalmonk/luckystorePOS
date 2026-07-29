import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from './ThemeProvider';

const matchMedia = vi.fn();

function ThemeControls() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={toggleTheme}>Toggle</button>
      <button type="button" onClick={() => setTheme('light')}>Use light</button>
    </>
  );
}

function renderThemeControls() {
  return render(
    <ThemeProvider>
      <ThemeControls />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
  matchMedia.mockReset();
  matchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('matchMedia', matchMedia);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeProvider', () => {
  it('uses the system preference when no theme has been saved', async () => {
    matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    renderThemeControls();

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('prefers a saved theme over the system preference', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    renderThemeControls();

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('light'));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('toggles and persists the selected theme', async () => {
    renderThemeControls();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Use light' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
