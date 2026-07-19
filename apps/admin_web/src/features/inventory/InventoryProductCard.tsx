import type { InventoryItem } from '@/types/inventory';
import React, { useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { Pencil, Package } from 'lucide-react';
import { EditableCell } from '../../components/ui/EditableCell';
import { CategoryPicker } from '@/components/inventory/CategoryPicker';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface InventoryProductCardProps {
  item: InventoryItem;
  isHighlighted?: boolean;
  onUpdateStock: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  priority?: boolean;
  isEditMode?: boolean;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  storeId?: string;
  tenantId?: string;
}

const formatMRP = (num?: number): string => {
  if (!num) return '';
  return `৳${num.toLocaleString()}`;
};

export const InventoryProductCard = React.memo(function InventoryProductCard({
  item,
  isHighlighted,
  onUpdateStock,
  onEditProduct,
  isSelected,
  onToggleSelect,
  priority,
  isEditMode = false,
  onInlineSave,
  storeId,
}: InventoryProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<keyof InventoryItem | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const margin = item.cost && item.price ? Math.round(((item.price - item.cost) / item.cost) * 100) : null;
  const profitMarginVal = item.cost && item.price ? (item.price - item.cost) : null;
  const hasMrp = typeof item.mrp === 'number' && item.mrp > 0;
  const priceError = hasMrp && (item.price || 0) > (item.mrp || 0);
  const lowMargin = margin !== null && margin < 10;

  const showEditFeatures = isEditMode || isEditing || editingField !== null;

  const handleStartEdit = useCallback((field: keyof InventoryItem) => {
    setEditingField(field);
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(async (field: keyof InventoryItem, value: string | number) => {
    if (onInlineSave) {
      await onInlineSave(item.id, field, value);
    }
    setEditingField(null);
    setIsEditing(false);
  }, [item.id, onInlineSave]);

  const handleCancel = useCallback(() => {
    setEditingField(null);
    setIsEditing(false);
  }, []);

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full rounded-lg border bg-warm-surface border-warm transition-all duration-200",
        "hover:shadow-md hover:border-warm-accent/50",
        isHighlighted && "ring-2 ring-warm-success",
        showEditFeatures && "ring-2 ring-warm-accent/50",
        isEditing && "ring-2 ring-warm-accent"
      )}
      onClick={() => !isEditing && onUpdateStock(item)}
    >
      {/* Image Section - Fixed aspect, flex-shrink-0 */}
      <div className="relative w-full h-44 flex-shrink-0 overflow-hidden rounded-t-lg">
        {/* Checkbox - compact */}
        {onToggleSelect && (
          <div className="absolute top-1.5 left-1.5 z-10" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              aria-label={`Select ${item.name}`}
              className="w-4 h-4 rounded border-warm-border-warm text-warm-accent focus:ring-warm-accent cursor-pointer"
            />
          </div>
        )}

        {/* Edit Button */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEditProduct) {
                // Open full edit drawer
                onEditProduct(item);
              } else {
                // Fallback: inline edit mode
                setIsEditing(true);
              }
            }}
            className="absolute top-1.5 right-1.5 z-10 p-1 rounded bg-warm-accent text-black opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit product"
          >
            <Pencil size={12} />
          </button>
        )}

        {/* Status Badge - bottom right */}
        <div className="absolute bottom-1.5 right-1.5 z-10">
          <span
            className={cn(
              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border",
              item.reorder_status === 'OUT' && "bg-warm-danger/10 text-warm-danger border-warm-danger/20",
              item.reorder_status === 'LOW' && "bg-warm-warning/10 text-warm-warning border-warm-warning/20",
              item.reorder_status === 'OK' && "bg-warm-success/10 text-warm-success border-warm-success/20"
            )}
          >
            {item.reorder_status}
          </span>
        </div>

        {/* Image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain p-2 bg-white group-hover:scale-105 transition-transform duration-300"
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-warm-bg">
            <Package className="w-8 h-8 text-warm-muted/50" />
          </div>
        )}
      </div>

      {/* Content - Compact, flex-1 to fill remaining space */}
      <div className="flex flex-col flex-1 min-h-0 p-2.5">
        {/* Name */}
        <h3
          className={cn(
            "text-[11px] font-medium text-warm-fg leading-tight line-clamp-2 mb-1.5 flex-shrink-0",
            isEditing && "hover:bg-warm-accent/10 rounded cursor-pointer"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (isEditing) handleStartEdit('name');
          }}
        >
          {editingField === 'name' ? (
            <EditableCell
              value={item.name}
              type="text"
              onSave={(val) => handleSave('name', val)}
              onCancel={handleCancel}
              inputClassName="text-[11px] w-full"
              autoFocus
            />
          ) : (
            item.name
          )}
        </h3>

        {/* Stock Quantity */}
        <div className="flex items-center justify-between text-[10px] mb-2 flex-shrink-0">
          <span className="text-warm-muted font-medium">Stock:</span>
          {editingField === 'current_qty' ? (
            <EditableCell
              value={item.current_qty}
              type="number"
              onSave={(val) => handleSave('current_qty', val)}
              onCancel={handleCancel}
              validate={(v) => Number(v) >= 0 ? null : 'Invalid'}
              inputClassName="w-16 text-[10px]"
              autoFocus
            />
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (isEditing) handleStartEdit('current_qty');
              }}
              className={cn(
                "font-bold tabular-nums px-2 py-0.5 rounded border text-[10px]",
                item.current_qty <= 5
                  ? "bg-warm-danger/10 text-warm-danger border-warm-danger/20"
                  : "bg-warm-success/10 text-warm-success border-warm-success/20",
                isEditing && "hover:bg-warm-accent/20 cursor-pointer"
              )}
            >
              {item.current_qty} pcs
            </span>
          )}
        </div>

        {/* Cost & Selling Price Grid */}
        <div className="grid grid-cols-2 gap-2 text-[10px] mb-2 flex-shrink-0">
          {/* Cost Price */}
          <div className="flex flex-col gap-0.5">
            <span className="text-warm-muted">Cost</span>
            <div className="flex items-center">
              <span className="text-warm-dim mr-0.5">৳</span>
              {editingField === 'cost' ? (
                <EditableCell
                  value={item.cost || 0}
                  type="currency"
                  onSave={(val) => handleSave('cost', val)}
                  onCancel={handleCancel}
                  inputClassName="w-14 text-[10px]"
                  autoFocus
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditing) handleStartEdit('cost');
                  }}
                  className={cn(
                    "font-semibold tabular-nums text-warm-fg",
                    isEditing && "hover:bg-warm-accent/10 rounded cursor-pointer px-1 -mx-1"
                  )}
                >
                  {item.cost?.toLocaleString() || '—'}
                </span>
              )}
            </div>
          </div>

          {/* Selling Price */}
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-warm-muted">Price</span>
            <div className="flex items-center justify-end">
              <span className="text-warm-dim mr-0.5">৳</span>
              {editingField === 'price' ? (
                <EditableCell
                  value={item.price || 0}
                  type="currency"
                  onSave={(val) => handleSave('price', val)}
                  onCancel={handleCancel}
                  inputClassName="w-14 text-[10px]"
                  autoFocus
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditing) handleStartEdit('price');
                  }}
                  className={cn(
                    "font-bold tabular-nums text-warm-fg",
                    isEditing && "hover:bg-warm-accent/10 rounded cursor-pointer px-1 -mx-1"
                  )}
                >
                  {item.price?.toLocaleString() || '—'}
                </span>
              )}
            </div>
            {hasMrp && item.mrp! > (item.price || 0) && (
              <span className="text-warm-dim line-through text-[8px] block mt-0.5">
                MRP {formatMRP(item.mrp)}
              </span>
            )}
          </div>
        </div>

        {/* Profit Margin Row */}
        <div className="flex items-center justify-between text-[10px] mb-2 flex-shrink-0">
          <span className="text-warm-muted">Margin:</span>
          {margin !== null && profitMarginVal !== null ? (
            <span
              className={cn(
                "font-semibold tabular-nums",
                margin >= 20 ? "text-warm-success" : margin >= 10 ? "text-warm-warning" : "text-warm-danger"
              )}
            >
              {margin}% (৳{profitMarginVal.toLocaleString()})
            </span>
          ) : (
            <span className="text-warm-dim">—</span>
          )}
        </div>

        {/* Last Purchased Date */}
        <div className="flex items-center justify-between text-[9px] text-warm-muted mb-2 flex-shrink-0">
          <span>Last Purchase:</span>
          <span className="font-medium text-warm-fg">
            {item.last_purchased_date
              ? new Date(item.last_purchased_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
        </div>

        {/* Health Badges - Compact */}
        {(priceError || lowMargin || !hasMrp) && (
          <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
            {priceError && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-warm-danger/10 text-warm-danger border border-warm-danger/25">
                {'>'}MRP
              </span>
            )}
            {lowMargin && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-warm-warning/10 text-warm-warning border border-warm-warning/25">
                Low Marg
              </span>
            )}
            {!hasMrp && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-warm-bg text-warm-muted border border-warm-border-warm">
                No MRP
              </span>
            )}
          </div>
        )}

        {/* Category Row - inline editing */}
        {(isEditMode || isEditing) && (
          <div className="flex items-center justify-between text-[10px] mb-2 flex-shrink-0">
            <span className="text-warm-muted">Category:</span>
            <CategoryPicker
              value={item.category_id}
              categories={categories || []}
              onChange={(categoryId) => {
                onInlineSave?.(item.id, 'category_id', categoryId ?? '');
              }}
              loading={categoriesLoading}
              size="sm"
              className="min-w-[100px]"
            />
          </div>
        )}

        {/* SKU Row - mt-auto */}
        <div className="flex items-center justify-between text-[9px] text-warm-muted mt-auto pt-1.5 border-t border-warm flex-shrink-0">
          <span>SKU:</span>
          <span className="font-mono truncate max-w-[120px]" title={item.sku}>
            {item.sku || '—'}
          </span>
        </div>
      </div>
    </div>
  );
});

// Utility for cleaner class merging
function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
