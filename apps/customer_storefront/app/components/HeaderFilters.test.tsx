import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderFilters } from './HeaderFilters';

const push = vi.fn();
let currentParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/category',
  useSearchParams: () => currentParams,
}));

describe('HeaderFilters', () => {
  beforeEach(() => {
    push.mockReset();
    currentParams = new URLSearchParams('q=milk&theme=deals');
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it('preserves unrelated query parameters when applying a price filter', () => {
    render(<HeaderFilters />);

    fireEvent.click(screen.getByRole('button', { name: /^Price/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Under ৳100' }));

    expect(push).toHaveBeenCalledWith(
      '/category?q=milk&theme=deals&price=0-100',
      { scroll: false },
    );
  });

  it('closes on Escape and restores focus to the active trigger', async () => {
    render(<HeaderFilters />);

    const priceTrigger = screen.getByRole('button', { name: /^Price/ });
    fireEvent.click(priceTrigger);
    expect(priceTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(priceTrigger).toHaveAttribute('aria-expanded', 'false');
      expect(priceTrigger).toHaveFocus();
    });
  });
});
