import React from 'react';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

vi.mock('./BottomNavShell', () => ({
  BottomNavShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./ActiveLink', () => ({
  ActiveLink: ({ href, label, hideLabel }: { href: string; label: string; hideLabel?: boolean }) => (
    <a href={href} aria-label={label}>{!hideLabel ? label : null}</a>
  ),
}));

describe('BottomNav', () => {
  it('renders home, shop, search, cart, profile destinations in order', () => {
    render(<BottomNav />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[0]).toHaveTextContent('Home');
    expect(links[1]).toHaveAttribute('href', '/category');
    expect(links[1]).toHaveTextContent('Shop');
    expect(links[2]).toHaveAttribute('href', '/search');
    expect(links[2]).toHaveTextContent('Search');
    expect(links[3]).toHaveAttribute('href', '/cart');
    expect(links[3]).toHaveTextContent('Cart');
    expect(links[4]).toHaveAttribute('href', '/profile');
    expect(links[4]).toHaveTextContent('Profile');
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('squeezes 30% smaller on scroll down and expands on scroll up', () => {
    let rafCallback: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

    render(<BottomNav />);
    const nav = screen.getByRole('navigation');
    const links = screen.getAllByRole('link');

    expect(nav).toHaveClass('h-[3.875rem]');
    expect(nav).toHaveClass('max-w-[390px]');
    expect(links[0]).toHaveTextContent('Home');

    // Simulate scrolling down past threshold
    act(() => {
      window.scrollY = 120;
      window.dispatchEvent(new Event('scroll'));
      rafCallback(0);
    });

    // Folds into compact Dynamic Island pill and hides text labels
    expect(nav).toHaveClass('h-12');
    expect(nav).toHaveClass('max-w-[280px]');
    expect(links[0]).not.toHaveTextContent('Home');

    // Simulate scrolling up
    act(() => {
      window.scrollY = 60;
      window.dispatchEvent(new Event('scroll'));
      rafCallback(0);
    });

    // Expands back to full bottom nav with visible labels
    expect(nav).toHaveClass('h-[3.875rem]');
    expect(nav).toHaveClass('max-w-[390px]');
    expect(links[0]).toHaveTextContent('Home');
  });
});
