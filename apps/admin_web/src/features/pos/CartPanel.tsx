import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
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

  return (
    <>
      {/* Header */}
      <div className="billing-header flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-text-primary" id="cart-heading">
          Billing Items ({itemCount})
        </h2>
        <button
          onClick={onClearCart}
          disabled={isEmpty}
          className="text-sm font-medium text-danger-default hover:text-danger-dark disabled:text-text-muted disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-danger-default focus:ring-offset-2 rounded-md px-2 py-1"
          aria-label="Clear all items from cart"
        >
          Clear Items
        </button>
      </div>

      {/* Cart Items */}
      <div className="billing-items flex-1 overflow-y-auto">
        {isEmpty ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
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
          <ul role="list" className="space-y-3">
            {cart.map((item) => (
              <li
                key={item.product.id}
                className="billing-item flex items-center gap-3 p-3 bg-surface-default border border-border-default rounded-md"
              >
                <div className="billing-item-info flex-1 min-w-0">
                  <div className="billing-item-name text-text-primary font-medium truncate">
                    {item.product.name}
                  </div>
                  <div className="billing-item-price text-text-secondary text-sm">
                    ৳{item.product.price.toFixed(2)} × {item.qty}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="billing-item-controls flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQty(item.product.id, Math.max(1, item.qty - 1))}
                    className="button-outline flex items-center justify-center w-8 h-8 p-0"
                    aria-label={`Decrease quantity of ${item.product.name}`}
                  >
                    <Minus size={16} />
                  </button>

                  <span
                    className="text-text-primary font-medium min-w-[2rem] text-center"
                    aria-live="polite"
                  >
                    {item.qty}
                  </span>

                  <button
                    onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
                    className="button-outline flex items-center justify-center w-8 h-8 p-0"
                    aria-label={`Increase quantity of ${item.product.name}`}
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    onClick={() => onRemoveFromCart(item.product.id)}
                    className="text-danger-default hover:text-danger-dark hover:bg-danger-subtle rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-danger-default focus:ring-offset-2"
                    aria-label={`Remove ${item.product.name} from cart`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Line Total */}
                <div className="billing-item-total text-text-primary font-semibold min-w-[80px] text-right">
                  ৳{item.lineTotal.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary Section */}
      <div className="billing-summary border-t border-border-default pt-4 mt-4">
        <div className="billing-row flex justify-between items-center py-2">
          <span className="text-text-secondary">Sub Total</span>
          <span className="text-text-primary font-medium">৳{subtotal.toFixed(2)}</span>
        </div>

        {/* Discount Input */}
        <div className="billing-actions mt-3 mb-3">
          <div className="flex items-center gap-2 w-full">
            <label
              htmlFor="discount-input"
              className="text-sm font-medium text-text-secondary whitespace-nowrap"
            >
              Discount:
            </label>
            <div className="flex border border-border-default rounded-md overflow-hidden bg-surface-default flex-1">
              <input
                id="discount-input"
                type="number"
                value={discountValue}
                onChange={(e) => onSetDiscountValue(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="bg-transparent border-none outline-none w-full px-3 py-2 text-right text-sm text-text-primary focus:ring-2 focus:ring-primary-default focus:ring-inset"
                aria-describedby="discount-type-description"
              />
              <div className="flex border-l border-border-default" role="group" aria-label="Discount type">
                <button
                  type="button"
                  onClick={() => onSetDiscountType('amount')}
                  className={`px-3 py-2 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default ${
                    discountType === 'amount'
                      ? 'bg-primary-default text-primary-on'
                      : 'bg-surface-default text-text-secondary hover:bg-background-subtle'
                  }`}
                  aria-pressed={discountType === 'amount'}
                  aria-label="Discount in Taka"
                >
                  ৳
                </button>
                <button
                  type="button"
                  onClick={() => onSetDiscountType('percentage')}
                  className={`px-3 py-2 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default ${
                    discountType === 'percentage'
                      ? 'bg-primary-default text-primary-on'
                      : 'bg-surface-default text-text-secondary hover:bg-background-subtle'
                  }`}
                  aria-pressed={discountType === 'percentage'}
                  aria-label="Discount in percentage"
                >
                  %
                </button>
              </div>
            </div>
          </div>
          <p id="discount-type-description" className="sr-only">
            Choose discount type: Taka amount or percentage
          </p>
        </div>

        {/* Total */}
        <div className="billing-total flex justify-between items-center py-3 border-t border-border-default mt-3">
          <span className="text-text-primary font-semibold">Total Amount</span>
          <span className="text-success-dark font-bold text-lg">
            ৳{totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Continue Button */}
        <button
          className="button-primary w-full mt-4 py-3 px-4 bg-primary-default text-primary-on font-semibold rounded-md hover:bg-primary-hover disabled:bg-text-muted disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
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
            'Continue Billing'
          )}
        </button>
      </div>
    </>
  );
}