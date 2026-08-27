import type { InventoryItem } from '../../types/inventory';
import React, { useState } from 'react';
import { MoreVertical, History, Pencil, Trash2 } from 'lucide-react';
import { calcMarginRounded } from '@/lib/format';
import { getOptimizedImageUrl, getImageSrcSet } from '../../lib/images';

const getMarginBadgeStyles = (margin: number | null): { container: string; text: string } => {
  if (margin === null) return { container: 'bg-surface-raised border-border/40', text: 'text-text-muted' };
  if (margin >= 30) {
    return { container: 'bg-success-subtle border-success/20', text: 'text-success' };
  }
  if (margin >= 15) {
    return { container: 'bg-primary/10 border-primary/20', text: 'text-primary' };
  }
  return { container: 'bg-danger-subtle border-danger/20', text: 'text-danger' };
};

export interface InventoryProductCardProps {
  item: InventoryItem;
  isSelected?: boolean;
  onToggleSelect?: (id?: string) => void;
  onClick?: (item: InventoryItem) => void;
  onUpdateStock?: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onEditProduct?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  isHighlighted?: boolean;
  priority?: boolean;
  isEditMode?: boolean;
  onInlineSave?: (itemId: string, field: keyof InventoryItem, value: string | number) => Promise<void>;
  storeId?: string;
  tenantId?: string;
}

export const InventoryProductCard = React.memo(function InventoryProductCard({
  item,
  isSelected = false,
  onToggleSelect,
  onClick,
  onUpdateStock,
  onViewHistory,
  onEditProduct,
  onDelete,
  isHighlighted = false,
}: InventoryProductCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const margin = calcMarginRounded(item.cost, item.price);

  const handleAction = (e: React.MouseEvent, action?: (item: InventoryItem) => void) => {
    e.stopPropagation();
    if (action) action(item);
    setShowMenu(false);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(item);
    } else if (onUpdateStock) {
      onUpdateStock(item);
    }
  };

  const getStockText = () => {
    if (item.current_qty <= 0) return 'Out of stock';
    if (item.current_qty <= 5) return `${item.current_qty} left`;
    return `${item.current_qty} in stock`;
  };

  const getStockTextColor = () => {
    if (item.current_qty <= 0) return 'text-danger';
    if (item.current_qty <= 5) return 'text-primary font-bold';
    return 'text-success';
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative p-4 bg-surface rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-3 shadow-sm select-none active:scale-[0.99] active:brightness-95 ${
        isSelected
          ? 'border-primary shadow-level-1 ring-1 ring-primary/20'
          : isHighlighted
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-primary/45'
      }`}
    >
      {/* 3-dot overlay actions button on top-right of the card */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-raised active:bg-surface-raised text-text-secondary transition-colors"
          aria-label="Actions"
          aria-haspopup="menu"
          aria-expanded={showMenu}
        >
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border/80 bg-surface-overlay/95 backdrop-blur-md shadow-level-2 z-40 py-1 text-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={(e) => handleAction(e, onViewHistory)}
                className="w-full text-left px-4 py-2.5 hover:bg-background-subtle flex items-center gap-2 text-text-primary active:bg-background-subtle"
              >
                <History size={16} />
                <span>History</span>
              </button>
              <button
                onClick={(e) => handleAction(e, onEditProduct)}
                className="w-full text-left px-4 py-2.5 hover:bg-background-subtle flex items-center gap-2 text-text-primary active:bg-background-subtle"
              >
                <Pencil size={16} />
                <span>Edit Product</span>
              </button>
              <button
                onClick={(e) => handleAction(e, onDelete)}
                className="w-full text-left px-4 py-2.5 hover:bg-background-subtle flex items-center gap-2 text-danger active:bg-background-subtle"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main card body split into Left block (Image + Stock status) and Right block (Texts + pricing info) */}
      <div className="flex gap-4 items-start w-full">
        {/* Left Column: Image with rounded box + stock status underneath */}
        <div className="flex flex-col gap-2 items-center flex-shrink-0">
          <div className="relative">
            <div className="w-28 h-28 rounded-2xl bg-white dark:bg-neutral-100 border border-border/40 overflow-hidden flex items-center justify-center">
              {item.image_url ? (
                <img
                  src={getOptimizedImageUrl(item.image_url, { width: 224 })}
                  srcSet={getImageSrcSet(item.image_url, 112)}
                  sizes="(max-width: 768px) 112px, 112px"
                  alt={item.name}
                  width={112}
                  height={112}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider text-center px-1">
                  No Image
                </span>
              )}
            </div>

            {onToggleSelect && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item.id);
                }}
                className="absolute top-1.5 left-1.5 backdrop-blur-md bg-surface/80 border border-border/80 rounded-lg w-6 h-6 flex items-center justify-center hover:bg-surface-raised active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  aria-label={`Select ${item.name}`}
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                />
              </div>
            )}
          </div>

          <span className={`w-full text-center text-xs font-semibold tracking-tight ${getStockTextColor()}`}>
            {getStockText()}
          </span>
        </div>

        {/* Right Column: Title + SKU + Pricing grid list */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            <h3 className="font-semibold text-text-primary text-[15px] leading-tight line-clamp-2 pr-7">
              {item.name}
            </h3>
            <span className="text-[11px] text-text-muted font-mono block truncate mt-0.5">
              SKU: {item.sku || '—'}
            </span>
          </div>

          {/* Pricing sub-panel + Margin badge */}
          <div className="flex gap-3 justify-between items-center mt-2">
            <div className="flex-1 flex flex-col gap-1 text-xs text-text-primary bg-surface-raised/50 rounded-xl p-2.5">
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-text-muted text-[11px]">Cost:</span>
                <span className="font-semibold">৳{(item.cost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-text-muted text-[11px]">MRP:</span>
                <span className="font-semibold">৳{(item.mrp || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5 border-t border-border/20 tabular-nums">
                <span className="text-text-muted text-[11px]">Selling Price:</span>
                <span className="font-bold">৳{(item.price || 0).toFixed(2)}</span>
              </div>
            </div>

            {margin !== null && (() => {
              const marginBadge = getMarginBadgeStyles(margin);
              return (
                <div className={`flex flex-col items-center flex-shrink-0 justify-center px-3 py-2 rounded-2xl border min-w-[76px] ${marginBadge.container}`}>
                  <span className="text-[9px] text-text-muted uppercase tracking-wider block font-semibold mb-0.5">
                    MARGIN:
                  </span>
                  <span className={`text-xs font-bold tabular-nums ${marginBadge.text}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
});
