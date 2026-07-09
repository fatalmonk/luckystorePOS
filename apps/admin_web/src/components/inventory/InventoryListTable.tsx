import type { InventoryItem } from '../../types/inventory';
import React, { useState, useCallback } from 'react';
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
  compact?: boolean;
  scrollElement?: HTMLDivElement | null;
  toolbarHeight?: number;
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
  compact = false,
  scrollElement,
  toolbarHeight,
}: InventoryListTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement || (document.querySelector('.main-content') as HTMLDivElement) || null,
    estimateSize: () => compact ? 32 : 72,
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
    <div className="w-full py-12 md:py-24 px-4 md:px-8">
      {/* Outer Shell */}
      <div className="bg-black/5 dark:bg-white/5 p-2 rounded-[2rem] ring-1 ring-black/5 dark:ring-white/10 w-full overflow-hidden">
        {/* Inner Core */}
        <div 
          className="table-wrap w-full bg-warm-surface rounded-[calc(2rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-x-auto" 
          style={{ '--table-sticky-top': `${toolbarHeight || 140}px` } as React.CSSProperties}
        >
          <table className="inventory w-full min-w-[1000px]">
            {/* Sticky Header - Solid Background + Proper Z-Index */}
            <thead>
              <tr className="border-b border-warm-border-warm shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <th className="w-10 px-4 py-4 text-center bg-warm-surface/80 backdrop-blur-md rounded-tl-[calc(2rem-0.5rem)]">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => onSelectAll(items.map((item) => item.id), e.target.checked)}
                    className="rounded border-warm-border-warm text-warm-accent focus:ring-warm-accent w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4 text-left w-[250px] md:w-[300px] bg-warm-surface/80 backdrop-blur-md">Product</th>
                <th className="px-4 py-4 text-center whitespace-nowrap w-[140px] bg-warm-surface/80 backdrop-blur-md tracking-wider text-[10px] uppercase font-bold text-warm-dim">Avail / Rsvd</th>
            <th className="px-4 py-4 text-right whitespace-nowrap w-[90px] bg-warm-surface/80 backdrop-blur-md text-[10px] uppercase font-bold text-warm-dim tracking-wider">Cost</th>
            <th className="px-4 py-4 text-right whitespace-nowrap w-[90px] bg-warm-surface/80 backdrop-blur-md text-[10px] uppercase font-bold text-warm-dim tracking-wider">MRP</th>
            <th className="px-4 py-4 text-right whitespace-nowrap w-[110px] bg-warm-surface/80 backdrop-blur-md text-[10px] uppercase font-bold text-warm-dim tracking-wider">Selling</th>
            <th className="px-4 py-4 text-right whitespace-nowrap w-[110px] bg-warm-surface/80 backdrop-blur-md text-[10px] uppercase font-bold text-warm-dim tracking-wider">Margin</th>
            <th className="px-4 py-4 text-center w-[80px] bg-warm-surface/80 backdrop-blur-md text-[10px] uppercase font-bold text-warm-dim tracking-wider">Status</th>
            <th className="px-4 py-4 text-right whitespace-nowrap w-[100px] bg-warm-surface/80 backdrop-blur-md text-[10px] uppercase font-bold text-warm-dim tracking-wider">Purchase</th>
            <th className="px-4 py-4 text-right w-[80px] bg-warm-surface/80 backdrop-blur-md rounded-tr-[calc(2rem-0.5rem)] text-[10px] uppercase font-bold text-warm-dim tracking-wider">Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="relative z-10">
          {items.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-sm text-warm-dim">No inventory items found. Add products to start tracking stock levels.</td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={10} style={{ height: `${paddingTop}px`, padding: 0 }} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const item = items[virtualRow.index];
                if (!item) return null;
                const isSelected = selectedIds.has(item.id);

                return (
                  <InventoryListTableRow
                    key={item.id}
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
                    compact={compact}
                  />
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={10} style={{ height: `${paddingBottom}px`, padding: 0 }} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
}
