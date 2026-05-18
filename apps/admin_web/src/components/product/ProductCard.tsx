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

export function ProductCard({ product, onAddToCart, isFocused, onFocus }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  // Flash animation when added to cart
  const [isAdded, setIsAdded] = useState(false);

  const handleClick = () => {
    if (!isOutOfStock) {
      onAddToCart(product);
      // Trigger flash animation
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
        // Focus styles
        isFocused && 'ring-2 ring-primary-default ring-offset-2',
        // Flash animation when added
        isAdded && 'animate-flash-success',
        // Hover lift effect for POS cards
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
        <h3 className="product-name">{product.name}</h3>
        <div className="product-quantity" aria-label={`Stock: ${product.stock}`}>
          Stock: {product.stock}
        </div>
        <div className="product-price" aria-label={`Price: ${product.price.toFixed(2)} taka`}>
          ৳{product.price.toFixed(2)}
        </div>
      </div>
      <button
        className={clsx(
          'button-primary w-full mt-2',
          'active:scale-[0.98]', // Button press animation
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
