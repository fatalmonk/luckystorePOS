'use client';

import { useEffect } from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';
import type { Product } from '../lib/types';
import { formatBdt, formatUnitPrice } from '../lib/formatPrice';
import { useCartContext } from './CartProvider';
import { useToast } from './Toast';
import { QtyNumber } from './ui/QtyNumber';
import { ProductImage } from './product/ProductImage';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { cart, addToCart, updateQty } = useCartContext();
  const { showToast } = useToast();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (product) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  if (!product) return null;

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;
  const outOfStock = product.stock <= 0;
  const stockLow = product.stock > 0 && product.stock <= 5;
  const onSale = product.originalPrice !== undefined && product.originalPrice > product.price;

  const handleAdd = () => {
    if (outOfStock) {
      showToast('Sorry, this item is out of stock');
      return;
    }
    addToCart(product);
    showToast(`Added ${product.name} to cart`);
  };

  const handleUpdateQty = (delta: number) => {
    updateQty(product.id, delta);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div
        className="bg-warm-surface border border-warm-border rounded-[24px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-warm-bg text-warm-fg flex items-center justify-center hover:bg-warm-border transition-colors border border-warm-border"
          aria-label="Close modal"
        >
          <X size={18} weight="bold" aria-hidden="true" />
        </button>

        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pt-2">
          {/* Image */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl bg-warm-image-well overflow-hidden flex items-center justify-center border border-warm-image-well-border shrink-0">
            <ProductImage
              src={product.image_url}
              alt={product.name}
              category={product.category}
              sizes="192px"
              imageClassName="object-contain p-4"
              iconSize={52}
            />
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between space-y-3 w-full">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-warm-bg text-warm-muted uppercase tracking-wider">
                  {product.category}
                </span>
                {stockLow && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E65100] text-white">
                    <WarningCircle size={12} weight="fill" aria-hidden="true" />
                    Only {product.stock} left
                  </span>
                )}
                {outOfStock && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-white">
                    Out of stock
                  </span>
                )}
              </div>

              <h2 id="quick-view-title" className="text-lg font-extrabold text-warm-fg leading-snug">
                {product.name}
              </h2>
              <p className="text-xs text-warm-muted mt-0.5">{product.unit}</p>
            </div>

            {/* Price block */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-warm-fg">{formatBdt(product.price)}</span>
              {onSale && (
                <span className="text-xs text-warm-muted line-through">{formatBdt(product.originalPrice)}</span>
              )}
              <span className="text-xs text-warm-dim">({formatUnitPrice(product.price, product.unit)})</span>
            </div>

            {/* Description excerpt */}
            <p className="text-xs text-warm-muted line-clamp-3 leading-relaxed">
              {product.description || `Fresh ${product.name} ready for fast delivery.`}
            </p>

            {/* Actions */}
            <div className="pt-2">
              {qtyInCart > 0 ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpdateQty(-1)}
                    className="w-10 h-10 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center font-bold hover:bg-warm-accent active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <QtyNumber qty={qtyInCart} className="font-black text-sm min-w-[24px] text-center" />
                  <button
                    onClick={() => handleUpdateQty(1)}
                    disabled={qtyInCart >= product.stock}
                    className="w-10 h-10 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center font-bold hover:bg-warm-accent active:scale-95 transition-all disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              ) : outOfStock ? (
                <button
                  type="button"
                  disabled
                  className="h-11 w-full cursor-not-allowed rounded-warm-md border border-warm-border bg-warm-bg px-3 text-sm font-bold text-warm-muted"
                  aria-label={`${product.name} is out of stock`}
                >
                  Out of stock
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  className="w-full py-3 rounded-full bg-[#f0c444] text-[#0B0B0D] font-extrabold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md"
                >
                  Add to Cart — {formatBdt(product.price)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
