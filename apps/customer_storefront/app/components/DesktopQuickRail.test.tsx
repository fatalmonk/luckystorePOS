import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopQuickRail } from './DesktopQuickRail';

let mockPathname = '/';
let mockSearchParams = new URLSearchParams();
let mockUser: { id: string } | null = null;
let mockLoading = false;

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('./providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, loading: mockLoading }),
}));

describe('DesktopQuickRail', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockSearchParams = new URLSearchParams();
    mockUser = null;
    mockLoading = false;
  });

  it('shows the five confirmed quick links for signed-out shoppers', () => {
    render(<DesktopQuickRail />);

    expect(screen.getByRole('navigation', { name: 'Quick links' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/category');
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'Deals' })).toHaveAttribute('href', '/category?theme=deals');
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'href',
      '/login?next=/profile%23orders',
    );
    expect(screen.getByRole('link', { name: 'Home' }).querySelector('svg')).toHaveAttribute('width', '14');
  });

  it('switches the account destination to Profile for authenticated shoppers', () => {
    mockUser = { id: 'customer-1' };

    render(<DesktopQuickRail />);

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/profile#orders');
  });

  it('marks Deals active from the catalog theme query', () => {
    mockPathname = '/category';
    mockSearchParams = new URLSearchParams('theme=deals');

    render(<DesktopQuickRail />);

    expect(screen.getByRole('link', { name: 'Deals' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Shop' })).not.toHaveAttribute('aria-current');
  });

  it('stays out of checkout and authentication routes', () => {
    mockPathname = '/checkout';

    const { container } = render(<DesktopQuickRail />);

    expect(container).toBeEmptyDOMElement();
  });
});
