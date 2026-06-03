import type { InventoryItem } from '../../types/inventory';
import { useEffect, useState } from 'react';
import { MoreVertical, History, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { EditableCell } from '../../components/ui/EditableCell';
import { ImageUploadZone } from '../../components/inventory/ImageUploadZone';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useNotify } from '../../components/NotificationContext';
import { formatCurrency } from '../../lib/format';

const calcMargin = (cost?: number, price?: number) => {
  if (typeof cost !== 'number' || typeof price !== 'number' || price <= 0 || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  OK: { bg: 'bg-warm-success/10', text: 'text-warm-success', border: 'border-warm-success/20' },
  LOW: { bg: 'bg-warm-warning/10', text: 'text-warm-warning', border: 'border-warm-warning/20' },
  OUT: { bg: 'bg-warm-danger/10', text: 'text-warm-danger', border: 'border-warm-danger/20' },
};

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
  const [liveCost, setLiveCost] = useState<number | undefined>(undefined);
  const [livePrice, setLivePrice] = useState<number | undefined>(undefined);

  const margin = calcMargin(
    liveCost !== undefined ? liveCost : item.cost,
    livePrice !== undefined ? livePrice : item.price
  );

  const isEditing = (field: string) =>
    editingCell?.rowId === item.id && editingCell?.field === field;

  // Reset live values when editing finishes or starts
  useEffect(() => {
    if (!editingCell || editingCell.rowId !== item.id) {
      setLiveCost(undefined);
      setLivePrice(undefined);
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
      <td className="px-4 py-3 group/row border-r border-warm-border-warm/50 max-w-[380px] w-[380px] overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-warm-accent/20 to-warm-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
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
            {item.barcode && (
              <div className="text-xs text-warm-dim font-mono">{item.barcode}</div>
            )}
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3 text-sm text-warm-muted cursor-pointer border-r border-warm-border-warm/50" onClick={onClick}>
        {item.category_name || '—'}
      </td>

      {/* SKU - Editable */}
      <td className="px-4 py-3 text-sm text-warm-dim font-mono whitespace-nowrap min-w-[120px] border-r border-warm-border-warm/50">
        {isEditing('sku') ? (
          <EditableCell
            value={item.sku || ''}
            type="text"
            onSave={(val) => handleSave('sku', val)}
            onCancel={() => setEditingCell(null)}
            placeholder="Enter SKU"
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => startEditing('sku')}
            title="Click to edit"
          >
            {item.sku || '—'}
          </div>
        )}
      </td>

      {/* Stock - Editable */}
      <td className="px-4 py-3 text-center whitespace-nowrap border-r border-warm-border-warm/50">
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
            className={clsx(
              'cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1 text-sm font-bold font-mono tabular-nums',
              item.reorder_status === 'OUT' ? 'text-warm-danger' :
              item.reorder_status === 'LOW' ? 'text-warm-warning' : 'text-warm-success'
            )}
            onClick={() => startEditing('current_qty')}
            title="Click to edit"
          >
            {item.current_qty.toLocaleString('en-IN')}
          </div>
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

      {/* Cost - Editable */}
      <td className="px-4 py-3 text-sm text-right text-warm-dim font-mono">
        {isEditing('cost') ? (
          <EditableCell
            value={item.cost || 0}
            type="currency"
            onSave={(val) => handleSave('cost', val)}
            onCancel={() => setEditingCell(null)}
            onChange={(val) => setLiveCost(Number(val))}
            min={0}
            step={0.01}
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => startEditing('cost')}
            title="Click to edit"
          >
            {item.cost ? formatCurrency(item.cost) : '—'}
          </div>
        )}
      </td>

      {/* Price - Editable */}
      <td className="px-4 py-3 text-sm text-right font-semibold text-warm-fg font-mono">
        {isEditing('price') ? (
          <EditableCell
            value={item.price || 0}
            type="currency"
            onSave={(val) => handleSave('price', val)}
            onCancel={() => setEditingCell(null)}
            onChange={(val) => setLivePrice(Number(val))}
            validate={validatePrice}
            min={0}
            step={0.01}
          />
        ) : (
          <div
            className={clsx(
              'cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1',
              (!item.price || item.price === 0) && 'text-warm-danger'
            )}
            onClick={() => startEditing('price')}
            title="Click to edit"
          >
            {item.price ? formatCurrency(item.price) : '—'}
          </div>
        )}
      </td>

      {/* MRP - Editable */}
      <td className="px-4 py-3 text-sm text-right text-warm-dim font-mono">
        {isEditing('mrp') ? (
          <EditableCell
            value={item.mrp || ''}
            type="currency"
            onSave={(val) => handleSave('mrp', val)}
            onCancel={() => setEditingCell(null)}
            min={0}
            step={0.01}
            allowEmpty={true}
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => startEditing('mrp')}
            title="Click to edit"
          >
            {item.mrp ? formatCurrency(item.mrp) : '—'}
          </div>
        )}
      </td>

      {/* Margin */}
      <td className="px-4 py-3 text-sm text-right font-mono">
        {margin !== null ? (
          <span
            className={clsx(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              margin >= 30 ? 'bg-warm-success/10 text-warm-success' :
              margin >= 15 ? 'bg-warm-warning/10 text-warm-warning' :
              'bg-warm-danger/10 text-warm-danger'
            )}
          >
            {margin}%
          </span>
        ) : (
          <span className="text-warm-dim">—</span>
        )}
      </td>

      {/* Last Purchased - Editable */}
      <td className="px-4 py-3 text-sm text-right text-warm-dim font-mono">
        {isEditing('last_purchased_date') ? (
          <EditableCell
            value={item.last_purchased_date || ''}
            type="date"
            onSave={(val) => handleSave('last_purchased_date', val)}
            onCancel={() => setEditingCell(null)}
            allowEmpty={true}
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-warm-surface-hover rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => startEditing('last_purchased_date')}
            title="Click to edit"
          >
            {item.last_purchased_date ? (
              new Date(item.last_purchased_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })
            ) : (
              '—'
            )}
          </div>
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
