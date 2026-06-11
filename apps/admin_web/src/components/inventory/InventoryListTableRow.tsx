import type { InventoryItem } from '../../types/inventory';
import { useEffect, useState } from 'react';
import { MoreVertical, History, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { EditableCell } from '../../components/ui/EditableCell';
import { ImageUploadZone } from '../../components/inventory/ImageUploadZone';
import { SmartPricingEditor } from './SmartPricingEditor';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useNotify } from '../../components/NotificationContext';
import { formatCurrency } from '../../lib/format';

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
const MOCK_COMPETITORS: Record<string, { name: string; price: number; logo: string }[]> = {};

interface InventoryListTableRowProps {
  index: number;
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
}

export function InventoryListTableRow({
  index,
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
  const { notify } = useNotify();
  const { mutateAsync: uploadImage } = useImageUpload();
  const [showSmartPricing, setShowSmartPricing] = useState(false);

  const margin = calcMargin(item.cost, item.price);

  const isEditing = (field: string) =>
    editingCell?.rowId === item.id && editingCell?.field === field;

  // Reset smart pricing when row changes
  useEffect(() => {
    if (!editingCell || editingCell.rowId !== item.id) {
      setShowSmartPricing(false);
    }
  }, [editingCell, item.id]);

  const handleImageUpload = async (file: File) => {
    if (!storeId) return;
    await uploadImage({ file, itemId: item.id, storeId });
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

  return (
    <tr
      className={clsx(
        'relative border-b border-warm-border-warm/50 transition-colors',
        index % 2 === 0 ? 'bg-warm-surface' : 'bg-warm-surface/60',
        !isSelected && 'hover:bg-warm-surface-hover',
        isSelected && 'bg-warm-accent/10 hover:bg-warm-accent/15'
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
          </div>
        </div>
      </td>

      {/* Stock - Editable */}
      <td className="px-4 py-3 text-center whitespace-nowrap">
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
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono tabular-nums',
              item.reorder_status === 'OUT' ? 'bg-warm-danger/10 text-warm-danger' :
              item.reorder_status === 'LOW' ? 'bg-warm-warning/10 text-warm-warning' :
              'bg-warm-success/10 text-warm-success'
            )}
          >
            {item.current_qty.toLocaleString('en-IN')} pcs
          </span>
        )}
      </td>

      <!-- Selling - Price + MRP -->
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
        ) : item.price ? (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-warm-fg">৳{item.price.toLocaleString('en-IN')}</span>
              <button
                onClick={() => setShowSmartPricing(true)}
                className="p-1 rounded hover:bg-warm-surface-hover text-warm-muted hover:text-warm-accent transition-colors"
                title="Smart Pricing"
              >
                <TrendingUp size={14} />
              </button>
            </div>
            {item.mrp && item.mrp > item.price && (
              <span className="text-[11px] text-warm-dim line-through">MRP ৳{item.mrp.toLocaleString('en-IN')}</span>
            )}
          </div>
        ) : (
          <span className="text-warm-dim">—</span>
        )}
      </td>

      <!-- Profit - Condensed View -->
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
      <td className="px-4 py-3 cursor-pointer" onClick={onClick}>
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

      {/* Last Updated */}
      <td className="px-4 py-3 text-right text-sm text-warm-dim">
        {item.last_updated ? (
          <div className="cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1" onClick={() => startEditing('last_purchased_date')} title="Click to edit">
            {new Date(item.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </div>
        ) : (
          <span className="text-warm-dim">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block">
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-md hover:bg-warm-surface-hover transition-colors"
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
