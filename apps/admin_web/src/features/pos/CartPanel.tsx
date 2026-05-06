import { ShoppingCart, Trash2 } from 'lucide-react';
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
  return (
    <>
      <div className="billing-header">
        <h2>Billing Items ({itemCount})</h2>
        <button
          className="text-danger"
          onClick={onClearCart}
          disabled={cart.length === 0}
          style={{
            background: 'none',
            border: 'none',
            cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
            opacity: cart.length === 0 ? 0.5 : 1
          }}
        >
          Clear Items
        </button>
      </div>

      <div className="billing-items">
        {cart.length === 0 ? (
          <div style={{
            padding: 'var(--space-12)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <ShoppingCart size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
            <p>No items in cart</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className="billing-item">
              <div className="billing-item-info">
                <div className="billing-item-name">{item.product.name}</div>
                <div className="billing-item-price">
                  ৳{item.product.price.toFixed(2)} × {item.qty}
                </div>
              </div>
              <div className="billing-item-controls">
                <button
                  className="button-outline"
                  onClick={() => onUpdateQty(item.product.id, item.qty - 1)}
                  style={{ padding: '2px 8px' }}
                >
                  -
                </button>
                <span style={{ margin: '0 8px' }}>{item.qty}</span>
                <button
                  className="button-outline"
                  onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
                  style={{ padding: '2px 8px' }}
                >
                  +
                </button>
                <button
                  className="text-danger"
                  onClick={() => onRemoveFromCart(item.product.id)}
                  style={{
                    marginLeft: 'var(--space-2)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="billing-item-total">
                ৳{item.lineTotal.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="billing-summary">
        <div className="billing-row">
          <span>Sub Total</span>
          <span>৳{subtotal.toFixed(2)}</span>
        </div>
        <div className="billing-actions mt-2 mb-2">
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium text-text-muted">Discount:</span>
            <div className="flex border border-border-color rounded-md overflow-hidden bg-input flex-1">
              <input
                type="number"
                value={discountValue}
                onChange={(e) => onSetDiscountValue(e.target.value)}
                placeholder="0.00"
                className="bg-transparent border-none outline-none w-full px-3 py-1.5 text-right text-sm"
              />
              <button
                className={`px-3 py-1.5 text-sm font-bold border-l border-border-color ${discountType === 'amount' ? "bg-primary text-black" : "bg-card text-text-muted hover:bg-border-light"}`}
                onClick={() => onSetDiscountType('amount')}
              >
                ৳
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-bold border-l border-border-color ${discountType === 'percentage' ? "bg-primary text-black" : "bg-card text-text-muted hover:bg-border-light"}`}
                onClick={() => onSetDiscountType('percentage')}
              >
                %
              </button>
            </div>
          </div>
        </div>
        <div className="billing-total">
          <span>Total Amount</span>
          <span className="text-emerald-600 font-bold">
            ৳{totalAmount.toFixed(2)}
          </span>
        </div>
        <button
          className="button-primary w-full mt-4"
          onClick={onContinueBilling}
          disabled={cart.length === 0 || isProcessing}
          style={{
            opacity: cart.length === 0 || isProcessing ? 0.5 : 1,
            cursor: cart.length === 0 || isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? 'Processing...' : 'Continue Billing'}
        </button>
      </div>
    </>
  );
}