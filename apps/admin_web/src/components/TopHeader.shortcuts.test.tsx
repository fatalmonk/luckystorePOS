import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en', resolvedLanguage: 'en', changeLanguage: vi.fn() } }),
}));

import { TopHeader } from './TopHeader';

function Header({ hidden = false }: { hidden?: boolean }) {
  return <TopHeader onToggleSidebar={() => {}} sidebarHidden={false} isMobile={false} hidden={hidden} />;
}

function renderHeader() {
  return render(<MemoryRouter><Header /></MemoryRouter>);
}

describe('TopHeader keyboard shortcuts', () => {
  it('opens and closes the global help modal with ? and Escape', async () => {
    renderHeader();
    fireEvent.keyDown(document.body, { key: '?' });
    expect(await screen.findByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' })).not.toBeInTheDocument());
  });

  it('suppresses the command palette while help is open and keeps modal focus through rerenders', async () => {
    const { rerender } = renderHeader();
    fireEvent.keyDown(document.body, { key: '?' });
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard Shortcuts' });
    const closeButton = screen.getByRole('button', { name: 'Close shortcuts guide' });
    await waitFor(() => expect(closeButton).toHaveFocus());

    rerender(<MemoryRouter><Header hidden /></MemoryRouter>);
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBe(dialog);
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    expect(closeButton).toHaveFocus();
  });

  it('does not open global shortcuts from a form control', () => {
    renderHeader();
    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(input, { key: '?' });
    expect(screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' })).not.toBeInTheDocument();
    input.remove();
  });
});
