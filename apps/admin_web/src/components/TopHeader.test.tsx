import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopHeader } from './TopHeader';

const props = {
  onToggleSidebar: () => undefined,
  sidebarHidden: false,
  isMobile: false,
};

describe('TopHeader keyboard help', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('prevents other global overlays while help is open and closes with ?', () => {
    const { rerender } = render(<MemoryRouter><TopHeader {...props} /></MemoryRouter>);
    const helpButton = screen.getByRole('button', { name: 'Keyboard shortcuts & help' });
    helpButton.focus();
    fireEvent.click(helpButton);

    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    expect(dialog).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(document, { key: '/' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    const focused = document.activeElement;
    rerender(<MemoryRouter><TopHeader {...props} /></MemoryRouter>);
    expect(document.activeElement).toBe(focused);

    fireEvent.keyDown(document, { key: '?' });
    expect(screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' })).not.toBeInTheDocument();
    expect(helpButton).toHaveFocus();
  });

  it('does not open the command palette from an editable field', () => {
    render(
      <MemoryRouter>
        <input aria-label="Page editor" />
        <TopHeader {...props} />
      </MemoryRouter>,
    );

    const editor = screen.getByRole('textbox', { name: 'Page editor' });
    editor.focus();
    fireEvent.keyDown(editor, { key: 'k', ctrlKey: true });

    expect(screen.queryByRole('dialog', { name: 'Quick actions' })).not.toBeInTheDocument();
  });

  it('prevents the browser Ctrl+K action while help is open', () => {
    render(<MemoryRouter><TopHeader {...props} /></MemoryRouter>);
    const helpButton = screen.getByRole('button', { name: 'Keyboard shortcuts & help' });
    helpButton.focus();
    fireEvent.click(helpButton);

    const closeButton = screen.getByRole('button', { name: 'Close shortcuts guide' });
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
    closeButton.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Quick actions' })).not.toBeInTheDocument();
  });
});
