import type { InventoryItem } from '../../types/inventory';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { MoreVertical, History, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { EditableCell } from '../../components/ui/EditableCell';
import { ImageUploadZone } from '../../components/inventory/ImageUploadZone';
import { SmartPricingEditor } from './SmartPricingEditor';
import { CategoryPicker } from '../../components/inventory/CategoryPicker';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useMagneticHover } from '../../hooks/useMagneticHover';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { api } from '../../lib/api';

const calcMargin = (cost?: number, price?: number) => {
  if (typeof cost !== 'number' || typeof price !== 'number' || price <= 0 || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
};

const getMarginColor = (margin: number | null): string => {
  if (margin === null) return 'text-warm-dim';
  if (margin >= 30) return 'text-warm-success';
  if (margin >= 15) return 'text-warm-warning';
  return 'text-warm-danger';
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  OK: { bg: 'bg-warm-success/10', text: 'text-warm-success', border: 'border-warm-success/20' },
  LOW: { bg: 'bg-warm-warning/10', text: 'text-warm-warning', border: 'border-warm-warning/20' },
  OUT: { bg: 'bg-warm-danger/10', text: 'text-warm-danger', border: 'border-warm-danger/20' },
};

// TODO: Replace MOCK_COMPETITORS with real API call to fetch live competitor prices
// const MOCK_COMPETITORS: Record<string, { name: string; price: number; logo: string }[]> = {};

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
  onInlineSave: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  onTabNavigation: (rowId: string, field: string, direction: 'forward' | 'backward') => void;
  storeId?: string;
  compact?: boolean;
}

export function InventoryListTableRow({
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
  onTabNavigation,
  storeId,
}: InventoryListTableRowProps) {
  const { mutateAsync: uploadImage } = useImageUpload();
  const [showSmartPricing, setShowSmartPricing] = useState(false);

  // Fetch categories for inline editing
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const margin = calcMargin(item.cost, item.price);

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

  // Handle tab event from EditableCell
  useEffect(() => {
    const handleTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (editingCell?.rowId === item.id) {
        onTabNavigation(item.id, editingCell.field, customEvent.detail.direction);
      }
    };

    document.addEventListener('editablecell:tab', handleTab as EventListener);
    return () => document.removeEventListener('editablecell:tab', handleTab as EventListener);
  }, [editingCell, item.id, onTabNavigation]);

  const rowRef = React.useRef<HTMLTableRowElement>(null);
  const actionBtnRef = useMagneticHover<HTMLButtonElement>({ strength: 20 });
  const smartPricingBtnRef = useMagneticHover<HTMLButtonElement>({ strength: 10 });
  
  useGSAP(() => {
    if (rowRef.current) {
      gsap.fromTo(
        rowRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' }
      );
    }
  }, []);

  return (
    <tr
      ref={rowRef}
      className={clsx(
        'relative transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] group',
        isSelected && 'bg-warm-accent/10 hover:bg-warm-accent/15 [&>td]:!bg-transparent'
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
                className="text-sm font-medium text-warm-fg truncate"
                title="Click to edit"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing('name');
                }}
              >
                {item.name}
              </div>
            )}
            {item.sku && (
              <div className="text-[11px] text-warm-dim font-mono">{item.sku}</div>
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
                  className="text-[11px] text-warm-muted cursor-pointer hover:text-warm-fg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing('category_id');
                  }}
                  title="Click to change category"
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
              className="flex items-center gap-2 bg-warm-surface-hover/50 rounded-full p-1 cursor-pointer hover:bg-warm-surface-hover transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                startEditing('current_qty');
              }}
              title="Click to adjust total stock"
            >
              <div className="flex items-center gap-1.5 pl-2 pr-1">
                <div className="w-1.5 h-1.5 rounded-full bg-warm-success shadow-[0_0_8px_rgba(var(--color-warm-success),0.5)]" />
                <span className="font-mono text-xs font-bold text-warm-fg">
                  {(item.available_qty ?? item.current_qty).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-warm-dim font-bold">Avail</span>
              </div>
              <div className="w-px h-3 bg-warm-border" />
              <div className="flex items-center gap-1.5 pr-2 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-warm-warning shadow-[0_0_8px_rgba(var(--color-warm-warning),0.5)]" />
                <span className="font-mono text-xs font-bold text-warm-fg">
                  {(item.reserved_qty ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-warm-dim font-bold">Rsvd</span>
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
            className="text-sm text-warm-fg cursor-pointer hover:bg-warm-surface-hover rounded px-1"
            onClick={(e) => {
              e.stopPropagation();
              startEditing('cost');
            }}
          >
            ৳{item.cost?.toLocaleString('en-IN') || '—'}
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
            className="text-sm text-warm-fg cursor-pointer hover:bg-warm-surface-hover rounded px-1"
            onClick={(e) => {
              e.stopPropagation();
              startEditing('mrp');
            }}
          >
            ৳{item.mrp?.toLocaleString('en-IN') || '—'}
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
              onInlineSave(item.id, 'price', price);
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
              className="text-sm font-semibold text-warm-fg cursor-pointer hover:bg-warm-surface-hover rounded px-1"
              onClick={(e) => {
                e.stopPropagation();
                startEditing('price');
              }}
            >
              ৳{item.price?.toLocaleString('en-IN') || '—'}
            </span>
            <button
              ref={smartPricingBtnRef}
              onClick={(e) => { e.stopPropagation(); setShowSmartPricing(true); }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-warm-muted hover:text-warm-accent opacity-0 group-hover/price:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-110"
              title="Smart Pricing"
            >
              <TrendingUp size={12} />
            </button>
          </div>
        )}
      </td>

      {/* Margin / Profit */}
      <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
        {item.cost && item.price ? (
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-warm-fg">
              ৳{(item.price - item.cost).toLocaleString('en-IN')}
            </span>
            <span className={clsx('text-[11px] font-bold', getMarginColor(margin))}>
              {margin}%
            </span>
          </div>
        ) : (
          <span className="text-warm-dim">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center cursor-pointer" onClick={onClick}>
        <span
          className={clsx(
            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
            STATUS_STYLES[item.reorder_status]?.bg,
            STATUS_STYLES[item.reorder_status]?.text,
            STATUS_STYLES[item.reorder_status]?.border
          )}
        >
          {item.reorder_status}
        </span>
      </td>

      {/* Last Purchase Date */}
      <td className="px-4 py-3 text-right text-xs text-warm-muted whitespace-nowrap">
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
            className="cursor-pointer hover:bg-warm-surface-hover rounded px-1.5 py-0.5 -mx-1"
            onClick={(e) => {
              e.stopPropagation();
              startEditing('last_purchased_date');
            }}
            title="Click to edit last purchase date"
          >
            {item.last_purchased_date ? (
              new Date(item.last_purchased_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            ) : item.last_updated ? (
              new Date(item.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            ) : (
              <span className="text-warm-dim">—</span>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block">
          <button
            ref={actionBtnRef}
            onClick={onToggleOpen}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105"
          >
            <MoreVertical size={16} className="text-warm-muted" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-36 rounded-md bg-warm-surface shadow-lg border border-warm-border-warm z-20">
              <button
                onClick={() => {
                  onViewHistory();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-fg hover:bg-warm-surface-hover transition-colors"
              >
                <History size={14} />
                History
              </button>
              <button
                onClick={() => {
                  onEditProduct();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-fg hover:bg-warm-surface-hover transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-danger hover:bg-warm-danger/10 transition-colors"
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
