import { ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import type { PosProduct } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';

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
  return formatCurrency(rounded);
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

  const numericMrp = Number(product.mrp);
  const hasMrp = !isNaN(numericMrp) && numericMrp > 0;

  return (
    <div
      className={clsx(
        'product-card relative flex flex-col items-center justify-between',
        isFocused && 'ring-2 ring-primary ring-offset-2',
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
      style={{
        backgroundColor: 'var(--color-surface-default)',
        borderColor: 'var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--inset-md)',
        position: 'relative',
        height: '180px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--space-2)'
      }}
      title={product.name.length > 24 ? product.name : undefined}
    >
      {/* Stock badge IF < 10 and > 0 */}
      {!isOutOfStock && product.stock < 10 && (
        <span 
          className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200"
          style={{ fontSize: '10px' }}
        >
          {product.stock} left
        </span>
      )}
      
      {/* Out of stock badge */}
      {isOutOfStock && (
        <span 
          className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200"
          style={{ fontSize: '10px' }}
        >
          Out of Stock
        </span>
      )}

      {/* 64px circle avatar */}
      <div 
        className="w-16 h-16 flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-border-light bg-background-subtle" 
        aria-hidden="true"
      >
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt="" 
            className="w-full h-full object-cover" 
          />
        ) : (
          <span className={clsx(getAvatarColor(product.name), 'w-full h-full flex items-center justify-center text-2xl font-bold rounded-full')}>
            {getInitials(product.name)}
          </span>
        )}
      </div>

      {/* Product Name & SKU */}
      <div className="w-full flex flex-col items-center gap-0.5">
        <h3 className="w-full text-base font-semibold text-main truncate px-1" title={product.name}>
          {product.name}
        </h3>
        {product.sku && (
          <span 
            className="text-[10px] text-muted font-mono tracking-wider truncate max-w-full"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {product.sku}
          </span>
        )}
      </div>

      {/* Price display with MRP strikethrough */}
      <div className="flex items-center justify-center gap-2 w-full">
        {hasMrp && (
          <span 
            className="tabular-nums line-through text-xs text-muted"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatPrice(numericMrp)}
          </span>
        )}
        <span 
          className="product-price tabular-nums"
        >
          {formatPrice(product.price)}
        </span>
      </div>
    </div>
  );
}
