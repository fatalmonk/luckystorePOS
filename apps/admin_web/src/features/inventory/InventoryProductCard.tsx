import type { InventoryItem } from '../types/inventory';
import React, { useState, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { Pencil, Package } from 'lucide-react';
import { EditableCell } from '../../components/ui/EditableCell';
import { formatCurrency } from '../../lib/format';

interface InventoryProductCardProps {
  item: InventoryItem;
  isHighlighted?: boolean;
  onUpdateStock: (item: InventoryItem) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  priority?: boolean;
  isEditMode?: boolean;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  storeId?: string;
}

const formatMRP = (num?: number): string => {
  if (!num) return '';
  return `৳${num.toLocaleString()}`;
};

export const InventoryProductCard = React.memo(function InventoryProductCard({
  item,
  isHighlighted,
  onUpdateStock,
  isSelected,
  onToggleSelect,
  priority,
  isEditMode = false,
  onInlineSave,
  storeId,
}: InventoryProductCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<keyof InventoryItem | null>(null);

  const margin = item.cost && item.price ? Math.round(((item.price - item.cost) / item.cost) * 100) : null;
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
        isHighlighted && "ring-2 ring-emerald-500",
        showEditFeatures && "ring-2 ring-primary/50",
        isEditing && "ring-2 ring-primary"
      )}
      onClick={() => !isEditing && onUpdateStock(item)}
    >
      {/* Image Section - Fixed aspect, flex-shrink-0 */}
      <div className="relative w-full aspect-square flex-shrink-0 overflow-hidden rounded-t-lg">
        {/* Checkbox - compact */}
        {onToggleSelect && (
          <div className="absolute top-1.5 left-1.5 z-10" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        )}

        {/* Edit Button */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="absolute top-1.5 right-1.5 z-10 p-1 rounded bg-primary/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
        )}

        {/* Status Badge - bottom right */}
        <div className="absolute bottom-1.5 right-1.5 z-10">
          <span
            className={cn(
              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
              item.reorder_status === 'OUT' && "bg-red-100 text-red-700",
              item.reorder_status === 'LOW' && "bg-amber-100 text-amber-700",
              item.reorder_status === 'OK' && "bg-emerald-100 text-emerald-700"
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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
            isEditing && handleStartEdit('name');
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

        {/* Stock & Price Row - Inline */}
        <div className="flex items-center gap-2 text-[10px] flex-shrink-0 mb-1.5">
          {/* Stock with inline edit */}
          <div className="flex items-center">
            <span className="text-warm-muted mr-1">S:</span>
            {editingField === 'current_qty' ? (
              <EditableCell
                value={item.current_qty}
                type="number"
                onSave={(val) => handleSave('current_qty', val)}
                onCancel={handleCancel}
                validate={(v) => v >= 0 ? null : 'Invalid'}
                inputClassName="w-12 text-[10px]"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  item.current_qty <= 5 ? "text-red-600" : "text-warm-fg",
                  isEditing && "hover:bg-warm-accent/10 rounded cursor-pointer px-1 -mx-1"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  isEditing && handleStartEdit('current_qty');
                }}
              >
                {item.current_qty}
              </span>
            )}
          </div>

          {/* Price with inline edit */}
          <div className="flex items-center flex-1 min-w-0">
            <span className="text-warm-muted mr-0.5">৳</span>
            {editingField === 'price' ? (
              <EditableCell
                value={item.price || 0}
                type="currency"
                onSave={(val) => handleSave('price', val)}
                onCancel={handleCancel}
                inputClassName="w-16 text-[10px]"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  "font-semibold tabular-nums text-warm-accent truncate",
                  isEditing && "hover:bg-warm-accent/10 rounded cursor-pointer px-1 -mx-1"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  isEditing && handleStartEdit('price');
                }}
              >
                {item.price?.toLocaleString() || '—'}
              </span>
            )}
            {hasMrp && item.mrp! > (item.price || 0) && (
              <span className="text-warm-muted line-through ml-1 text-[9px] hidden sm:inline">
                {formatMRP(item.mrp)}
              </span>
            )}
          </div>
        </div>

        {/* SKU & Margin - Last row */}
        <div className="flex items-center justify-between text-[9px] text-warm-muted mt-auto flex-shrink-0">
          <span className="font-mono truncate max-w-[60px]" title={item.sku}>
            {item.sku || '—'}
          </span>
          {margin !== null && (
            <span className={cn(
              "font-medium",
              margin >= 20 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-red-600"
            )}>
              {margin}%
            </span>
          )}
        </div>

        {/* Health Badges - Compact */}
        {(priceError || lowMargin || !hasMrp) && (
          <div className="flex flex-wrap gap-1 mt-1.5 flex-shrink-0">
            {priceError && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-red-100 text-red-700">
                {'>'}MRP
              </span>
            )}
            {lowMargin && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                Low Marg
              </span>
            )}
            {!hasMrp && (
              <span className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-500">
                No MRP
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Utility for cleaner class merging
function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
