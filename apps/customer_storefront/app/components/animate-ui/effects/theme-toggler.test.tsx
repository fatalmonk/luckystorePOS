import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggler } from './theme-toggler';
import { ThemeProvider } from '../../providers/ThemeProvider';

function TestConsumer({ direction = 'ltr' }: { direction?: 'ltr' | 'rtl' | 'ttb' | 'btt' }) {
  return (
    <ThemeProvider>
      <ThemeToggler direction={direction}>
        {({ theme, resolved, toggleTheme }) => (
          <div>
            <span data-testid="theme-val">{theme}</span>
            <span data-testid="resolved-val">{resolved}</span>
            <button type="button" onClick={() => toggleTheme()}>
              Toggle Theme
            </button>
            <button type="button" onClick={() => toggleTheme('dark')}>
              Set Dark
            </button>
            <button type="button" onClick={() => toggleTheme('light')}>
              Set Light
            </button>
          </div>
        )}
      </ThemeToggler>
    </ThemeProvider>
  );
}

describe('ThemeToggler', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with initial light theme and toggles to dark', async () => {
    render(<TestConsumer />);

    expect(screen.getByTestId('resolved-val')).toHaveTextContent('light');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Theme' }));
    });

    expect(screen.getByTestId('resolved-val')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('triggers document.startViewTransition and animate clip-path when supported', async () => {
    let transitionUpdateFn: (() => void) | null = null;
    let animateFinishedResolve: () => void = () => {};
    const animateMock = vi.fn().mockReturnValue({
      finished: new Promise<void>((resolve) => {
        animateFinishedResolve = resolve;
      }),
    });

    const startViewTransitionMock = vi.fn().mockImplementation((config: any) => {
      const update = typeof config === 'function' ? config : config?.update;
      transitionUpdateFn = update;
      return {
        ready: Promise.resolve(),
      };
    });

    (document as any).startViewTransition = startViewTransitionMock;
    (document.documentElement as any).animate = animateMock;

    render(<TestConsumer direction="ltr" />);

    // Trigger toggle to dark
    let togglePromise: Promise<void>;
    act(() => {
      togglePromise = (async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Toggle Theme' }));
      })();
    });

    expect(startViewTransitionMock).toHaveBeenCalled();
    if (transitionUpdateFn) {
      (transitionUpdateFn as () => void)();
    }

    // Wait for microtasks
    await act(async () => {
      await Promise.resolve();
    });

    // Check animate was called with clipPath keyframes
    expect(animateMock).toHaveBeenCalledWith(
      { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] },
      expect.objectContaining({
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }),
    );

    // Resolve wipe animation
    await act(async () => {
      animateFinishedResolve();
      await togglePromise!;
    });

    expect(screen.getByTestId('resolved-val')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    delete (document as any).startViewTransition;
    delete (document.documentElement as any).animate;
  });

  it('supports RTL clip-path direction when specified', async () => {
    const animateMock = vi.fn().mockReturnValue({
      finished: Promise.resolve(),
    });
    const startViewTransitionMock = vi.fn().mockImplementation((config: any) => {
      const update = typeof config === 'function' ? config : config?.update;
      update?.();
      return { ready: Promise.resolve() };
    });

    (document as any).startViewTransition = startViewTransitionMock;
    (document.documentElement as any).animate = animateMock;

    render(<TestConsumer direction="rtl" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Set Dark' }));
    });

    expect(animateMock).toHaveBeenCalledWith(
      { clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0)'] },
      expect.anything(),
    );

    delete (document as any).startViewTransition;
    delete (document.documentElement as any).animate;
  });
});
