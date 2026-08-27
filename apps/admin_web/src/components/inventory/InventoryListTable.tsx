import type { InventoryItem } from '../../types/inventory';
import React from 'react';
import { InventoryCardFeed } from './InventoryCardFeed';

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
  onUpdateStock,
  onViewHistory,
  onEditProduct,
  onDelete,
  selectedIds,
  onToggleSelect,
  scrollElement,
  toolbarHeight,
}: InventoryListTableProps) {
  return (
    <div className="w-full py-3">
      {items.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-text-muted bg-surface rounded-lg border border-border m-3">
          No inventory items found. Add products to start tracking stock levels.
        </div>
      ) : (
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
      )}
    </div>
  );
}
