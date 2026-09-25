import { useEffect } from 'react';

interface UseInventoryKeyboardShortcutsOptions {
  enabled: boolean;
  isListView: boolean;
  setIsListView: (value: boolean) => void;
  setIsBulkEditMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  onAddProduct?: () => void;
  onExport?: () => void;
  onScan?: () => void;
}

export function useInventoryKeyboardShortcuts({
  enabled,
  isListView,
  setIsListView,
  setIsBulkEditMode,
  onAddProduct,
  onExport,
  onScan,
}: UseInventoryKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target;
      if (!(target instanceof HTMLElement) || target.isContentEditable || target.closest(
        'input, textarea, select, button, [role="button"], [role="checkbox"], [role="combobox"], [contenteditable="true"], [role="dialog"][aria-modal="true"]'
      )) {
        return;
      }

      // Shift + E - Toggle bulk edit mode
      if (e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setIsBulkEditMode((prev: boolean) => !prev);
        return;
      }

      // Shift + G - Toggle Grid/List view
      if (e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setIsListView(!isListView);
        return;
      }

      // Shift + A - Add product
      if (e.shiftKey && e.key === 'A' && onAddProduct) {
        e.preventDefault();
        onAddProduct();
        return;
      }

      // Shift + X - Export
      if (e.shiftKey && e.key === 'X' && onExport) {
        e.preventDefault();
        onExport();
        return;
      }

      // Shift + S - Scan
      if (e.shiftKey && e.key === 'S' && onScan) {
        e.preventDefault();
        onScan();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, isListView, setIsListView, setIsBulkEditMode, onAddProduct, onExport, onScan]);
}
