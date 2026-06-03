import { useEffect, useState } from 'react';

interface UseInventoryKeyboardShortcutsOptions {
  isListView: boolean;
  setIsListView: (value: boolean) => void;
  setIsBulkEditMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  onAddProduct?: () => void;
  onExport?: () => void;
  onScan?: () => void;
}

export function useInventoryKeyboardShortcuts({
  isListView,
  setIsListView,
  setIsBulkEditMode,
  onAddProduct,
  onExport,
  onScan,
}: UseInventoryKeyboardShortcutsOptions) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
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
  }, [isListView, setIsListView, setIsBulkEditMode, onAddProduct, onExport, onScan]);

  return { showShortcuts, setShowShortcuts };
}
