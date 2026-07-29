import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/category',
}));

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../HeaderFilters', () => ({
  HeaderFilters: () => <div data-testid="header-filters">Filters</div>,
}));

vi.mock('../HeaderCartButton', () => ({
  HeaderCartButton: () => <button type="button">Cart</button>,
}));

vi.mock('../ui/Logo', () => ({
  Logo: () => <div>Lucky Store</div>,
}));

vi.mock('./SearchSuggestions', () => ({
  SearchSuggestions: () => <div>Suggestions</div>,
}));

describe('Header catalog filter strip', () => {
  it('uses dependable utility copy without an unverified promotion', () => {
    render(<Header />);

    expect(screen.getByText('Delivery across Chittagong')).toBeVisible();
    expect(screen.getByText('Serving since 1947')).toBeVisible();
    expect(screen.queryByText(/PROMO|WELCOME10|Free delivery/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+880 1731-944544' })).toHaveAttribute(
      'href',
      'tel:+8801731944544',
    );
  });

  it('keeps desktop filters outside mobile scrolling and permits visible overflow', () => {
    render(<Header />);

    const filters = screen.getByTestId('header-filters');
    expect(filters.parentElement).toHaveClass(
      'hidden',
      'md:flex',
      'overflow-visible',
    );
    expect(filters.closest('nav')).toHaveClass('md:overflow-visible');
  });
});
