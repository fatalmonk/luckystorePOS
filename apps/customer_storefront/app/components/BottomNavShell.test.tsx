import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BottomNavShell } from './BottomNavShell';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('BottomNavShell', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('renders children into document.body on mount', () => {
    render(
      <BottomNavShell>
        <div data-testid="nav-content">Nav Items</div>
      </BottomNavShell>
    );

    const content = screen.getByTestId('nav-content');
    expect(content).toBeInTheDocument();
    expect(document.body).toContainElement(content);
  });

  it('hides on /checkout and /order paths', () => {
    mockPathname = '/checkout';
    const { rerender } = render(
      <BottomNavShell>
        <div data-testid="nav-content">Nav Items</div>
      </BottomNavShell>
    );

    expect(screen.queryByTestId('nav-content')).not.toBeInTheDocument();

    mockPathname = '/order/123';
    rerender(
      <BottomNavShell>
        <div data-testid="nav-content">Nav Items</div>
      </BottomNavShell>
    );

    expect(screen.queryByTestId('nav-content')).not.toBeInTheDocument();
  });
});
