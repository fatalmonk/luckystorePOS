import type { InventoryItem } from '../types/inventory';
import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/format';
import { EditableCell } from '../../components/ui/EditableCell';
import { Pencil } from 'lucide-react';
import { ImageUploadZone } from '../../components/inventory/ImageUploadZone';
import { useImageUpload, useRemoveImage } from '../../hooks/useImageUpload';

interface InventoryProductCardProps {
  item: InventoryItem;
  isHighlighted?: boolean;
  onUpdateStock: (item: InventoryItem) => void;
  tenantId?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  priority?: boolean;
  isEditMode?: boolean;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  storeId?: string;
}

const formatPrice = (num?: number): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(2)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(2)}L`;
  }
  return formatCurrency(num);
};

const formatMRP = (num?: number): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(0)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(0)}L`;
  }
  return formatCurrency(Math.round(num));
};

const formatSelling = (num?: number): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(0)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(0)}L`;
  }
  return formatCurrency(Math.round(num));
};

// Calculate margin percentage
const calcMargin = (cost?: number, price?: number): number | null => {
  if (!cost || cost <= 0 || !price) return null;
  return Math.round(((price - cost) / cost) * 100);
};

const PackageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

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
  const margin = calcMargin(item.cost, item.price);
  const hasMrp = typeof item.mrp === 'number' && item.mrp > 0;
  const priceError = hasMrp && (item.price || 0) > (item.mrp || 0);
  const lowMargin = margin !== null && margin < 10;

  const marginColor = margin === null ? 'text-text-muted' : margin >= 20 ? 'text-success' : margin >= 10 ? 'text-warning' : 'text-danger';
  const showEditFeatures = isEditMode || isEditing || editingField !== null;

  const imageUpload = useImageUpload();
  const removeImage = useRemoveImage();

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

  const handleImageUpload = async (file: File) => {
    if (!storeId) return;
    await imageUpload.mutateAsync({ file, itemId: item.id, storeId });
  };

  const handleImageRemove = async () => {
    if (!storeId) return;
    await removeImage.mutateAsync({ itemId: item.id, storeId });
  };

  const validatePrice = (val: number) => {
    if (item.mrp && val > item.mrp) return 'Price exceeds MRP';
    if (val < 0) return 'Price cannot be negative';
    return null;
  };

  const validateStock = (val: number) => {
    if (val < 0) return 'Stock cannot be negative';
    if (!Number.isInteger(val)) return 'Stock must be a whole number';
    return null;
  };

  return (
    <div
      className={clsx(
        "overflow-hidden group cursor-pointer transition-all duration-300 border rounded-xl bg-warm-surface shadow-level-1 border-warm",
        isHighlighted && "ring-2 ring-emerald-500 ring-offset-2",
        showEditFeatures && "ring-2 ring-primary/50",
        isEditing && "ring-2 ring-primary"
      )}
      onClick={() => !isEditing && onUpdateStock(item)}
    >
      {/* Image / Status - Optimized spacing */}
      <div className="relative w-full aspect-[4/3] bg-background-subtle">
        {/* Selection Checkbox - tighter padding */}
        {onToggleSelect && (
          <div 
            className="absolute top-1.5 left-1.5 z-10 bg-white/80 rounded-sm backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary cursor-pointer drop-shadow-md bg-white m-0.5 block"
            />
          </div>
        )}

        {/* Hover Edit Button */}
        {!isEditing && (
          <div
            className={clsx(
              "absolute top-1.5 right-1.5 z-20 transition-opacity duration-200",
              showEditFeatures ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1.5 rounded-md bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
              title="Quick Edit"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}

        {/* Image Upload Zone */}
        <div className="absolute inset-0">
          {item.image_url ? (
            <div className="relative h-full w-full">
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
              />
              {/* Image Upload Zone Overlay - For changing image */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageUploadZone
                  currentImageUrl={item.image_url}
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                  size="lg"
                  showOnHover={!isEditing}
                  className="h-full w-full rounded-none"
                />
              </div>
            </div>
          ) : (
            <ImageUploadZone
              onUpload={handleImageUpload}
              size="lg"
              showOnHover={false}
              className="h-full w-full rounded-none border-0 border-dashed"
            />
          )}
        </div>

        {/* Status Badge - tighter positioning */}
        <div className="absolute bottom-1.5 right-1.5 z-10">
          <span
            className="text-[10px] px-1.5 py-0.5 font-bold uppercase rounded-full"
            style={{
              backgroundColor: item.reorder_status === 'OUT' 
                ? 'var(--color-danger-subtle)' 
                : item.reorder_status === 'LOW'
                  ? 'var(--color-warning-subtle)'
                  : 'var(--color-success-subtle)',
              color: item.reorder_status === 'OUT'
                ? 'var(--color-danger-default)'
                : item.reorder_status === 'LOW'
                  ? 'var(--color-warning-default)'
                  : 'var(--color-success-default)',
            }}
          >
            {item.reorder_status}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {/* Name - Editable with 2-line clamp */}
        <div className="min-h-[2.5rem]">
          {editingField === 'name' ? (
            <EditableCell
              value={item.name}
              type="text"
              onSave={(val) => handleSave('name', val)}
              onCancel={handleCancel}
              inputClassName="w-full text-sm font-semibold"
            />
          ) : (
            <h4
              className={clsx(
                "text-sm font-semibold text-text-primary line-clamp-2 leading-tight",
                isEditing && "hover:bg-surface-hover rounded cursor-pointer px-1 -mx-1 py-0.5 -my-0.5"
              )}
              title={item.name}
              onClick={(e) => {
                e.stopPropagation();
                isEditing && handleStartEdit('name');
              }}
            >
              {item.name}
            </h4>
          )}
        </div>

        {/* Compact metrics row - FIXED: better contrast */}
        <div className="flex items-center justify-between text-xs text-warm-fg border-t border-warm pt-2 mt-1">
          <div className="flex items-center gap-3">
            <span className="font-medium">
              Stock: <span className={item.current_qty <= 5 ? 'text-danger font-semibold' : 'text-warm-fg'}>{item.current_qty}</span>
            </span>
            <span className="font-medium">
              Price: <span className="text-warm-fg">{formatSelling(item.price)}</span>
            </span>
          </div>
          <span className="font-mono text-[10px] text-warm-muted truncate max-w-[80px]" title={item.sku || undefined}>
            {item.sku || '—'}
          </span>
        </div>

        {/* Edit mode: expandable details */}
        {isEditing ? (
          <div className="pt-3 border-t border-warm mt-2 flex flex-col gap-2">
            {/* Stock - Editable */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Stock</span>
              {editingField === 'current_qty' ? (
                <EditableCell
                  value={item.current_qty}
                  type="number"
                  onSave={(val) => handleSave('current_qty', val)}
                  onCancel={handleCancel}
                  validate={validateStock}
                  min={0}
                  step={1}
                />
              ) : (
                <span
                  className="text-sm font-bold font-mono tabular-nums cursor-pointer hover:bg-surface-hover rounded px-2 py-0.5 -mx-2 -my-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit('current_qty');
                  }}
                >
                  {item.current_qty.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Price - Editable */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Price</span>
              {editingField === 'price' ? (
                <EditableCell
                  value={item.price || 0}
                  type="currency"
                  onSave={(val) => handleSave('price', val)}
                  onCancel={handleCancel}
                  validate={validatePrice}
                  min={0}
                  step={0.01}
                />
              ) : (
                <span
                  className="text-sm font-bold text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-0.5 -mx-2 -my-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit('price');
                  }}
                >
                  {formatSelling(item.price)}
                </span>
              )}
            </div>

            {/* Cost - Editable */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Cost</span>
              {editingField === 'cost' ? (
                <EditableCell
                  value={item.cost || 0}
                  type="currency"
                  onSave={(val) => handleSave('cost', val)}
                  onCancel={handleCancel}
                  min={0}
                  step={0.01}
                />
              ) : (
                <span
                  className="text-xs text-text-secondary tabular-nums font-mono cursor-pointer hover:bg-surface-hover rounded px-2 py-0.5 -mx-2 -my-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit('cost');
                  }}
                >
                  {formatPrice(item.cost)}
                </span>
              )}
            </div>

            {/* MRP - Editable */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">MRP</span>
              {editingField === 'mrp' ? (
                <EditableCell
                  value={item.mrp || 0}
                  type="currency"
                  onSave={(val) => handleSave('mrp', val)}
                  onCancel={handleCancel}
                  min={0}
                  step={0.01}
                />
              ) : (
                <span
                  className="text-xs text-text-secondary tabular-nums font-mono cursor-pointer hover:bg-surface-hover rounded px-2 py-0.5 -mx-2 -my-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit('mrp');
                  }}
                >
                  {formatMRP(item.mrp)}
                </span>
              )}
            </div>

            {/* SKU - Editable */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">SKU</span>
              {editingField === 'sku' ? (
                <EditableCell
                  value={item.sku || ''}
                  type="text"
                  onSave={(val) => handleSave('sku', val)}
                  onCancel={handleCancel}
                  placeholder="Enter SKU"
                />
              ) : (
                <span
                  className="text-xs text-text-tertiary font-mono cursor-pointer hover:bg-surface-hover rounded px-2 py-0.5 -mx-2 -my-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit('sku');
                  }}
                >
                  {item.sku || '—'}
                </span>
              )}
            </div>

            {/* Margin display */}
            <div className="flex justify-between items-center pt-2 border-t border-warm">
              <span className="text-xs text-text-muted">Margin</span>
              <div className={clsx("text-xs font-bold font-mono", marginColor)}>
                {margin !== null ? `${margin}%` : '—'}
              </div>
            </div>
          </div>
        ) : null}

        {/* Health Badges */}
        {(priceError || lowMargin || !hasMrp) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {priceError && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-medium">
                <span className="w-1 h-1 rounded-full bg-rose-500" />
                Invalid Price
              </span>
            )}
            {lowMargin && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                Low Margin
              </span>
            )}
            {!hasMrp && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                No MRP
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
