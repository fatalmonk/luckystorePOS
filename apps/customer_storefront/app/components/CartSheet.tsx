'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCartContext } from './CartProvider';
import { Button } from './ui/Button';

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CartSheet({ open, onClose }: CartSheetProps) {
  const router = useRouter();
  const { cart, updateQty, totalItems, subtotal, deliveryFee, total } = useCartContext();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="
        fixed inset-0 m-0 p-0
        w-full max-w-full h-full max-h-full
        bg-transparent
        backdrop:bg-black/40 backdrop:backdrop-blur-sm
      "
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Sheet panel — slides up from bottom */}
      <div
        className={`
          fixed bottom-0 left-0 right-0
          bg-white rounded-t-[20px]
          shadow-[0_-8px_40px_rgba(28,25,23,0.12)]
          max-h-[70vh] overflow-hidden
          flex flex-col
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#d6d3d1] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-lg font-extrabold tracking-tight">
            Cart <span className="text-[#a8a29e] font-semibold text-sm ml-1">({totalItems})</span>
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f5f5f4] grid place-items-center text-[#78716c] hover:bg-[#e7e5e4] transition-colors text-sm"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#a8a29e] text-sm">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-11 h-11 bg-[#f5f3f0] rounded-[10px] grid place-items-center text-xl flex-shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-[#a8a29e]">৳{item.price} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-7 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#FFF34D] hover:text-[#5c5200] transition-colors"
                    >
                      −
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-7 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#FFF34D] hover:text-[#5c5200] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-sm min-w-[50px] text-right">৳{item.price * item.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#f5f5f4] px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-[#a8a29e] uppercase tracking-widest font-semibold mb-0.5">
                {totalItems} items {deliveryFee === 0 && '· Free delivery'}
              </p>
              <p className="text-xl font-extrabold">৳{total}</p>
            </div>
            <Button
              onClick={() => { onClose(); router.push('/checkout'); }}
              className="flex-0 w-[140px]"
            >
              Checkout →
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
