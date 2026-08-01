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
  HeaderFilters: () => null,
}));

vi.mock('../DesktopQuickRail', () => ({
  DesktopQuickRail: () => <aside>Quick rail</aside>,
}));

vi.mock('../AppDrawer', () => ({
  AppDrawer: () => null,
}));

vi.mock('../HeaderCartButton', () => ({
  HeaderCartButton: ({ compact }: { compact?: boolean }) => (
    <button type="button" data-compact={compact ? 'true' : 'false'}>Cart</button>
  ),
}));

vi.mock('../ui/Logo', () => ({
  Logo: () => <div>Lucky Store</div>,
}));

vi.mock('./SearchSuggestions', () => ({
  SearchSuggestions: () => <div>Suggestions</div>,
}));

describe('Header catalog filter strip', () => {
  it('shows a search icon and cart button in the header', () => {
    render(<Header />);

    expect(screen.getByText('Lucky Store')).toBeInTheDocument();
    expect(screen.getByLabelText('Open search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cart' })).toBeInTheDocument();
  });

  it('exposes the desktop category strip and quick rail on catalog routes', () => {
    render(<Header />);

    expect(screen.getByRole('navigation', { name: 'Product categories' })).toBeInTheDocument();
    expect(screen.getByText('Quick rail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });
});
