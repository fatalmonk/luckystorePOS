import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/category',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
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
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it('exposes responsive search and cart controls in the header', () => {
    render(<Header />);

    expect(screen.getAllByText('Lucky Store')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Open search' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit search' })).toBeInTheDocument();
    const cartButtons = screen.getAllByRole('button', { name: 'Cart' });
    expect(cartButtons).toHaveLength(2);
    expect(cartButtons.find((button) => button.dataset.compact === 'true')).toBeInTheDocument();
    expect(cartButtons.find((button) => button.dataset.compact === 'false')).toBeInTheDocument();
  });

  it('exposes the desktop category strip and quick rail on catalog routes', () => {
    render(<Header />);

    expect(screen.getByRole('navigation', { name: 'Product categories' })).toBeInTheDocument();
    expect(screen.getByText('Quick rail')).toBeInTheDocument();
    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    expect(menuButtons).toHaveLength(2);
    menuButtons.forEach((button) => expect(button).toHaveAttribute('aria-haspopup', 'dialog'));
  });

  it('unsets All when active catalog theme is present', () => {
    mockSearchParams = new URLSearchParams('theme=deals');
    render(<Header />);

    const categories = screen.getByRole('navigation', { name: 'Product categories' });
    expect(within(categories).getByRole('link', { name: 'All' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
