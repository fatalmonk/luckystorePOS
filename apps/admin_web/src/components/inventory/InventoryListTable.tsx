import type { InventoryItem } from '../../types/inventory';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { InventoryCardFeed } from './InventoryCardFeed';
import { InventoryListTableRow } from './InventoryListTableRow';

export interface InventoryListTableProps {
  items: InventoryItem[];
  storeId?: string;
  onUpdateStock: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll?: (ids: string[], isAllSelected: boolean) => void;
  compact?: boolean;
  view?: 'card' | 'table';
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
  view,
  scrollElement,
  toolbarHeight,
}: InventoryListTableProps) {
  // Determine effective view mode ('table' if explicit view==='table' or compact===true when view is unset)
  const effectiveView: 'card' | 'table' = view ?? (compact ? 'table' : 'card');

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);

  const getParent = useCallback(
    () => scrollElement || (document.querySelector('.main-content') as HTMLDivElement) || null,
    [scrollElement]
  );

  useEffect(() => {
    if (effectiveView !== 'table') return;

    const el = containerRef.current;
    const parent = getParent();
    if (!el || !parent) return;

    const measure = () => {
      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      setScrollMargin(elRect.top - parentRect.top + parent.scrollTop);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(parent);
    resizeObserver.observe(el);

    parent.addEventListener('scroll', measure, { passive: true });

    return () => {
      resizeObserver.disconnect();
      parent.removeEventListener('scroll', measure);
    };
  }, [getParent, items, effectiveView]);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: getParent,
    estimateSize: () => 72,
    overscan: 5,
    scrollMargin,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? Math.max(0, virtualRows[0].start - scrollMargin) : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const isAllSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const isSomeSelected = items.some((item) => selectedIds.has(item.id));

  const handleHeaderCheckbox = () => {
    if (onSelectAll) {
      onSelectAll(
        items.map((i) => i.id),
        !isAllSelected
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="w-full py-3">
        <div className="px-4 py-12 text-center text-sm text-text-muted bg-surface rounded-lg border border-border m-3">
          No inventory items found. Add products to start tracking stock levels.
        </div>
      </div>
    );
  }

  if (effectiveView === 'card') {
    return (
      <div className="w-full py-3">
        <InventoryCardFeed
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onUpdateStock={onUpdateStock}
          onViewHistory={onViewHistory}
          onEditProduct={onEditProduct}
          onDelete={onDelete}
          scrollElement={scrollElement}
          toolbarHeight={toolbarHeight}
        />
      </div>
    );
  }

  return (
    <div className="w-full py-3 px-3">
      <div
        ref={containerRef}
        className="w-full relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm"
      >
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-raised border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider select-none sticky top-0 z-20">
            <tr>
              <th className="px-4 py-3 text-center w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                  }}
                  onChange={handleHeaderCheckbox}
                  aria-label="Select all products"
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 min-w-[260px] max-w-[400px]">Product</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Stock</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Cost</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">MRP</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Price</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Margin</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Last Purchase</th>
              <th className="px-4 py-3 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={10} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const item = items[virtualRow.index];
              if (!item) return null;
              return (
                <InventoryListTableRow
                  key={item.id}
                  item={item}
                  virtualRowSize={virtualRow.size}
                  isSelected={selectedIds.has(item.id)}
                  isOpen={openMenuRowId === item.id}
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  onToggleOpen={() => setOpenMenuRowId((prev) => (prev === item.id ? null : item.id))}
                  onClick={() => onUpdateStock(item)}
                  onViewHistory={() => onViewHistory?.(item)}
                  onEditProduct={() => onEditProduct?.(item)}
                  onDelete={() => onDelete?.(item)}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onInlineSave={onInlineSave}
                  storeId={storeId}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={10} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
