import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useInventoryKeyboardShortcuts } from './useInventoryKeyboardShortcuts';

function Harness({
  onAdd,
  onViewChange = vi.fn(),
  disabled = false,
}: {
  onAdd: () => void;
  onViewChange?: (value: boolean) => void;
  disabled?: boolean;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  useInventoryKeyboardShortcuts({
    regionRef,
    disabled,
    isListView: false,
    setIsListView: onViewChange,
    setIsBulkEditMode: vi.fn(),
    onAddProduct: onAdd,
  });

  return (
    <>
      <button>Outside</button>
      <div ref={regionRef} tabIndex={-1} data-testid="region">
        <button>Inside</button>
        <input aria-label="Editor" />
        <div role="dialog"><button>Dialog action</button></div>
      </div>
    </>
  );
}

describe('useInventoryKeyboardShortcuts', () => {
  it('fires only within the focused inventory region', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    screen.getByRole('button', { name: 'Outside' }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Outside' }), { key: 'A', shiftKey: true });
    expect(onAdd).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Inside' }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'A', shiftKey: true });
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('ignores editable controls and dialog content inside the region', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    const editor = screen.getByRole('textbox', { name: 'Editor' });
    editor.focus();
    fireEvent.keyDown(editor, { key: 'A', shiftKey: true });

    const dialogButton = screen.getByRole('button', { name: 'Dialog action' });
    dialogButton.focus();
    fireEvent.keyDown(dialogButton, { key: 'A', shiftKey: true });

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('uses the focused element when a shortcut event targets window', () => {
    const onViewChange = vi.fn();
    render(<Harness onAdd={vi.fn()} onViewChange={onViewChange} />);

    screen.getByRole('button', { name: 'Inside' }).focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'G', shiftKey: true, cancelable: true }));

    expect(onViewChange).toHaveBeenCalledWith(true);
  });

  it('does not intercept shortcuts while disabled', () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} disabled />);

    const insideButton = screen.getByRole('button', { name: 'Inside' });
    insideButton.focus();
    const event = new KeyboardEvent('keydown', { key: 'A', shiftKey: true, bubbles: true, cancelable: true });
    insideButton.dispatchEvent(event);

    expect(onAdd).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not intercept the global help shortcut', () => {
    render(<Harness onAdd={vi.fn()} />);

    screen.getByRole('button', { name: 'Inside' }).focus();
    const event = new KeyboardEvent('keydown', { key: '?', cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
