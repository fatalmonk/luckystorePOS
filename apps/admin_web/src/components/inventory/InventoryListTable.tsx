import type { InventoryItem } from '../../types/inventory';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { InventoryCardFeed } from './InventoryCardFeed';
import { InventoryListTableRow } from './InventoryListTableRow';

type ResizableColumn = 'product' | 'stock' | 'cost' | 'mrp' | 'price' | 'margin' | 'status' | 'lastPurchase';

const DEFAULT_COLUMN_WIDTHS: Record<ResizableColumn, number> = {
  product: 320,
  stock: 190,
  cost: 100,
  mrp: 100,
  price: 110,
  margin: 110,
  status: 100,
  lastPurchase: 140,
};

const MIN_COLUMN_WIDTHS: Record<ResizableColumn, number> = {
  product: 220,
  stock: 150,
  cost: 80,
  mrp: 80,
  price: 90,
  margin: 90,
  status: 84,
  lastPurchase: 120,
};

const COLUMN_WIDTHS_STORAGE_KEY = 'inventory-table-column-widths';
const ROW_HEIGHTS_STORAGE_KEY = 'inventory-table-row-heights';

interface ResizableHeaderProps {
  column: ResizableColumn;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  onResize: (column: ResizableColumn, width: number) => void;
}

function ResizableHeader({ column, label, width, align = 'left', onResize }: ResizableHeaderProps) {
  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onResize(column, Math.max(MIN_COLUMN_WIDTHS[column], startWidth + moveEvent.clientX - startX));
    };
    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize, { once: true });
  };

  return (
    <th
      className={`relative px-4 py-3 whitespace-nowrap ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      {label}
      <button
        type="button"
        aria-label={`Resize ${label} column`}
        title={`Drag to resize ${label} column. Double-click to reset.`}
        className="absolute right-0 top-0 h-full w-2 translate-x-1/2 cursor-col-resize touch-none group/resize focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary z-10"
        onPointerDown={startResize}
        onDoubleClick={() => onResize(column, DEFAULT_COLUMN_WIDTHS[column])}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          onResize(column, Math.max(MIN_COLUMN_WIDTHS[column], width + (event.key === 'ArrowRight' ? 8 : -8)));
        }}
      >
        <span className="absolute right-[3px] top-1/2 h-5 w-px -translate-y-1/2 bg-border group-hover/resize:bg-primary group-focus/resize:bg-primary" />
      </button>
    </th>
  );
}

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
  const [columnWidths, setColumnWidths] = useState<Record<ResizableColumn, number>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      return saved ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });
  const [rowHeights, setRowHeights] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(ROW_HEIGHTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    localStorage.setItem(ROW_HEIGHTS_STORAGE_KEY, JSON.stringify(rowHeights));
  }, [rowHeights]);

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
    estimateSize: (index) => rowHeights[items[index]?.id] ?? 72,
    overscan: 5,
    scrollMargin,
  });

  const resizeColumn = useCallback((column: ResizableColumn, width: number) => {
    setColumnWidths((current) => ({ ...current, [column]: Math.round(width) }));
  }, []);

  const resizeRow = useCallback((index: number, itemId: string, height: number) => {
    const nextHeight = Math.max(56, Math.min(180, Math.round(height)));
    setRowHeights((current) => ({ ...current, [itemId]: nextHeight }));
    rowVirtualizer.resizeItem(index, nextHeight);
  }, [rowVirtualizer]);

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
        <table
          className="text-left border-collapse [&_th]:border-r [&_th]:border-border/70 [&_td]:border-r [&_td]:border-b [&_td]:border-border/60 [&_tr>*:last-child]:border-r-0"
          aria-rowcount={items.length}
          aria-colcount={10}
          style={{
            tableLayout: 'fixed',
            width: 52 + 72 + Object.values(columnWidths).reduce((sum, width) => sum + width, 0),
          }}
        >
          <colgroup>
            <col style={{ width: 52 }} />
            <col style={{ width: columnWidths.product }} />
            <col style={{ width: columnWidths.stock }} />
            <col style={{ width: columnWidths.cost }} />
            <col style={{ width: columnWidths.mrp }} />
            <col style={{ width: columnWidths.price }} />
            <col style={{ width: columnWidths.margin }} />
            <col style={{ width: columnWidths.status }} />
            <col style={{ width: columnWidths.lastPurchase }} />
            <col style={{ width: 72 }} />
          </colgroup>
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
              <ResizableHeader column="product" label="Product" width={columnWidths.product} onResize={resizeColumn} />
              <ResizableHeader column="stock" label="Stock" width={columnWidths.stock} align="center" onResize={resizeColumn} />
              <ResizableHeader column="cost" label="Cost" width={columnWidths.cost} align="right" onResize={resizeColumn} />
              <ResizableHeader column="mrp" label="MRP" width={columnWidths.mrp} align="right" onResize={resizeColumn} />
              <ResizableHeader column="price" label="Price" width={columnWidths.price} align="right" onResize={resizeColumn} />
              <ResizableHeader column="margin" label="Margin" width={columnWidths.margin} align="right" onResize={resizeColumn} />
              <ResizableHeader column="status" label="Status" width={columnWidths.status} align="center" onResize={resizeColumn} />
              <ResizableHeader column="lastPurchase" label="Last Purchase" width={columnWidths.lastPurchase} align="right" onResize={resizeColumn} />
              <th className="px-4 py-3 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
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
                  rowIndex={virtualRow.index + 1}
                  virtualRowSize={virtualRow.size}
                  onRowHeightChange={(height) => resizeRow(virtualRow.index, item.id, height)}
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
              <tr aria-hidden="true">
                <td style={{ height: `${paddingBottom}px` }} colSpan={10} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
