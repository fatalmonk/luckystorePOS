import React from 'react';
import { Trash2 } from 'lucide-react';

// The cart item shape used in the POS app
export interface PosCartItem {
  product: {
    id: string;
    name: string;
    price: number;
    sku?: string;
  };
  qty: number;
}

interface CartItemRowProps {
  item: PosCartItem;
  onUpdateQty: (id: string, qty: number) => void;
  onRemoveFromCart: (id: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdateQty, onRemoveFromCart }) => {
  const handleDecrement = () => {
    const newQty = Math.max(1, item.qty - 1);
    onUpdateQty(item.product.id, newQty);
  };

  const handleIncrement = () => {
    onUpdateQty(item.product.id, item.qty + 1);
  };

  const totalLinePrice = item.product.price * item.qty;

  return (
    <li className="billing-item cart-item flex items-center justify-between gap-3 py-3 border-b border-border-light min-h-[64px]">
      {/* Left: Item Details */}
      <div className="billing-item-info flex-1 min-w-0">
        <span className="billing-item-name font-semibold text-sm text-text-primary block truncate" title={item.product.name}>
          {item.product.name}
        </span>
        <span className="billing-item-price text-xs text-text-secondary block mt-0.5">
          ৳{item.product.price.toFixed(2)} / unit
        </span>
      </div>

      {/* Middle: Quantity Controls */}
      <div className="billing-item-controls flex items-center gap-1 shrink-0">
        <button 
          className="button-outline w-10 h-10 flex items-center justify-center p-0 text-lg font-bold rounded-md" 
          onClick={handleDecrement} 
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="font-semibold text-base px-2 min-w-[28px] text-center" aria-live="polite">
          {item.qty}
        </span>
        <button 
          className="button-outline w-10 h-10 flex items-center justify-center p-0 text-lg font-bold rounded-md" 
          onClick={handleIncrement} 
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Right: Total Price */}
      <div className="billing-item-total font-bold text-sm text-text-primary min-w-[70px] text-right shrink-0">
        ৳{totalLinePrice.toFixed(2)}
      </div>

      {/* Trash/Remove Action */}
      <button 
        className="text-text-muted hover:text-danger-default p-2 rounded-md transition-colors shrink-0"
        onClick={() => onRemoveFromCart(item.product.id)}
        aria-label="Remove item from cart"
      >
        <Trash2 size={18} />
      </button>
    </li>
  );
};
export default CartItemRow;
