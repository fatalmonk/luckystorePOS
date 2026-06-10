import type { InventoryItem } from '../../types/inventory';
import React, { useState, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { InventoryListTableRow } from './InventoryListTableRow';

interface InventoryListTableProps {
  items: InventoryItem[];
  storeId?: string;
  onUpdateStock: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], isAllSelected: boolean) => void;
}

export function InventoryListTable({
  items,
  storeId,
  onUpdateStock,
  onViewHistory,
  onEditProduct,
  onDelete,
  onInlineSave,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: InventoryListTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  const isAllSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  // Handle tab navigation
  const handleTabNavigation = useCallback(
    (currentRowId: string, currentField: string, direction: 'forward' | 'backward') => {
      const editableFields = [
        'name',
        'sku',
        'current_qty',
        'cost',
        'price',
        'mrp',
        'last_purchased_date',
      ];

      const currentIndex = editableFields.indexOf(currentField);
      let nextIndex: number;

      if (direction === 'forward') {
        nextIndex = (currentIndex + 1) % editableFields.length;
        // If wrapping to next row
        if (nextIndex === 0) {
          const currentRowIdx = items.findIndex((i) => i.id === currentRowId);
          const nextRow = items[currentRowIdx + 1];
          if (nextRow) {
            setEditingCell({ rowId: nextRow.id, field: editableFields[0] });
          }
          return;
        }
      } else {
        nextIndex = (currentIndex - 1 + editableFields.length) % editableFields.length;
        // If wrapping to previous row
        if (nextIndex === editableFields.length - 1) {
          const currentRowIdx = items.findIndex((i) => i.id === currentRowId);
          const prevRow = items[currentRowIdx - 1];
          if (prevRow) {
            setEditingCell({ rowId: prevRow.id, field: editableFields[editableFields.length - 1] });
          }
          return;
        }
      }

      setEditingCell({ rowId: currentRowId, field: editableFields[nextIndex] });
    },
    [items]
  );

  return (
    <div className="w-full rounded-xl border border-warm-border-warm bg-warm-surface overflow-hidden">
      <div ref={parentRef} className="overflow-auto" style={{ height: 'calc(100vh - 350px)' }}>
        <table className="w-full border-collapse">
          {/* Sticky Header - Solid Background + Proper Z-Index */}
          <thead className="sticky top-0 z-20">
            <tr className="bg-warm-surface border-b border-warm-border-warm">
              <th className="w-10 px-4 py-3 text-center bg-warm-surface">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(items.map((item) => item.id), e.target.checked)}
                  className="rounded border-warm-border-warm text-warm-accent focus:ring-warm-accent w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface w-full max-w-[400px]">Product</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface whitespace-nowrap">Stock</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface whitespace-nowrap">Selling</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface whitespace-nowrap">Profit</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface whitespace-nowrap">Updated</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em] bg-warm-surface">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="relative z-10">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-warm-dim">No inventory items found. Add products to start tracking stock levels.</td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={8} style={{ height: `${paddingTop}px`, padding: 0 }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  if (!item) return null;
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <InventoryListTableRow
                      key={item.id}
                      index={virtualRow.index}
                      item={item}
                      virtualRowSize={virtualRow.size}
                      isSelected={isSelected}
                      isOpen={openMenuId === item.id}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      onToggleOpen={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      onClick={() => onUpdateStock(item)}
                      onViewHistory={() => onViewHistory?.(item)}
                      onEditProduct={() => onEditProduct?.(item)}
                      onDelete={() => onDelete?.(item)}
                      onToggleSelect={() => onToggleSelect(item.id)}
                      onInlineSave={onInlineSave}
                      onTabNavigation={handleTabNavigation}
                      storeId={storeId}
                    />
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={8} style={{ height: `${paddingBottom}px`, padding: 0 }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
