import { ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import type { PosProduct } from '../../lib/api/types';

interface ProductCardProps {
  product: PosProduct;
  onAddToCart: (product: PosProduct) => void;
  isFocused?: boolean;
  onFocus?: () => void;
}

const getInitials = (name: string) =>
  name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-100 text-emerald-600',
    'bg-primary-subtle text-primary-default',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600',
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

const formatPrice = (num: number): string => {
  const rounded = Math.round(num);
  if (rounded >= 10000000) {
    return `৳${(rounded / 10000000).toFixed(0)}Cr`;
  } else if (rounded >= 100000) {
    return `৳${(rounded / 100000).toFixed(0)}L`;
  }
  return `৳${rounded.toLocaleString('en-IN')}`;
};

export function ProductCard({ product, onAddToCart, isFocused, onFocus }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const [isAdded, setIsAdded] = useState(false);

  const handleClick = () => {
    if (!isOutOfStock) {
      onAddToCart(product);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const hasMrp = typeof product.mrp === 'number' && product.mrp > 0;

  return (
    <div
      className={clsx(
        'product-card',
        isFocused && 'ring-2 ring-primary-default ring-offset-2',
        isAdded && 'animate-flash-success',
        !isOutOfStock && [
          'hover:-translate-y-0.5',
          'hover:shadow-level-2',
          'hover:border-border-strong',
          'transition-all duration-200 ease-out'
        ],
        isOutOfStock && 'opacity-60 cursor-not-allowed'
      )}
      role="button"
      tabIndex={0}
      aria-label={`${product.name}, ${product.stock} in stock, ${product.price.toFixed(2)} taka`}
      aria-disabled={isOutOfStock}
      onFocus={onFocus}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={product.name.length > 24 ? product.name : undefined}
    >
      <div className="product-avatar" aria-hidden="true">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" />
        ) : (
          <span className={getAvatarColor(product.name)}>
            {getInitials(product.name)}
          </span>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name truncate" title={product.name.length > 24 ? product.name : undefined}>
          {product.name}
        </h3>
        <div className="product-meta tabular-nums font-mono" aria-label={`Stock: ${product.stock}`}>
          Qty: {product.stock}
        </div>

        {/* Price display with MRP strikethrough */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-default min-h-[2rem]">
          {hasMrp && (
            <span className="text-sm text-text-muted line-through tabular-nums">
              {formatPrice(product.mrp!)}
            </span>
          )}
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
      <button
        className={clsx(
          'button-primary w-full mt-2 min-h-[44px]',
          'active:scale-[0.98]',
          'transition-transform duration-100',
          isOutOfStock && 'opacity-50 cursor-not-allowed'
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        disabled={isOutOfStock}
        aria-label={isOutOfStock ? 'Out of stock' : `Add ${product.name} to cart`}
      >
        <ShoppingCart size={16} className="mr-2 inline" aria-hidden="true" />
        {isOutOfStock ? 'Out of Stock' : isAdded ? 'Added!' : 'Add to Cart'}
      </button>
    </div>
  );
}
