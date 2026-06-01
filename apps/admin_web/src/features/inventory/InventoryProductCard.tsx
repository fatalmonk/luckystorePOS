import React from 'react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/format';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  min_qty?: number;
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
  tenantId?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  /** Skip lazy-loading & use fetchpriority=high for LCP candidate images */
  priority?: boolean;
}

// Currency formatting
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

export const InventoryProductCard = React.memo(function InventoryProductCard({ 
  item, 
  isHighlighted, 
  onUpdateStock, 
  tenantId, 
  isSelected, 
  onToggleSelect,
  priority,
}: InventoryProductCardProps) {
  const margin = calcMargin(item.cost, item.price);
  const hasMrp = typeof item.mrp === 'number' && item.mrp > 0;
  const priceError = hasMrp && (item.price || 0) > (item.mrp || 0);
  const lowMargin = margin !== null && margin < 10;

  const marginColor = margin === null ? 'text-text-muted' : margin >= 20 ? 'text-success' : margin >= 10 ? 'text-warning' : 'text-danger';

  return (
    <Card
      padding="none"
      className={clsx(
        "overflow-hidden group cursor-pointer transition-all duration-300 border",
        isHighlighted && "ring-2 ring-emerald-500 ring-offset-2"
      )}
      onClick={() => onUpdateStock(item)}
    >
      {/* Image / Status */}
      <div className="relative w-full aspect-square bg-background-subtle flex items-center justify-center overflow-hidden">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div 
            className="absolute top-2 left-2 z-10 bg-white/80 rounded-sm backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-5 h-5 rounded border-border-default text-primary focus:ring-primary cursor-pointer drop-shadow-md bg-white m-0.5 block"
            />
          </div>
        )}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            style={{ aspectRatio: '1 / 1' }}
            decoding="async"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-text-muted">
            <PackageIcon className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-xs">No image</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
          <div
            className="text-[10px] px-2 py-0.5 font-bold uppercase"
            style={{
              borderRadius: 'var(--radius-full)',
              ...(item.reorder_status === 'OUT' && {
                backgroundColor: 'var(--color-danger-subtle)',
                color: 'var(--color-danger-default)'
              }),
              ...(item.reorder_status === 'LOW' && {
                backgroundColor: 'var(--color-warning-subtle)',
                color: 'var(--color-warning-default)'
              }),
              ...(item.reorder_status === 'OK' && {
                backgroundColor: 'var(--color-success-subtle)',
                color: 'var(--color-success-default)'
              })
            }}
          >
            {item.reorder_status}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5" style={{ padding: 'var(--inset-md)' }}>
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
        {item.min_qty != null && item.min_qty > 0 && (
          <div className="text-xs text-warm-muted text-right -mt-1">
            Threshold: {item.min_qty}
          </div>
        )}

        {/* Price Row with Edit */}
        <div className="pt-2 border-t border-border-subtle">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {hasMrp && (
                <div className="text-xs text-text-muted line-through">
                  {formatMRP(item.mrp)}
                </div>
              )}
              <span 
                className="text-lg font-bold tabular-nums transition-colors px-2 py-0.5 rounded-md"
                style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-default)' }}
              >
                {formatSelling(item.price)}
              </span>
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
      </div>
    </Card>
  );
});