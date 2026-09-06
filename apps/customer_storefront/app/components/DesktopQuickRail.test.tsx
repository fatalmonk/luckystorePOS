import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopQuickRail } from './DesktopQuickRail';

let mockPathname = '/';
let mockSearchParams = new URLSearchParams();
let mockUser: { id: string } | null = null;
let mockLoading = false;
const push = vi.fn();
const ensureAuth = vi.fn().mockResolvedValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('./providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, loading: mockLoading, ensureAuth }),
}));

describe('DesktopQuickRail', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    mockPathname = '/';
    mockSearchParams = new URLSearchParams();
    mockUser = null;
    mockLoading = false;
    ensureAuth.mockReset().mockResolvedValue(null);
    push.mockReset();
  });

  afterEach(() => vi.useRealTimers());

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
    expect(screen.getByRole('link', { name: 'Home' }).querySelector('svg')).toHaveAttribute('width', '18');
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

  it('does not initialize auth for the hidden mobile rail', () => {
    vi.useFakeTimers();
    render(<DesktopQuickRail />);
    act(() => { window.dispatchEvent(new Event('load')); vi.advanceTimersByTime(4000); });
    expect(ensureAuth).not.toHaveBeenCalled();
  });

  it('resolves an early orders click before selecting its destination', async () => {
    mockLoading = true;
    ensureAuth.mockResolvedValue({ user: { id: 'signed-in' } });
    render(<DesktopQuickRail />);
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/profile#orders'));
  });

  it('defers desktop initialization until after load', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    render(<DesktopQuickRail />);
    act(() => { window.dispatchEvent(new Event('load')); vi.advanceTimersByTime(2999); });
    expect(ensureAuth).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(ensureAuth).toHaveBeenCalledTimes(1);
  });

  it('stays out of checkout and authentication routes', () => {
    mockPathname = '/checkout';

    const { container } = render(<DesktopQuickRail />);

    expect(container).toBeEmptyDOMElement();
  });
});
