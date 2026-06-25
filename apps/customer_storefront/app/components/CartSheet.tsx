'use client'; // cart modal dialog with useRef, useEffect, router, and cart context

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCartContext } from './CartProvider';
import { useToast } from './Toast';
import { Button } from './ui/Button';
import { QtyNumber } from './ui/QtyNumber';
import { formatBdt } from '../lib/formatPrice';

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CartSheet({ open, onClose }: CartSheetProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, updateQty, removeFromCart, undoRemove, totalItems, subtotal, deliveryFee, total } = useCartContext();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleRemove = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
    showToast(`Removed ${itemName} from cart`, { label: 'Undo', onClick: undoRemove }, 4000);
  };

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
          <div className="w-10 h-1 bg-warm-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-lg font-extrabold tracking-tight">
            Cart <span className="text-warm-muted font-semibold text-sm ml-1">({totalItems})</span>
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-warm-border-light grid place-items-center text-warm-muted hover:bg-warm-border-light transition-colors text-sm"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-warm-muted text-sm">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-11 h-11 bg-warm-border-light rounded-[10px] grid place-items-center text-xl flex-shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-warm-muted">{formatBdt(item.price)} / {item.unit}</p>
                    <button
                      onClick={() => handleRemove(item.id, item.name)}
                      className="text-[10px] text-red-500 mt-0.5 inline-flex items-center gap-1 hover:text-red-600 transition-colors min-h-[24px]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-11 h-11 rounded-md border border-warm-border bg-warm-bg flex items-center justify-center text-sm font-semibold hover:border-warm-accent hover:text-warm-fg transition-colors"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <QtyNumber qty={item.qty} className="font-bold text-sm min-w-[20px] text-center" />
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-11 h-11 rounded-md border border-warm-border bg-warm-bg flex items-center justify-center text-sm font-semibold hover:border-warm-accent hover:text-warm-fg transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-sm min-w-[50px] text-right">{formatBdt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-warm-border-light px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-warm-muted uppercase tracking-widest font-semibold mb-0.5">
                {totalItems} items {deliveryFee === 0 && '· Free delivery'}
              </p>
              <p className="text-xl font-extrabold">{formatBdt(total)}</p>
            </div>
            <Button
              onClick={() => { onClose(); router.push('/checkout'); }}
              className="flex-0 w-[140px]"
              data-testid="sheet-checkout-btn"
            >
              Checkout →
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
