import { ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
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
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600',
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

// Indian numbering formatter (lakh/crore)
const formatIndianNum = (num: number) => {
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}Cr`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  return `৳${num.toFixed(2)}`;
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
        <div className="product-price tabular-nums" aria-label={`Price: ${product.price.toFixed(2)} taka`}>
          {formatIndianNum(product.price)}
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
