'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';
import { useCartContext } from '../components/CartProvider';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { QtyNumber } from '../components/ui/QtyNumber';
import { PriceDisplay } from '../components/PriceDisplay';
import { EmptyCartIcon } from '../components/icons';
import { formatBdt } from '../lib/formatPrice';

const PROMO_CODES: Record<string, { label: string; amount: number; minSubtotal: number }> = {
  FREE500: { label: 'FREE500', amount: 40, minSubtotal: 500 },
};

function CartContent() {
  const router = useRouter();
  const { cart, updateQty, removeFromCart, undoRemove, totalItems, subtotal, deliveryFee, discount, total, isLoaded } = useCartContext();
  const { showToast } = useToast();

  const handleRemove = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
    showToast(`Removed ${itemName} from cart`, { label: 'Undo', onClick: undoRemove }, 4000);
  };

  const isEmpty = isLoaded && cart.length === 0;

  // Skeleton during hydration to prevent flash of "empty cart"
  if (!isLoaded) {
    return (
      <>
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <div className="p-[18px]">
            <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3 mb-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-warm-border rounded-[14px] p-3.5 flex items-center gap-3.5">
                  <div className="w-[60px] h-[60px] bg-gray-200 rounded-[10px] animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-gray-200 rounded-md animate-pulse" />
                    <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-9 h-9 bg-gray-200 rounded-md animate-pulse" />
                  </div>
                  <div className="w-16 h-5 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-32 bg-white border border-warm-border rounded-[14px] animate-pulse" />
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        <div className="p-[18px]">
          <h2 className="text-lg font-bold tracking-tight mb-3">Cart</h2>

          {isEmpty ? (
            <div className="text-center py-16">
              <div className="flex items-center justify-center mb-4">
                <EmptyCartIcon size={64} className="text-warm-muted" />
              </div>
              <h3 className="text-lg font-bold mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-500 mb-6">Add items from the store to get started</p>
              <Button onClick={() => router.push('/')} className="max-w-[220px] mx-auto">
                Start Shopping
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3 mb-5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-warm-border rounded-[14px] p-3.5 flex items-center gap-3.5"
                  >
                    <div className="w-[60px] h-[60px] bg-warm-border-light rounded-[10px] grid place-items-center text-[30px] flex-shrink-0">
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1 truncate">{item.name}</p>
                      <p className="text-[13px] text-gray-500">
                        <PriceDisplay value={item.price} unit={item.unit} />
                      </p>
                      <button
                        onClick={() => handleRemove(item.id, item.name)}
                        className="text-xs text-red-500 mt-1 inline-flex items-center gap-1 hover:text-red-600 transition-colors min-h-[28px]"
                        aria-label={`Remove ${item.name}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-9 h-9 rounded-md border border-warm-border bg-warm-bg flex items-center justify-center text-sm font-semibold hover:border-warm-accent hover:text-warm-fg transition-colors"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                    <QtyNumber qty={item.qty} className="font-bold text-sm min-w-[24px] text-center" />
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-9 h-9 rounded-md border border-warm-border bg-warm-bg flex items-center justify-center text-sm font-semibold hover:border-warm-accent hover:text-warm-fg transition-colors"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-bold text-sm min-w-[60px] text-right">
                      <PriceDisplay value={item.price * item.qty} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-white border border-warm-border rounded-[14px] p-[18px] mb-5">
                <div className="flex justify-between mb-2.5 text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatBdt(subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2.5 text-sm text-gray-500">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : formatBdt(deliveryFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between mb-2.5 text-sm text-warm-fg">
                    <span>Discount (FREE500)</span>
                    <span>−{formatBdt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-warm-border-light text-lg font-extrabold text-warm-fg">
                  <span>Total</span>
                  <span>{formatBdt(total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Cash on Delivery · Pay when you receive</p>
              </div>

              {/* Checkout CTA */}
              <div className="bg-warm-fg text-white rounded-[14px] p-[18px] flex items-center gap-3.5 mb-5 shadow-sm">
                <div className="flex-1">
                  <p className="text-[11px] text-white/70 uppercase tracking-widest font-semibold mb-0.5">
                    {totalItems} items
                  </p>
                  <p className="text-xl font-extrabold">{formatBdt(total)}</p>
                </div>
                <Button
                  onClick={() => router.push('/checkout')}
                  className="flex-0 w-[140px] bg-white text-warm-fg hover:bg-gray-100"
                  data-testid="cart-checkout-btn"
                >
                  Checkout →
                </Button>
              </div>

              <div className="text-center mb-4">
                <button
                  onClick={() => router.push('/category')}
                  className="text-sm text-warm-muted hover:text-warm-fg font-medium underline underline-offset-2"
                >
                  ← Continue Shopping
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  );
}

export default function CartPage() {
  return <CartContent />;
}