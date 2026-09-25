import { useEffect, type RefObject } from 'react';

interface UseInventoryKeyboardShortcutsOptions {
  regionRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  isListView: boolean;
  setIsListView: (value: boolean) => void;
  setIsBulkEditMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  onAddProduct?: () => void;
  onExport?: () => void;
  onScan?: () => void;
}

export function useInventoryKeyboardShortcuts({
  regionRef,
  disabled = false,
  isListView,
  setIsListView,
  setIsBulkEditMode,
  onAddProduct,
  onExport,
  onScan,
}: UseInventoryKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const target = e.target instanceof Element
        ? e.target
        : activeElement instanceof Element
          ? activeElement
          : null;
      const isWithinRegion = activeElement instanceof Node && regionRef.current?.contains(activeElement);
      const isEditable = target !== null
        && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || (target as HTMLElement).isContentEditable);
      const isInDialog = target !== null && target.closest('[role="dialog"]') !== null;
      if (disabled || !target || !isWithinRegion || isEditable || isInDialog) {
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
  }, [regionRef, disabled, isListView, setIsListView, setIsBulkEditMode, onAddProduct, onExport, onScan]);
}
