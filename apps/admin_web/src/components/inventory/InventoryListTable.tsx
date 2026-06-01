import React, { useState, useRef } from 'react';
import { Package, MoreVertical, History, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useVirtualizer } from '@tanstack/react-virtual';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  last_updated?: string;
  price?: number;
  cost?: number;
  mrp?: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  last_purchased_date?: string;
}

const calcMargin = (cost?: number, price?: number) => {
  if (typeof cost !== 'number' || typeof price !== 'number' || price <= 0 || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
};

interface InventoryListTableProps {
  items: InventoryItem[];
  onUpdateStock: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], isAllSelected: boolean) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  OK: { bg: 'bg-warm-success/10', text: 'text-warm-success', border: 'border-warm-success/20' },
  LOW: { bg: 'bg-warm-warning/10', text: 'text-warm-warning', border: 'border-warm-warning/20' },
  OUT: { bg: 'bg-warm-danger/10', text: 'text-warm-danger', border: 'border-warm-danger/20' },
};

export function InventoryListTable({
  items,
  onUpdateStock,
  onViewHistory,
  onEditProduct,
  onDelete,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: InventoryListTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="w-full overflow-hidden rounded-xl border border-warm-border-warm bg-warm-surface">
      <div ref={parentRef} className="overflow-auto" style={{ height: 'calc(100vh - 350px)' }}>
        <table className="w-full border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-warm-border-warm/50 border-b border-warm-border-warm">
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(items.map(item => item.id), e.target.checked)}
                  className="rounded border-warm-border-warm text-warm-accent focus:ring-warm-accent w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                SKU
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Cost
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                MRP
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Margin
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Last Purchased
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-warm-muted uppercase tracking-[0.12em]">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm text-warm-dim">
                  No inventory items found. Add products to start tracking stock levels.
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={12} style={{ height: `${paddingTop}px`, padding: 0 }} />
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
                      onToggleOpen={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      onClick={() => onUpdateStock(item)}
                      onViewHistory={() => onViewHistory?.(item)}
                      onEditProduct={() => onEditProduct?.(item)}
                      onDelete={() => onDelete?.(item)}
                      onToggleSelect={() => onToggleSelect(item.id)}
                    />
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={12} style={{ height: `${paddingBottom}px`, padding: 0 }} />
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

function InventoryListTableRow({
  item,
  virtualRowSize,
  isSelected,
  isOpen,
  onToggleOpen,
  onClick,
  onViewHistory,
  onEditProduct,
  onDelete,
  onToggleSelect,
}: {
  item: InventoryItem;
  virtualRowSize: number;
  isSelected: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClick: () => void;
  onViewHistory: () => void;
  onEditProduct: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}) {
  const margin = calcMargin(item.cost, item.price);

  return (
    <tr
      className={clsx(
        'border-b border-warm-border-warm/50 hover:bg-warm-surface-hover transition-colors',
        isSelected && 'bg-warm-accent/10'
      )}
      style={{ height: `${virtualRowSize}px` }}
    >
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-warm-border-warm text-warm-accent focus:ring-warm-accent w-4 h-4 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-warm-accent/20 to-warm-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Package size={18} className="text-warm-dim" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-warm-fg">{item.name}</div>
            {item.barcode && (
              <div className="text-xs text-warm-dim font-mono">{item.barcode}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-warm-muted cursor-pointer" onClick={onClick}>
        {item.category_name || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-warm-dim font-mono cursor-pointer" onClick={onClick}>
        {item.sku || '—'}
      </td>
      <td className="px-4 py-3 text-center cursor-pointer" onClick={onClick}>
        <span
          className={clsx(
            'text-sm font-bold font-mono tabular-nums',
            item.current_qty <= 5 ? 'text-warm-danger' : item.current_qty <= 25 ? 'text-warm-warning' : 'text-warm-fg'
          )}
        >
          {fmt(item.current_qty)}
        </span>
      </td>
      <td className="px-4 py-3 cursor-pointer" onClick={onClick}>
        <span
          className={clsx(
            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
            STATUS_STYLES[item.reorder_status]?.bg,
            STATUS_STYLES[item.reorder_status]?.text,
            STATUS_STYLES[item.reorder_status]?.border,
          )}
        >
          {item.reorder_status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right text-warm-dim font-mono cursor-pointer" onClick={onClick}>
        {item.cost ? `৳${fmt(item.cost)}` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-warm-fg font-mono cursor-pointer" onClick={onClick}>
        {item.price ? `৳${fmt(item.price)}` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-right text-warm-dim font-mono cursor-pointer" onClick={onClick}>
        {item.mrp ? `৳${fmt(item.mrp)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right cursor-pointer" onClick={onClick}>
        <span
          className={clsx(
            'text-sm font-bold font-mono',
            margin === null ? 'text-warm-dim' : margin >= 20 ? 'text-warm-success' : margin >= 10 ? 'text-warm-warning' : 'text-warm-danger'
          )}
        >
          {margin !== null ? `${margin}%` : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-warm-muted font-mono cursor-pointer" onClick={onClick}>
        {item.last_purchased_date ? new Date(item.last_purchased_date).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleOpen();
            }}
            className="p-1.5 rounded-lg hover:bg-warm-surface-hover transition-colors text-warm-dim hover:text-warm-fg"
          >
            <MoreVertical size={16} />
          </button>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleOpen} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-warm-surface border border-warm-border-warm rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { onToggleOpen(); onViewHistory(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-fg hover:bg-warm-surface-hover transition-colors"
                >
                  <History size={14} /> History
                </button>
                <button
                  onClick={() => { onToggleOpen(); onEditProduct(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-fg hover:bg-warm-surface-hover transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => { onToggleOpen(); onDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-danger hover:bg-warm-danger/10 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}