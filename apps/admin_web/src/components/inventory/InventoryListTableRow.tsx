import type { InventoryItem } from '../../types/inventory';
import React, { useLayoutEffect, useState, useRef, useCallback } from 'react';
import { MoreVertical, History, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { EditableCell } from '@/components';
import { ImageUploadZone } from '@/components';
import { SmartPricingEditor } from './SmartPricingEditor';
import { CategoryPicker } from '@/components';
import { useImageUpload } from '@/hooks';
import { useMagneticHover } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { api } from '../../lib/api';
import { calcMarginRounded } from '@/lib/format';

const getMarginColor = (margin: number | null): string => {
  if (margin === null) return 'text-text-muted';
  if (margin >= 30) return 'text-success';
  if (margin >= 15) return 'text-warning';
  return 'text-danger';
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  OK: { bg: 'bg-success-subtle', text: 'text-success', border: 'border-success/20' },
  LOW: { bg: 'bg-warning-subtle', text: 'text-warning', border: 'border-warning/20' },
  OUT: { bg: 'bg-danger-subtle', text: 'text-danger', border: 'border-danger/20' },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

interface InventoryListTableRowProps {
  item: InventoryItem;
  virtualRowSize: number;
  isSelected: boolean;
  isOpen: boolean;
  editingCell: { rowId: string; field: string } | null;
  setEditingCell: (cell: { rowId: string; field: string } | null) => void;
  onToggleOpen: () => void;
  onClick: () => void;
  onViewHistory: () => void;
  onEditProduct: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  onTabNavigation?: (rowId: string, field: string, direction: 'forward' | 'backward') => void;
  storeId?: string;
}

function InventoryListTableRowComponent({
  item,
  virtualRowSize,
  isSelected,
  isOpen,
  editingCell,
  setEditingCell,
  onToggleOpen,
  onClick,
  onViewHistory,
  onEditProduct,
  onDelete,
  onToggleSelect,
  onInlineSave,
  storeId,
}: InventoryListTableRowProps) {
  const { mutateAsync: uploadImage } = useImageUpload();
  const [showSmartPricing, setShowSmartPricing] = useState(false);

  // Fetch categories for inline editing
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const margin = calcMarginRounded(item.cost, item.price);
  const profitMarginVal = (typeof item.cost === 'number' && typeof item.price === 'number' && item.price > 0 && item.cost > 0) ? (item.price - item.cost) : null;

  const isEditing = (field: string) =>
    editingCell?.rowId === item.id && editingCell?.field === field;

  // Reset smart pricing when row changes
  useLayoutEffect(() => {
    if (!editingCell || editingCell.rowId !== item.id) {
      setTimeout(() => setShowSmartPricing(false), 0);
    }
  }, [editingCell, item.id]);

  const handleImageUpload = async (file: File) => {
    if (!storeId) return;
    await uploadImage({
      file,
      itemId: item.id,
      storeId,
      sku: item.sku,
      barcode: item.barcode,
      oldImageUrl: item.image_url,
    });
  };

  const startEditing = (field: string) => {
    setEditingCell({ rowId: item.id, field });
  };

  const handleSave = async (field: keyof InventoryItem, value: string | number) => {
    if (!onInlineSave) {
      console.warn('onInlineSave not provided');
      setEditingCell(null);
      return;
    }
    await onInlineSave(item.id, field, value);
    setEditingCell(null);
  };

  // Price validation
  const validatePrice = (val: number) => {
    if (item.mrp && val > item.mrp) return 'Price cannot exceed MRP';
    if (val < 0) return 'Price cannot be negative';
    return null;
  };

  // Stock validation
  const validateStock = (val: number) => {
    if (val < 0) return 'Stock cannot be negative';
    if (!Number.isInteger(val)) return 'Stock must be a whole number';
    return null;
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startEditing(field);
    }
  };

  const rowRef = useRef<HTMLTableRowElement>(null);
  const actionBtnRef = useMagneticHover<HTMLButtonElement>({ strength: 20 });
  const smartPricingBtnRef = useMagneticHover<HTMLButtonElement>({ strength: 10 });
  const hasAnimatedRef = useRef(false);

  useGSAP(() => {
    if (rowRef.current && !hasAnimatedRef.current) {
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        gsap.fromTo(
          rowRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' }
        );
      }
      hasAnimatedRef.current = true;
    }
  }, []);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onToggleOpen();
      actionBtnRef.current?.focus();
    }
  }, [onToggleOpen, actionBtnRef]);

  return (
    <tr
      ref={rowRef}
      className={clsx(
        'relative transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] group',
        isSelected && 'bg-primary/10 hover:bg-primary/15 [&>td]:!bg-transparent'
      )}
      style={{ height: `${virtualRowSize}px` }}
    >
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select ${item.name}`}
          className="rounded border-border-default text-primary focus:ring-primary w-4 h-4 cursor-pointer"
        />
      </td>

      {/* Product Name + Image */}
      <td className="px-4 py-3 group/row w-full max-w-[400px]">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-md bg-surface-subtle flex items-center justify-center overflow-hidden flex-shrink-0">
            <ImageUploadZone
              currentImageUrl={item.image_url}
              onUpload={handleImageUpload}
              size="sm"
              showOnHover={true}
              className="w-full h-full rounded-none"
            />
          </div>
          <div className="flex-1 min-w-0">
            {isEditing('name') ? (
              <EditableCell
                value={item.name}
                type="text"
                onSave={(val) => handleSave('name', val)}
                onCancel={() => setEditingCell(null)}
                inputClassName="w-[200px]"
              />
            ) : (
              <div
                tabIndex={0}
                role="button"
                aria-label={`Edit product name: ${item.name}`}
                className="text-sm font-medium text-text-primary truncate cursor-pointer rounded focus:outline-none focus:ring-1 focus:ring-primary"
                title="Click or press Enter to edit"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing('name');
                }}
                onKeyDown={(e) => handleCellKeyDown(e, 'name')}
              >
                {item.name}
              </div>
            )}
            {item.sku && (
              <div className="text-[11px] text-text-muted font-mono">{item.sku}</div>
            )}
            <div className="mt-1">
              {isEditing('category_id') ? (
                <CategoryPicker
                  value={item.category_id}
                  categories={categories || []}
                  loading={categoriesLoading}
                  onChange={(categoryId) => handleSave('category_id', categoryId || '')}
                  size="sm"
                  className="w-full"
                />
              ) : (
                <div
                  tabIndex={0}
                  role="button"
                  aria-label="Change product category"
                  className="text-[11px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors rounded focus:outline-none focus:ring-1 focus:ring-primary inline-block"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing('category_id');
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e, 'category_id')}
                  title="Click or press Enter to change category"
                >
                  {categories?.find((c) => c.id === item.category_id)?.name ?? '—'}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Avail / Rsvd - Domain Driven */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          {isEditing('current_qty') ? (
            <EditableCell
              value={item.current_qty}
              type="number"
              onSave={(val) => handleSave('current_qty', val)}
              onCancel={() => setEditingCell(null)}
              validate={validateStock}
              min={0}
              step={1}
            />
          ) : (
            <div 
              tabIndex={0}
              role="button"
              aria-label={`Adjust stock: ${item.available_qty ?? item.current_qty} available, ${item.reserved_qty ?? 0} reserved`}
              className="flex items-center gap-2 bg-surface-raised rounded-full p-1 cursor-pointer hover:bg-background-subtle transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => {
                e.stopPropagation();
                startEditing('current_qty');
              }}
              onKeyDown={(e) => handleCellKeyDown(e, 'current_qty')}
              title="Click or press Enter to adjust total stock"
            >
              <div className="flex items-center gap-1.5 pl-2 pr-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(30,92,58,0.5)] dark:shadow-[0_0_8px_rgba(94,201,138,0.5)]" />
                <span className="font-mono text-xs font-bold text-text-primary">
                  {(item.available_qty ?? item.current_qty).toLocaleString('en-BD')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold">Avail</span>
              </div>
              <div className="w-px h-3 bg-border-default" />
              <div className="flex items-center gap-1.5 pr-2 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(140,66,0,0.5)] dark:shadow-[0_0_8px_rgba(245,184,78,0.5)]" />
                <span className="font-mono text-xs font-bold text-text-primary">
                  {(item.reserved_qty ?? 0).toLocaleString('en-BD')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold">Rsvd</span>
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Cost - Editable */}
      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
        {isEditing('cost') ? (
          <EditableCell
            value={item.cost || 0}
            type="currency"
            onSave={(val) => handleSave('cost', val)}
            onCancel={() => setEditingCell(null)}
            inputClassName="w-20 text-right font-mono text-sm"
          />
        ) : (
          <span
            tabIndex={0}
            role="button"
            aria-label={`Edit cost: ৳${item.cost || 0}`}
            className="text-sm text-text-primary cursor-pointer hover:bg-background-subtle rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={(e) => {
              e.stopPropagation();
              startEditing('cost');
            }}
            onKeyDown={(e) => handleCellKeyDown(e, 'cost')}
          >
            ৳{item.cost?.toLocaleString('en-BD') || '—'}
          </span>
        )}
      </td>

      {/* MRP - Editable */}
      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
        {isEditing('mrp') ? (
          <EditableCell
            value={item.mrp || 0}
            type="currency"
            onSave={(val) => handleSave('mrp', val)}
            onCancel={() => setEditingCell(null)}
            inputClassName="w-20 text-right font-mono text-sm"
          />
        ) : (
          <span
            tabIndex={0}
            role="button"
            aria-label={`Edit MRP: ৳${item.mrp || 0}`}
            className="text-sm text-text-primary cursor-pointer hover:bg-background-subtle rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={(e) => {
              e.stopPropagation();
              startEditing('mrp');
            }}
            onKeyDown={(e) => handleCellKeyDown(e, 'mrp')}
          >
            ৳{item.mrp?.toLocaleString('en-BD') || '—'}
          </span>
        )}
      </td>

      {/* Selling - Price */}
      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
        {showSmartPricing ? (
          <SmartPricingEditor
            itemId={item.id}
            cost={item.cost || 0}
            mrp={item.mrp || 0}
            currentPrice={item.price || 0}
            onSave={(price) => {
              onInlineSave?.(item.id, 'price', price);
              setShowSmartPricing(false);
            }}
            onCancel={() => setShowSmartPricing(false)}
          />
        ) : isEditing('price') ? (
          <EditableCell
            value={item.price || 0}
            type="currency"
            onSave={(val) => handleSave('price', val)}
            onCancel={() => setEditingCell(null)}
            validate={validatePrice}
            inputClassName="w-20 text-right font-mono text-sm"
          />
        ) : (
          <div className="flex items-center justify-end gap-1 group/price">
            <span
              tabIndex={0}
              role="button"
              aria-label={`Edit selling price: ৳${item.price || 0}`}
              className="text-sm font-semibold text-text-primary cursor-pointer hover:bg-background-subtle rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={(e) => {
                e.stopPropagation();
                startEditing('price');
              }}
              onKeyDown={(e) => handleCellKeyDown(e, 'price')}
            >
              ৳{item.price?.toLocaleString('en-BD') || '—'}
            </span>
            <button
              ref={smartPricingBtnRef}
              onClick={(e) => { e.stopPropagation(); setShowSmartPricing(true); }}
              className="w-11 h-11 -my-2 flex items-center justify-center rounded-full bg-transparent hover:bg-background-subtle text-text-muted hover:text-primary opacity-0 group-hover/price:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary"
              title="Smart Pricing"
              aria-label="Open Smart Pricing Editor"
            >
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-raised border border-border-default/50">
                <TrendingUp size={12} />
              </div>
            </button>
          </div>
        )}
      </td>

      {/* Margin / Profit */}
      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
        {item.cost && item.price ? (
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-text-primary">
              ৳{(item.price - item.cost).toLocaleString('en-BD')}
            </span>
            <span className={clsx('text-[11px] font-bold', getMarginColor(margin))}>
              {margin}%
            </span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <span
          tabIndex={0}
          role="button"
          aria-label={`Status: ${item.reorder_status}. Click or press Enter to update stock.`}
          className={clsx(
            'text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary inline-block',
            STATUS_STYLES[item.reorder_status]?.bg,
            STATUS_STYLES[item.reorder_status]?.text,
            STATUS_STYLES[item.reorder_status]?.border
          )}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
        >
          {item.reorder_status}
        </span>
      </td>

      {/* Last Purchase Date */}
      <td className="px-4 py-3 text-right text-xs text-text-secondary whitespace-nowrap">
        {isEditing('last_purchased_date') ? (
          <EditableCell
            value={item.last_purchased_date || ''}
            type="date"
            onSave={(val) => handleSave('last_purchased_date', val)}
            onCancel={() => setEditingCell(null)}
            inputClassName="w-28 text-xs font-mono"
          />
        ) : (
          <div
            tabIndex={0}
            role="button"
            aria-label="Edit last purchase date"
            className="cursor-pointer hover:bg-background-subtle rounded px-1.5 py-0.5 -mx-1 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={(e) => {
              e.stopPropagation();
              startEditing('last_purchased_date');
            }}
            onKeyDown={(e) => handleCellKeyDown(e, 'last_purchased_date')}
            title="Click or press Enter to edit last purchase date"
          >
            {formatDate(item.last_purchased_date || item.last_updated)}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block" onKeyDown={isOpen ? handleMenuKeyDown : undefined}>
          <button
            ref={actionBtnRef}
            onClick={onToggleOpen}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={`Actions menu for ${item.name}`}
            className="w-11 h-11 -my-2 flex items-center justify-center rounded-full bg-transparent hover:bg-background-subtle transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-raised border border-border-default/40 hover:border-border-default">
              <MoreVertical size={16} className="text-text-secondary" />
            </div>
          </button>

          {isOpen && (
            <div 
              role="menu" 
              aria-label={`Actions for ${item.name}`}
              className="absolute right-0 mt-1 w-36 rounded-md bg-surface shadow-lg border border-border-default z-20"
            >
              <button
                role="menuitem"
                onClick={() => {
                  onViewHistory();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background-subtle transition-colors text-left focus:bg-background-subtle focus:outline-none"
              >
                <History size={14} />
                History
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  onEditProduct();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background-subtle transition-colors text-left focus:bg-background-subtle focus:outline-none"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  onDelete();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-subtle transition-colors text-left focus:bg-danger-subtle focus:outline-none"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export const InventoryListTableRow = React.memo(
  InventoryListTableRowComponent,
  (prevProps, nextProps) => {
    // Check if editing state of this row changed
    const wasEditing = prevProps.editingCell?.rowId === prevProps.item.id;
    const isEditing = nextProps.editingCell?.rowId === nextProps.item.id;
    if (wasEditing !== isEditing) return false;
    if (isEditing && prevProps.editingCell?.field !== nextProps.editingCell?.field) return false;

    // Check item data changes
    if (prevProps.item !== nextProps.item) return false;
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    if (prevProps.isOpen !== nextProps.isOpen) return false;
    if (prevProps.virtualRowSize !== nextProps.virtualRowSize) return false;
    if (prevProps.storeId !== nextProps.storeId) return false;

    return true;
  }
);

