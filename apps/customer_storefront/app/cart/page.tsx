'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ToastProvider } from '../components/Toast';
import { CartProvider, useCartContext } from '../components/CartProvider';
import { Button } from '../components/ui/Button';

function CartContent() {
  const router = useRouter();
  const { cart, updateQty, totalItems, subtotal, deliveryFee, discount, total } = useCartContext();

  const isEmpty = cart.length === 0;

  return (
    <>
      <Header cartCount={totalItems} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <div className="p-[18px]">
          <h2 className="text-lg font-bold tracking-tight mb-3">Cart</h2>

          {isEmpty ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 opacity-50">🛒</div>
              <h3 className="text-lg font-bold mb-2">Your cart is empty</h3>
              <p className="text-sm text-[#78716c] mb-6">Add items from the store to get started</p>
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
                      <p className="text-[13px] text-[#78716c]">
                        ৳{item.price} / {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-7 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#dc5f3b] hover:text-[#dc5f3b] transition-colors"
                      >
                        −
                      </button>
                      <span className="font-bold text-sm min-w-[24px] text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-7 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#dc5f3b] hover:text-[#dc5f3b] transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-bold text-sm min-w-[60px] text-right">
                      ৳{item.price * item.qty}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-white border border-[#e7e5e4] rounded-[14px] p-[18px] mb-5">
                <div className="flex justify-between mb-2.5 text-sm text-[#78716c]">
                  <span>Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex justify-between mb-2.5 text-sm text-[#78716c]">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `৳${deliveryFee}`}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between mb-2.5 text-sm text-[#dc5f3b]">
                    <span>Discount (FREE500)</span>
                    <span>−৳{discount}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-[#f5f5f4] text-lg font-extrabold text-[#1c1917]">
                  <span>Total</span>
                  <span>৳{total}</span>
                </div>
                <p className="text-xs text-[#a8a29e] mt-2">Cash on Delivery · Pay when you receive</p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Bottom Bar */}
      {!isEmpty && (
        <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e7e5e4] p-4 flex items-center gap-3.5 z-40">
          <div className="flex-1">
            <p className="text-[11px] text-[#a8a29e] uppercase tracking-widest font-semibold mb-0.5">
              {totalItems} items
            </p>
            <p className="text-xl font-extrabold">৳{total}</p>
          </div>
          <Button onClick={() => router.push('/checkout')} className="flex-0 w-[140px]">
            Checkout →
          </Button>
        </div>
      )}

      <BottomNav cartCount={totalItems} />
    </>
  );
}

export default function CartPage() {
  return (
    <ToastProvider>
      <CartProvider>
        <CartContent />
      </CartProvider>
    </ToastProvider>
  );
}
