import React from 'react';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

vi.mock('./BottomNavShell', () => ({
  BottomNavShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./ActiveLink', () => ({
  ActiveLink: ({ href, label }: { href: string; label: string }) => <a href={href}>{label}</a>,
}));

describe('BottomNav', () => {
  it('uses Profile instead of Cart as the fourth destination', () => {
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.queryByRole('link', { name: /Cart/ })).not.toBeInTheDocument();
  });
});
