import type { InventoryItem } from '../../types/inventory';
import React, { useState } from 'react';
import { MoreVertical, History, Pencil, Trash2 } from 'lucide-react';
import { calcMarginRounded, getMarginBadgeStyles } from '@/lib/format';
import { getOptimizedImageUrl, getImageSrcSet } from '../../lib/images';

const CRITICAL_STOCK_THRESHOLD = 2;
const LOW_STOCK_THRESHOLD = 5;

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
  const isOutOfStock = item.current_qty <= 0;

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
    if (isOutOfStock) return 'Out of stock';
    if (item.current_qty <= CRITICAL_STOCK_THRESHOLD) return `${item.current_qty} left`;
    if (item.current_qty <= LOW_STOCK_THRESHOLD) return `${item.current_qty} left`;
    return `${item.current_qty} in stock`;
  };

  const getStockTextColor = () => {
    if (isOutOfStock) return 'text-danger';
    if (item.current_qty <= CRITICAL_STOCK_THRESHOLD) return 'text-danger font-bold';
    if (item.current_qty <= LOW_STOCK_THRESHOLD) return 'text-primary font-bold';
    return 'text-success';
  };

  const discountPct =
    typeof item.mrp === 'number' && typeof item.price === 'number' && item.mrp > item.price && item.mrp > 0
      ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
      : null;

  return (
    <div
      onClick={handleCardClick}
      className={`relative p-3.5 sm:p-4 bg-surface rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 shadow-sm select-none active:scale-[0.99] active:brightness-95 overflow-hidden ${
        isSelected
          ? 'border-primary shadow-level-1 ring-1 ring-primary/20'
          : isHighlighted
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-primary/45'
      }`}
    >
      {/* 3-dot overlay actions button on top-right of the card */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-surface-raised active:bg-surface-raised text-text-secondary transition-colors"
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
      <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
        {/* Left Column: Image with rounded box + stock status underneath */}
        <div className="flex flex-col gap-1.5 sm:gap-2 items-center flex-shrink-0">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl bg-white dark:bg-neutral-100 border border-border/40 overflow-hidden flex items-center justify-center">
              {item.image_url ? (
                <img
                  src={getOptimizedImageUrl(item.image_url, { width: 224 })}
                  srcSet={getImageSrcSet(item.image_url, 112)}
                  sizes="(max-width: 768px) 96px, 112px"
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

          <span className={`w-full text-center text-[11px] sm:text-xs font-semibold tracking-tight ${getStockTextColor()}`}>
            {getStockText()}
          </span>
        </div>

        {/* Right Column: Title + SKU + Pricing grid list */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-1.5">
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary text-sm sm:text-[15px] leading-snug line-clamp-2 pr-6">
              {item.name}
            </h3>
            <span className="text-[10px] sm:text-[11px] text-text-secondary font-mono block truncate mt-0.5">
              SKU: {item.sku || '—'}
            </span>
          </div>

          {/* Pricing sub-panel + Margin badge / Reorder button */}
          <div className="flex gap-2 sm:gap-2.5 justify-between items-center mt-auto min-w-0">
            <div
              className={`flex-1 min-w-0 flex flex-col gap-0.5 sm:gap-1 text-[11px] sm:text-xs text-text-primary bg-surface-raised/50 rounded-xl p-2 sm:p-2.5 transition-opacity ${
                isOutOfStock ? 'opacity-40' : ''
              }`}
            >
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-text-muted text-[10px] sm:text-[11px]">Cost:</span>
                <span className="font-semibold">৳{(item.cost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-text-muted text-[10px] sm:text-[11px]">MRP:</span>
                <span className="font-semibold">৳{(item.mrp || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5 border-t border-border/20 tabular-nums">
                <div className="flex items-center gap-1 min-w-0 truncate pr-1">
                  <span className="text-text-muted text-[10px] sm:text-[11px]">Price:</span>
                  {discountPct !== null && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-success bg-success-subtle border border-success/20 px-1 py-0.5 rounded leading-none flex-shrink-0">
                      -{discountPct}%
                    </span>
                  )}
                </div>
                <span className="font-bold flex-shrink-0">৳{(item.price || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex-shrink-0">
              {isOutOfStock ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateStock) {
                      onUpdateStock(item);
                    } else if (onClick) {
                      onClick(item);
                    }
                  }}
                  className="flex flex-col items-center justify-center px-2 sm:px-2.5 py-2 rounded-xl sm:rounded-2xl border border-danger/30 bg-danger-subtle text-danger hover:bg-danger/20 active:scale-95 transition-all w-[62px] sm:w-[70px] cursor-pointer shadow-xs"
                  title="Reorder stock"
                >
                  <span className="text-[11px] font-bold">Reorder</span>
                </button>
              ) : (
                margin !== null && (() => {
                  const marginBadge = getMarginBadgeStyles(margin);
                  return (
                    <div className={`flex flex-col items-center justify-center px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border w-[62px] sm:w-[70px] text-center ${marginBadge.container}`}>
                      <span className="text-[8px] sm:text-[9px] text-text-muted uppercase tracking-wider block font-semibold leading-none mb-0.5">
                        MARGIN
                      </span>
                      <span className={`text-[11px] sm:text-xs font-bold tabular-nums leading-none ${marginBadge.text}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
