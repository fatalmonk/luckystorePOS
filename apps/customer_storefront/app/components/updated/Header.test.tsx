import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

let mockSearchParams = new URLSearchParams();
let mockPathname = '/category';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme: vi.fn(), toggleTheme: vi.fn() }),
}));

vi.mock('../DesktopQuickRail', () => ({
  DesktopQuickRail: ({ hidden }: { hidden?: boolean }) => (
    <aside data-hidden={hidden ? 'true' : 'false'}>Quick rail</aside>
  ),
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
    mockPathname = '/category';
  });

  it('exposes responsive search and cart controls in the header', () => {
    render(<Header />);

    expect(screen.getAllByText('Lucky Store')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Switch to Dark mode' })).toHaveLength(2);
    expect(screen.getByLabelText('Search products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit search' })).toBeInTheDocument();
    const cartButtons = screen.getAllByRole('button', { name: 'Cart' });
    expect(cartButtons).toHaveLength(2);
    expect(cartButtons.find((button) => button.dataset.compact === 'true')).toBeInTheDocument();
    expect(cartButtons.find((button) => button.dataset.compact === 'false')).toBeInTheDocument();
  });

  it('exposes the desktop category strip and quick rail on catalog routes', () => {
    render(<Header />);

    const tabletCategories = screen.getByRole('navigation', { name: 'Categories' });
    expect(tabletCategories).toHaveClass('hidden', 'md:flex', 'lg:hidden');
    const categories = screen.getByRole('navigation', { name: 'Product categories' });
    expect(categories).toBeInTheDocument();
    expect(within(categories).getByRole('link', { name: 'All' })).toBeInTheDocument();
    const allLinks = screen.getAllByRole('link', { name: 'All' });
    expect(allLinks).toHaveLength(2);
    allLinks.forEach((link) => expect(link).toBeInTheDocument());
    expect(screen.getByText('Quick rail')).toBeInTheDocument();
    const menuButtons = screen.getAllByRole('button', { name: 'Open menu' });
    expect(menuButtons).toHaveLength(2);
    menuButtons.forEach((button) => expect(button).toHaveAttribute('aria-haspopup', 'dialog'));
  });

  it('keeps the localized category rail for tablet widths while hiding it on mobile', () => {
    mockPathname = '/bn/category/snacks';
    render(<Header />);

    expect(screen.getByRole('navigation', { name: 'ক্যাটাগরি' })).toHaveClass('hidden', 'md:flex', 'lg:hidden');
    expect(screen.getByRole('navigation', { name: 'পণ্যের ক্যাটাগরি' })).toBeInTheDocument();
  });

  it('hides the full header and its layout spacer on mobile when requested', () => {
    render(<Header hideOnMobile />);

    expect(screen.getByRole('banner')).toHaveClass('hidden', 'md:block');
    expect(document.querySelector('[aria-hidden="true"].hidden.md\\:block')).toBeInTheDocument();
  });

  it('keeps the mobile category strip on non-category routes', () => {
    mockPathname = '/';
    render(<Header />);

    expect(screen.getByRole('navigation', { name: 'Categories' })).toBeInTheDocument();
  });

  it('unsets All when active catalog theme is present', () => {
    mockSearchParams = new URLSearchParams('theme=deals');
    render(<Header />);

    screen.getAllByRole('link', { name: 'All' }).forEach((link) => {
      expect(link).not.toHaveAttribute('aria-current');
    });
  });

  it('hides header on scroll down and reveals it on scroll up', () => {
    let rafCallback: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    render(<Header />);
    const header = screen.getByRole('banner');
    const quickRail = screen.getByText('Quick rail');
    expect(header).toHaveClass('translate-y-0');
    expect(header).not.toHaveClass('-translate-y-full');
    expect(quickRail).toHaveAttribute('data-hidden', 'false');

    // Simulate scrolling down past threshold
    act(() => {
      window.scrollY = 150;
      window.dispatchEvent(new Event('scroll'));
      rafCallback(0);
    });

    expect(header).toHaveClass('-translate-y-full');
    expect(quickRail).toHaveAttribute('data-hidden', 'true');

    // Simulate scrolling up
    act(() => {
      window.scrollY = 80;
      window.dispatchEvent(new Event('scroll'));
      rafCallback(0);
    });

    expect(header).toHaveClass('translate-y-0');
    expect(header).not.toHaveClass('-translate-y-full');
    expect(quickRail).toHaveAttribute('data-hidden', 'false');
  });
});
