'use client'; // cart modal dialog with useRef, useEffect, router, and cart context

import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  const [closing, setClosing] = useState(false);

  const handleRemove = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
    showToast(`Removed ${itemName} from cart`, { label: 'Undo', onClick: undoRemove }, 4000);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setClosing(false);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      setClosing(true);
    }
  }, [open]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      onClose();
      setClosing(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="
        fixed inset-0 m-0 p-0
        w-full max-w-full h-full max-h-full
        bg-transparent
        backdrop:bg-warm-fg/40 backdrop:backdrop-blur-sm
        md:backdrop:bg-transparent
        md:justify-end md:items-stretch
      "
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Sheet panel — bottom sheet on mobile, right-side panel on desktop */}
      <div
        className={`
          fixed bottom-0 left-0 right-0
          bg-warm-surface rounded-t-[20px]
          shadow-[0_-8px_40px_rgba(11,11,13,0.12)]
          max-h-[70vh] overflow-hidden
          flex flex-col
          transition-transform duration-300 ease-[var(--ease-drawer)]
          ${open && !closing ? 'translate-y-0' : 'translate-y-full'}
          md:top-0 md:right-0 md:left-auto md:bottom-0
          md:w-[420px] md:max-w-full md:max-h-full
          md:rounded-none md:rounded-l-[20px]
          md:shadow-[-8px_0_40px_rgba(11,11,13,0.12)]
          md:translate-y-0
          ${open && !closing ? 'md:translate-x-0' : 'md:translate-x-full'}
        `}
      >
        {/* Handle — now static visual indicator only */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
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
            <X weight="bold" size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {cart.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-warm-muted text-sm">Your cart is empty.</p>
              <Link
                href="/category"
                onClick={onClose}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-warm-accent px-5 py-2.5 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover"
              >
                Browse groceries
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 px-1 rounded-xl hover:bg-warm-bg/50 transition-colors"
                >
                  {/* Product image or emoji fallback */}
                  <div className="w-12 h-12 rounded-xl bg-warm-bg overflow-hidden flex-shrink-0 grid place-items-center relative">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-xl">{item.emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px] truncate text-warm-fg">{item.name}</p>
                    <p className="text-xs text-warm-muted">{formatBdt(item.price)} / {item.unit}</p>
                    <button
                      onClick={() => handleRemove(item.id, item.name)}
                      className="text-xs text-warm-danger mt-0.5 inline-flex items-center gap-1 hover:text-warm-danger-dark transition-colors min-h-[28px] px-0.5"
                      aria-label={`Remove ${item.name}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-9 h-9 rounded-lg border border-warm-border bg-warm-bg flex items-center justify-center text-sm font-semibold hover:border-warm-accent hover:text-warm-fg transition-colors active:scale-95"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <QtyNumber qty={item.qty} className="font-bold text-sm min-w-[20px] text-center" />
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-9 h-9 rounded-lg border border-warm-border bg-warm-bg flex items-center justify-center text-sm font-semibold hover:border-warm-accent hover:text-warm-fg transition-colors active:scale-95"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-sm min-w-[55px] text-right text-warm-fg">{formatBdt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-warm-border-light px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-warm-muted uppercase tracking-widest font-semibold mb-0.5">
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
