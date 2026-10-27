import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDrawer } from './AppDrawer';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('./providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme: vi.fn(), toggleTheme: vi.fn() }),
}));

vi.mock('./ui/Logo', () => ({
  Logo: () => <div>Lucky Store Logo</div>,
}));

describe('AppDrawer', () => {
  beforeEach(() => {
    document.body.className = '';
  });

  it('renders into document.body when mounted and open, occupying full vertical viewport', () => {
    const handleClose = vi.fn();
    render(<AppDrawer open={true} onClose={handleClose} />);

    const dialog = screen.getByRole('dialog', { hidden: false });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('h-screen');
    expect(dialog.className).toContain('h-[100dvh]');
    expect(dialog.className).toContain('inset-y-0');
    expect(dialog.className).toContain('w-[var(--app-drawer-width,min(300px,85vw))]');
    expect(dialog.className).toContain('sm:w-[300px]');
    expect(document.body.classList.contains('app-drawer-open')).toBe(true);
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<AppDrawer open={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText(/close menu|মেনু বন্ধ করুন/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose on Escape keydown', () => {
    const handleClose = vi.fn();
    render(<AppDrawer open={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('removes app-drawer-open class from document.body when closed', () => {
    const handleClose = vi.fn();
    const { rerender } = render(<AppDrawer open={true} onClose={handleClose} />);
    expect(document.body.classList.contains('app-drawer-open')).toBe(true);

    rerender(<AppDrawer open={false} onClose={handleClose} />);
    expect(document.body.classList.contains('app-drawer-open')).toBe(false);
  });
});
