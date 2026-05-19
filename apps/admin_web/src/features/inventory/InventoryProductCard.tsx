import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useNotify } from '../../components/NotificationContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  last_updated?: string;
  price?: number;
  cost?: number;
  mrp?: number;
  category_id?: string;
  image_url?: string;
}

interface InventoryProductCardProps {
  item: InventoryItem;
  isHighlighted?: boolean;
  onUpdateStock: (item: InventoryItem) => void;
  storeId?: string;
}

// Currency formatting
const formatPrice = (num?: number): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(2)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(2)}L`;
  }
  return `৳${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatMRP = (num?: number): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(0)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(0)}L`;
  }
  return `৳${Math.round(num).toLocaleString('en-IN')}`;
};

const formatSelling = (num?: number): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(0)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(0)}L`;
  }
  return `৳${Math.round(num).toLocaleString('en-IN')}`;
};

// Calculate margin percentage
const calcMargin = (cost?: number, price?: number): number | null => {
  if (!cost || cost <= 0 || !price) return null;
  return Math.round(((price - cost) / cost) * 100);
};

// Edit icon component
const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

// Package icon component
const PackageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

export function InventoryProductCard({ item, isHighlighted, onUpdateStock, storeId }: InventoryProductCardProps) {
  const queryClient = useQueryClient();
  const { notify } = useNotify();
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(item.price ?? 0));
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingPrice) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingPrice]);

  const priceMutation = useMutation({
    mutationFn: async (newPrice: number) => {
      return api.products.update(item.id, { price: newPrice }, storeId);
    },
    onSuccess: () => {
      notify(`Price updated for ${item.name}`, 'success');
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditingPrice(false);
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to update price', 'error');
    },
  });

  const handleSavePrice = () => {
    const val = parseFloat(priceValue);
    if (isNaN(val) || val < 0) {
      notify('Invalid price', 'error');
      return;
    }
    priceMutation.mutate(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePrice();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setPriceValue(String(item.price ?? 0));
    }
  };

  const margin = calcMargin(item.cost, item.price);
  const hasMrp = typeof item.mrp === 'number' && item.mrp > 0;
  const hasCost = typeof item.cost === 'number' && item.cost > 0;
  const priceError = hasMrp && (item.price || 0) > (item.mrp || 0);
  const lowMargin = margin !== null && margin < 10;

  const marginColor = margin === null ? 'text-text-muted' : margin >= 20 ? 'text-success' : margin >= 10 ? 'text-warning' : 'text-danger';

  return (
    <Card
      padding="none"
      className={clsx(
        "overflow-hidden group cursor-pointer transition-all duration-300",
        isHighlighted && "ring-2 ring-emerald-500 ring-offset-2"
      )}
    >
      {/* Image / Status */}
      <div className="relative w-full aspect-square bg-background-subtle flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-text-muted">
            <PackageIcon className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-xs">No image</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <div
            className={clsx(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
              item.reorder_status === 'OUT' && "bg-rose-100 text-rose-700",
              item.reorder_status === 'LOW' && "bg-amber-100 text-amber-700",
              item.reorder_status === 'OK' && "bg-emerald-100 text-emerald-700"
            )}
          >
            {item.reorder_status}
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        {/* Name */}
        <h4
          className="text-sm font-semibold text-text-primary line-clamp-2 leading-tight"
          title={item.name}
        >
          {item.name}
        </h4>

        {/* Stock */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-muted uppercase tracking-wide">Stock</span>
          <span className={clsx(
            "text-lg font-bold font-mono tabular-nums",
            item.current_qty <= 5 ? "text-danger" : "text-text-primary"
          )}>
            {item.current_qty.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Price Row with Edit */}
        <div className="pt-2 border-t border-border-subtle">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {hasMrp && (
                <div className="text-xs text-text-muted line-through">
                  {formatMRP(item.mrp)}
                </div>
              )}
              {!isEditingPrice ? (
                <button
                  onClick={() => {
                    setPriceValue(String(item.price ?? 0));
                    setIsEditingPrice(true);
                  }}
                  className="group/edit flex items-center gap-1"
                  title="Click to edit selling price"
                >
                  <span className="text-lg font-bold tabular-nums text-slate-900 group-hover/edit:text-primary transition-colors">
                    {formatSelling(item.price)}
                  </span>
                  <EditIcon className="w-3 h-3 text-text-muted opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSavePrice}
                    className="w-20 px-1.5 py-0.5 text-base font-bold border border-primary rounded tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSavePrice}
                    disabled={priceMutation.isPending}
                    className="text-xs text-success hover:text-success-hover"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPrice(false);
                      setPriceValue(String(item.price ?? 0));
                    }}
                    className="text-xs text-danger hover:text-danger-hover"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            
            {/* Margin badge */}
            <div className="text-right">
              <span className="text-[10px] text-text-muted">Margin</span>
              <div className={clsx("text-sm font-bold font-mono", marginColor)}>
                {margin !== null ? `${margin}%` : '—'}
              </div>
            </div>
          </div>

          {/* Cost Price (always visible) */}
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-text-muted">Cost</span>
            <span className="text-xs text-text-secondary tabular-nums font-mono">
              {formatPrice(item.cost)}
            </span>
          </div>

          {/* Health Badges */}
          {(priceError || lowMargin || !hasMrp) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {priceError && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-medium">
                  <span className="w-1 h-1 rounded-full bg-rose-500" />
                  Invalid
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

        <Button
          size="sm"
          variant="secondary"
          className="w-full mt-1 min-h-[44px]"
          onClick={() => onUpdateStock(item)}
        >
          Update Stock
        </Button>
      </div>
    </Card>
  );
}
