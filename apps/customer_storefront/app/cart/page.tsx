'use client'; // needs useRouter and cart state/quantity controls

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useCartContext } from '../components/CartProvider';
import { Button } from '../components/ui/Button';
import { PriceDisplay } from '../components/PriceDisplay';
import { EmptyCartIcon } from '../components/icons';
import { formatBdt } from '../lib/formatPrice';

function CartContent() {
  const router = useRouter();
  const { cart, updateQty, removeFromCart, totalItems, subtotal, deliveryFee, discount, total } = useCartContext();

  const isEmpty = cart.length === 0;

  return (
    <>
      <Header />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        <div className="p-[18px]">
          <h2 className="text-lg font-bold tracking-tight mb-3">Cart</h2>

          {isEmpty ? (
            <div className="text-center py-16">
              <div className="flex items-center justify-center mb-4">
                <EmptyCartIcon size={64} className="text-[#d6d3d1]" />
              </div>
              <h3 className="text-lg font-bold mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-500 mb-6">Add items from the store to get started</p>
              <Button onClick={() => router.push('/')} className="max-w-[220px] mx-auto">
                Browse Products
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3 mb-5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#e7e5e4] rounded-[14px] p-3.5 flex items-center gap-3.5"
                  >
                    <div className="w-[60px] h-[60px] bg-[#f5f3f0] rounded-[10px] grid place-items-center text-[30px] flex-shrink-0">
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1 truncate">{item.name}</p>
                      <p className="text-[13px] text-gray-500">
                        <PriceDisplay value={item.price} unit={item.unit} />
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-xs text-red-500 mt-0.5 hover:text-red-600 transition-colors"
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-9 h-9 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#ffe302] hover:text-[#1c1917] transition-colors"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="font-bold text-sm min-w-[24px] text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-9 h-9 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#ffe302] hover:text-[#1c1917] transition-colors"
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
              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-[18px] mb-5">
                <div className="flex justify-between mb-2.5 text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatBdt(subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2.5 text-sm text-gray-500">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : formatBdt(deliveryFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between mb-2.5 text-sm text-[#1c1917]">
                    <span>Discount (FREE500)</span>
                    <span>−{formatBdt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-[#f5f5f4] text-lg font-extrabold text-[#1c1917]">
                  <span>Total</span>
                  <span>{formatBdt(total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Cash on Delivery · Pay when you receive</p>
              </div>

              {/* Checkout CTA — inline, not fixed, avoids bottom-bar collision */}
              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-[18px] flex items-center gap-3.5 mb-5">
                <div className="flex-1">
                  <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
                    {totalItems} items
                  </p>
                  <p className="text-xl font-extrabold">{formatBdt(total)}</p>
                </div>
                <Button
                  onClick={() => router.push('/checkout')}
                  className="flex-0 w-[140px]"
                  data-testid="cart-checkout-btn"
                >
                  Checkout →
                </Button>
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
