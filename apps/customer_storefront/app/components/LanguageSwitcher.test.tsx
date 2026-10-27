import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders default link with correct attributes', () => {
    render(<LanguageSwitcher />);

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/bn');
    expect(link).toHaveAttribute('hrefLang', 'bn-BD');
    expect(link).toHaveAttribute('lang', 'bn');
    expect(link).toHaveTextContent('বাংলা');
    expect(screen.queryByTestId('language-skeleton')).not.toBeInTheDocument();
  });

  it('triggers immediate navigation on click without animation delay', () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('link'));

    expect(mockPush).toHaveBeenCalledWith('/bn', { scroll: false });
  });

  it('does not navigate on modified clicks (meta, ctrl, shift, alt)', () => {
    render(<LanguageSwitcher />);

    const link = screen.getByRole('link');
    ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'].forEach((key) => {
      const event = new MouseEvent('click', { [key]: true, bubbles: true, cancelable: true });
      event.preventDefault(); // suppress jsdom unhandled navigation error
      link.dispatchEvent(event);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('supports children render function for headless integration', () => {
    render(
      <LanguageSwitcher>
        {({ locale, targetLocale, targetHref, label, toggleLanguage }) => (
          <button type="button" onClick={() => toggleLanguage()}>
            {`${locale} to ${targetLocale} (${label}) -> ${targetHref}`}
          </button>
        )}
      </LanguageSwitcher>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('en to bn (বাংলা) -> /bn');

    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/bn', { scroll: false });
  });

  it('triggers onImmediateChange and supports explicit target locale', () => {
    const handleImmediateChange = vi.fn();
    render(
      <LanguageSwitcher onImmediateChange={handleImmediateChange}>
        {({ toggleLanguage, isTransitioning }) => (
          <div>
            <span data-testid="status">{isTransitioning ? 'switching' : 'idle'}</span>
            <button type="button" onClick={() => toggleLanguage('bn')}>
              Switch to BN
            </button>
          </div>
        )}
      </LanguageSwitcher>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('idle');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to BN' }));

    expect(handleImmediateChange).toHaveBeenCalledWith('bn');
    expect(mockPush).toHaveBeenCalledWith('/bn', { scroll: false });
  });
});
