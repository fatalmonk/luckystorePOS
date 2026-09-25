import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInventoryKeyboardShortcuts } from './useInventoryKeyboardShortcuts';

describe('useInventoryKeyboardShortcuts', () => {
  it('has no inventory-owned help state and ignores shortcuts until enabled', () => {
    const setIsListView = vi.fn();
    const { result } = renderHook(() => useInventoryKeyboardShortcuts({
      enabled: false,
      isListView: true,
      setIsListView,
      setIsBulkEditMode: vi.fn(),
    }));

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'G', shiftKey: true, bubbles: true })));

    expect(result.current).toBeUndefined();
    expect(setIsListView).not.toHaveBeenCalled();
  });

  it('toggles from the effective table view and ignores form controls', () => {
    const setIsListView = vi.fn();
    renderHook(() => useInventoryKeyboardShortcuts({
      enabled: true,
      isListView: true,
      setIsListView,
      setIsBulkEditMode: vi.fn(),
    }));

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'G', shiftKey: true, bubbles: true })));
    expect(setIsListView).toHaveBeenCalledWith(false);

    const input = document.createElement('input');
    document.body.append(input);
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'G', shiftKey: true, bubbles: true })));
    expect(setIsListView).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('does not intercept the global help shortcut', () => {
    const preventDefault = vi.fn();
    renderHook(() => useInventoryKeyboardShortcuts({
      enabled: true,
      isListView: false,
      setIsListView: vi.fn(),
      setIsBulkEditMode: vi.fn(),
    }));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true })));
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
