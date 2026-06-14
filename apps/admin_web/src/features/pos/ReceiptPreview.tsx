import { useRef, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { CartItem } from '../../lib/api/types';

interface ReceiptConfig {
  store_name: string;
  header_text: string;
  footer_text: string;
}

interface ReceiptPreviewProps {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  saleNumber?: string;
  batchId?: string;
  receiptConfig: ReceiptConfig | null;
  onClose: () => void;
}

function formatDate(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatPrice(amount: number): string {
  return `৳${amount.toFixed(2)}`;
}

export function ReceiptPreview({
  cart,
  subtotal,
  discount,
  totalAmount,
  paymentMethod,
  paidAmount,
  changeAmount,
  saleNumber,
  batchId: _batchId,
  receiptConfig,
  onClose,
}: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const storeName = receiptConfig?.store_name || 'Lucky Store';
  const headerText = receiptConfig?.header_text || '';
  const footerText = receiptConfig?.footer_text || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-modal-header">
          <h2>Sale Complete</h2>
          <div className="receipt-modal-actions">
            <button className="button-primary" onClick={handlePrint}>
              <Printer size={16} /> Print Receipt
            </button>
            <button className="button-outline" onClick={onClose}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {saleNumber && (
          <div className="receipt-sale-number">
            Sale #{saleNumber}
          </div>
        )}

        <div className="receipt-scroll-area">
          <div className="receipt-paper" ref={receiptRef}>
            <div className="receipt-content">
              {headerText && (
                <div className="receipt-header-msg">{headerText}</div>
              )}

              <div className="receipt-store-name">{storeName}</div>
              <div className="receipt-divider" />

              <div className="receipt-date">{formatDate()}</div>
              {saleNumber && (
                <div className="receipt-sale-id">Ref: {saleNumber}</div>
              )}

              <div className="receipt-divider receipt-divider--dashed" />

              <div className="receipt-items">
                {cart.map((item) => (
                  <div key={item.product.id} className="receipt-item">
                    <div className="receipt-item-name">{item.product.name}</div>
                    <div className="receipt-item-detail">
                      <span>{formatPrice(item.unitPrice)} × {item.qty}</span>
                      <span className="receipt-item-total">{formatPrice(item.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt-divider receipt-divider--dashed" />

              <div className="receipt-totals">
                <div className="receipt-total-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="receipt-total-row receipt-total-row--discount">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="receipt-divider receipt-divider--dashed" />
                <div className="receipt-total-row receipt-total-row--grand">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Payment ({paymentMethod})</span>
                  <span>{formatPrice(paidAmount)}</span>
                </div>
                {changeAmount > 0 && (
                  <div className="receipt-total-row receipt-total-row--change">
                    <span>Change</span>
                    <span>{formatPrice(changeAmount)}</span>
                  </div>
                )}
              </div>

              {footerText && (
                <>
                  <div className="receipt-divider receipt-divider--dashed" />
                  <div className="receipt-footer-msg">{footerText}</div>
                </>
              )}

              <div className="receipt-divider" />
              <div className="receipt-thankyou">Thank you for shopping!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}