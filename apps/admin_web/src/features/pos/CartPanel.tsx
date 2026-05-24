import { ShoppingCart, Delete } from 'lucide-react';
import CartItemRow from './CartItemRow';
import { useState, useEffect } from 'react';
import type { CartItem } from '../../lib/api/types';

interface CartPanelProps {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  totalAmount: number;
  discountType: 'amount' | 'percentage';
  discountValue: string;
  isProcessing: boolean;
  onClearCart: () => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onSetDiscountValue: (value: string) => void;
  onSetDiscountType: (type: 'amount' | 'percentage') => void;
  onContinueBilling: () => void;
}

export function CartPanel({
  cart,
  itemCount,
  subtotal,
  totalAmount,
  discountType,
  discountValue,
  isProcessing,
  onClearCart,
  onRemoveFromCart,
  onUpdateQty,
  onSetDiscountValue,
  onSetDiscountType,
  onContinueBilling,
}: CartPanelProps) {
  const isEmpty = cart.length === 0;
  const isDisabled = isEmpty || isProcessing;

  const handleNumpadInput = (key: string) => {
    const current = discountValue || '';
    if (key === '⌫') {
      const updated = current.slice(0, -1);
      onSetDiscountValue(updated);
    } else {
      if (key === '.' && current.includes('.')) return;
      if (current === '0' && key !== '.') {
        onSetDiscountValue(key);
      } else {
        onSetDiscountValue(current + key);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="billing-header flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-text-primary" id="cart-heading">
          Billing Items ({itemCount})
        </h2>
        <button
          onClick={onClearCart}
          disabled={isEmpty}
          className="text-sm font-medium text-danger-default hover:text-danger-dark disabled:text-text-muted disabled:cursor-not-allowed transition-colors rounded-md px-2 py-1"
          aria-label="Clear all items from cart"
        >
          Clear Items
        </button>
      </div>

      {/* Cart Items */}
      <div className="billing-items flex-1 overflow-y-auto min-h-0 pr-1">
        {isEmpty ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center h-full"
            role="status"
            aria-label="Cart is empty"
          >
            <ShoppingCart
              size={48}
              className="text-text-muted mb-4"
              style={{ opacity: 0.2 }}
            />
            <p className="text-text-secondary font-medium">No items in cart</p>
            <p className="text-text-muted text-sm mt-1">
              Add products to start billing
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border-light">
            {cart.map((item) => (
              <CartItemRow
                key={item.product.id}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemoveFromCart={onRemoveFromCart}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Sticky footer: totals + numpad */}
      <div className="border-t border-border-default pt-4 mt-auto bg-surface-default shrink-0">
        {/* Subtotal */}
        <div className="billing-row flex justify-between items-center py-1.5 text-sm text-text-secondary">
          <span>Sub Total</span>
          <AnimatedAmount value={subtotal} />
        </div>

        {/* Discount: tap ৳/% to toggle type, numpad to input */}
        <div className="flex items-center gap-2 mb-3 mt-2">
          <div className="flex rounded-md overflow-hidden bg-background-subtle border border-border-default shrink-0">
            <button 
              type="button"
              className={`px-3 py-1.5 text-sm font-bold transition-all duration-150 ${
                discountType === 'amount'
                  ? 'bg-primary text-primary-on'
                  : 'text-text-secondary hover:bg-border-default'
              }`}
              onClick={() => onSetDiscountType('amount')}
              aria-label="Discount in Taka"
            >
              ৳
            </button>
            <button 
              type="button"
              className={`px-3 py-1.5 text-sm font-bold transition-all duration-150 border-l border-border-default ${
                discountType === 'percentage'
                  ? 'bg-primary text-primary-on'
                  : 'text-text-secondary hover:bg-border-default'
              }`}
              onClick={() => onSetDiscountType('percentage')}
              aria-label="Discount in percentage"
            >
              %
            </button>
          </div>
          
          <div className="flex-1 text-right font-mono text-lg font-bold pr-2 text-text-primary">
            {discountValue ? (discountType === 'percentage' ? `${discountValue}%` : `৳${discountValue}`) : '0.00'}
          </div>
        </div>

        {/* Numpad Component */}
        <div className="mt-3">
          <Numpad onInput={handleNumpadInput} />
        </div>

        {/* Total Amount */}
        <div className="billing-total flex justify-between items-center py-3 border-t border-border-default mt-3">
          <span className="text-text-primary font-bold">TOTAL AMOUNT</span>
          <span className="text-success-dark font-extrabold text-xl">
            <AnimatedAmount value={totalAmount} />
          </span>
        </div>

        <button
          className="pos-checkout-btn w-full mt-2 py-3.5 px-4 font-bold rounded-md bg-primary text-primary-on text-base hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98]"
          onClick={onContinueBilling}
          disabled={isDisabled}
          aria-busy={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-on border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            'Continue Billing (F12)'
          )}
        </button>
      </div>
    </div>
  );
}

function Numpad({ onInput }: { onInput: (value: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="numpad-key aspect-square text-base font-bold bg-background-subtle hover:bg-border-default active:bg-border-strong rounded-md flex items-center justify-center border border-border-light transition-all cursor-pointer"
          onClick={() => onInput(key)}
          style={{ height: '48px', minHeight: '48px' }}
        >
          {key === '⌫' ? <Delete size={20} className="text-text-secondary" /> : key}
        </button>
      ))}
    </div>
  );
}

function AnimatedAmount({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsFlashing(true);
      setDisplayValue(value);
      setTimeout(() => setIsFlashing(false), 300);
    }
  }, [value, displayValue]);

  return (
    <span
      className={`
        tabular-nums transition-all duration-200
        ${isFlashing ? 'text-success-dark scale-105 font-bold' : ''}
        ${className || ''}`}
    >
      ৳{displayValue.toFixed(2)}
    </span>
  );
}
