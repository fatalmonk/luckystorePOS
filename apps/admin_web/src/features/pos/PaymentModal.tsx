import { clsx } from 'clsx';
import { Banknote, Smartphone, CreditCard, Wallet, PlusCircle, AlertCircle, X, RefreshCw, Delete } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function getPaymentIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cash')) return Banknote;
  if (lower.includes('bkash') || lower.includes('nagad') || lower.includes('mobile')) return Smartphone;
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return CreditCard;
  return Wallet;
}

interface PaymentModalProps {
  show: boolean;
  totalAmount: number;
  isProcessing: boolean;
  isSplitMode: boolean;
  selectedPaymentMethod: string | null;
  paymentAmount: string;
  splitPayments: Array<{ id: string; accountId: string; amount: number }>;
  splitMethod: string | null;
  splitAmount: string;
  paymentMethods: any[];
  paidTotal: number;
  changeAmount: number;
  remainingAmount: number;
  error: string | null;
  onClose: () => void;
  onSetIsSplitMode: (mode: boolean) => void;
  onSelectPaymentMethod: (method: string | null) => void;
  onSetPaymentAmount: (amount: string) => void;
  onSetSplitMethod: (method: string | null) => void;
  onSetSplitAmount: (amount: string) => void;
  onAddSplitPayment: () => void;
  onRemoveSplitPayment: (id: string) => void;
  onQuickAmount: (amount: number) => void;
  onCheckout: () => void;
}

export function PaymentModal({
  show,
  totalAmount,
  isProcessing,
  isSplitMode,
  selectedPaymentMethod,
  paymentAmount,
  splitPayments,
  splitMethod,
  splitAmount,
  paymentMethods,
  paidTotal,
  changeAmount,
  remainingAmount,
  error,
  onClose,
  onSetIsSplitMode,
  onSelectPaymentMethod,
  onSetPaymentAmount,
  onSetSplitMethod,
  onSetSplitAmount,
  onAddSplitPayment,
  onRemoveSplitPayment,
  onQuickAmount,
  onCheckout,
}: PaymentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [previousActiveElement, setPreviousActiveElement] = useState<Element | null>(null);

  // Store previous focus and focus modal when opened
  useEffect(() => {
    if (show) {
      setPreviousActiveElement(document.activeElement);
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [show]);

  // Restore focus when closed
  useEffect(() => {
    if (!show && previousActiveElement) {
      (previousActiveElement as HTMLElement)?.focus();
    }
  }, [show, previousActiveElement]);

  // Focus trap
  useEffect(() => {
    if (!show) return;
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [show]);

  if (!show) return null;

  const handleNumpadInput = (key: string) => {
    const current = isSplitMode ? splitAmount : paymentAmount;
    const updateFn = isSplitMode ? onSetSplitAmount : onSetPaymentAmount;
    
    if (key === '⌫') {
      const updated = current.slice(0, -1);
      updateFn(updated);
    } else {
      if (key === '.' && current.includes('.')) return;
      if (current === '0' && key !== '.') {
        updateFn(key);
      } else {
        updateFn(current + key);
      }
    }
  };

  return (
    <div 
      className="payment-modal fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4" 
      onClick={onClose} 
      role="presentation"
    >
      <div 
        className="payment-modal-content bg-surface-default border border-border-default rounded-xl w-full max-w-4xl p-6 shadow-2xl flex flex-col gap-4 overflow-hidden max-h-[90vh]" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light pb-3 shrink-0">
          <h2 id="payment-modal-title" className="text-xl font-bold text-text-primary m-0">
            Payment Checkout
          </h2>
          <button
            ref={closeButtonRef}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-md hover:bg-background-subtle transition-colors shrink-0"
            onClick={onClose}
            aria-label="Close payment dialog"
            type="button"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Mode Toggle: Single / Split */}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            className={clsx(
              'flex-1 py-2.5 px-4 font-semibold rounded-md border text-sm flex items-center justify-center gap-2 transition-all',
              !isSplitMode 
                ? 'bg-primary text-primary-on border-primary shadow-sm' 
                : 'bg-surface-default hover:bg-background-subtle border-border-default text-text-secondary'
            )}
            onClick={() => { onSetIsSplitMode(false); }}
          >
            <Banknote size={16} />
            Single Payment
          </button>
          <button
            type="button"
            className={clsx(
              'flex-1 py-2.5 px-4 font-semibold rounded-md border text-sm flex items-center justify-center gap-2 transition-all',
              isSplitMode 
                ? 'bg-primary text-primary-on border-primary shadow-sm' 
                : 'bg-surface-default hover:bg-background-subtle border-border-default text-text-secondary'
            )}
            onClick={() => { onSetIsSplitMode(true); onSelectPaymentMethod(null); onSetPaymentAmount(''); }}
          >
            <PlusCircle size={16} />
            Split Payment
          </button>
        </div>

        {/* Core Layout: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-y-auto pr-1">
          {/* Left Column: Total, Payment Methods, Quick Amounts */}
          <div className="flex flex-col gap-4">
            {/* Total Amount Display */}
            <div className="bg-background-subtle border border-border-light rounded-lg p-4 text-center shrink-0">
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block">
                Total Amount Due
              </span>
              <span className="text-3xl font-extrabold text-text-primary block mt-1">
                ৳{totalAmount.toFixed(2)}
              </span>
            </div>

            {/* Split Mode Payments List */}
            {isSplitMode && splitPayments.length > 0 && (
              <div className="border border-border-light rounded-lg p-3 shrink-0">
                <span className="text-xs text-text-secondary font-bold uppercase tracking-wider block mb-2">
                  Payments Added
                </span>
                <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                  {splitPayments.map((sp) => {
                    const m = paymentMethods.find((pm: any) => pm.id === sp.accountId);
                    const Icon = getPaymentIcon(m?.name || '');
                    return (
                      <div key={sp.id} className="flex items-center justify-between bg-surface-default border border-border-light p-2 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-text-primary font-semibold">
                          <Icon size={16} className="text-text-muted" />
                          <span>{m?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text-primary">৳{sp.amount.toFixed(2)}</span>
                          <button
                            type="button"
                            className="text-danger-default hover:text-danger-dark p-1 rounded hover:bg-danger-subtle transition-colors"
                            onClick={() => onRemoveSplitPayment(sp.id)}
                            aria-label="Remove payment"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Split Remaining */}
            {isSplitMode && remainingAmount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center shrink-0">
                <span className="text-xs text-orange-700 font-bold block">
                  Remaining Amount to Pay
                </span>
                <span className="text-xl font-bold text-orange-800 block mt-0.5">
                  ৳{remainingAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Payment Methods */}
            <div className="shrink-0">
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block mb-2">
                {isSplitMode ? 'Add Payment Method' : 'Select Payment Method'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method: any) => {
                  const Icon = getPaymentIcon(method.name);
                  const isSelected = isSplitMode ? splitMethod === method.id : selectedPaymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      className={clsx(
                        'flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-all',
                        isSelected 
                          ? 'border-primary bg-primary-subtle text-primary' 
                          : 'border-border-default hover:border-border-strong bg-surface-default text-text-primary'
                      )}
                      onClick={() => isSplitMode ? onSetSplitMethod(method.id) : onSelectPaymentMethod(method.id)}
                    >
                      <Icon size={20} className={clsx(isSelected ? 'text-primary' : 'text-text-secondary')} />
                      <span className="font-semibold text-sm">{method.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Amounts */}
            {!isSplitMode && (
              <div className="shrink-0">
                <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block mb-2">
                  Quick Amount Tendered
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button type="button" className="py-2.5 font-bold text-sm bg-background-subtle hover:bg-border-default active:scale-95 rounded-md border border-border-light text-text-primary transition-all cursor-pointer" onClick={() => onQuickAmount(100)}>৳100</button>
                  <button type="button" className="py-2.5 font-bold text-sm bg-background-subtle hover:bg-border-default active:scale-95 rounded-md border border-border-light text-text-primary transition-all cursor-pointer" onClick={() => onQuickAmount(500)}>৳500</button>
                  <button type="button" className="py-2.5 font-bold text-sm bg-background-subtle hover:bg-border-default active:scale-95 rounded-md border border-border-light text-text-primary transition-all cursor-pointer" onClick={() => onQuickAmount(1000)}>৳1K</button>
                  <button type="button" className="py-2.5 font-bold text-sm bg-success text-white hover:bg-success-dark active:scale-95 rounded-md transition-all cursor-pointer shadow-sm" onClick={() => onQuickAmount(Math.ceil(totalAmount))}>Exact</button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Amount input, Numpad, Change calculation, and Checkout Button */}
          <div className="flex flex-col gap-4">
            {/* Amount input & value display */}
            <div>
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider block mb-2">
                Amount Tendered
              </span>
              <div className="flex items-center bg-background-subtle border border-border-default rounded-lg px-4 py-2">
                <span className="text-xl font-bold text-text-secondary mr-2">৳</span>
                <input
                  type="text"
                  className="bg-transparent border-none outline-none w-full text-right text-2xl font-bold text-text-primary pr-1 font-mono"
                  value={isSplitMode ? splitAmount : paymentAmount}
                  readOnly
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Numpad */}
            <div className="flex-1 flex flex-col justify-center min-h-[220px]">
              <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs mx-auto">
                {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="numpad-key aspect-[4/3] text-base font-bold bg-background-subtle hover:bg-border-default active:bg-border-strong rounded-md flex items-center justify-center border border-border-light transition-all cursor-pointer"
                    onClick={() => handleNumpadInput(key)}
                    style={{ height: '48px', minHeight: '48px' }}
                  >
                    {key === '⌫' ? <Delete size={20} className="text-text-secondary" /> : key}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Mode: Add Payment Button */}
            {isSplitMode && remainingAmount > 0 && splitMethod && (
              <button
                type="button"
                className="w-full py-3 bg-primary text-primary-on text-sm font-bold rounded-md flex items-center justify-center gap-2 hover:bg-primary-hover active:scale-[0.98] transition-all"
                onClick={onAddSplitPayment}
                disabled={!splitAmount || parseFloat(splitAmount) <= 0 || parseFloat(splitAmount) > remainingAmount}
              >
                <PlusCircle size={16} />
                Add Split Payment (৳{splitAmount || '0.00'})
              </button>
            )}

            {/* Change display */}
            {!isSplitMode && paidTotal > 0 && (
              <div className="bg-success-subtle border border-success-default rounded-lg p-3 text-center shrink-0">
                <span className="text-xs text-success-dark font-semibold uppercase tracking-wider block">
                  Change to Return
                </span>
                <span className="text-2xl font-extrabold text-success-dark block mt-0.5">
                  ৳{changeAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Split Mode change display */}
            {isSplitMode && splitPayments.length > 0 && paidTotal >= totalAmount && (
              <div className="bg-success-subtle border border-success-default rounded-lg p-3 text-center shrink-0">
                <span className="text-xs text-success-dark font-semibold uppercase tracking-wider block">
                  Change to Return
                </span>
                <span className="text-2xl font-extrabold text-success-dark block mt-0.5">
                  ৳{changeAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-danger-subtle border border-danger-default rounded-lg p-3 flex items-center gap-2 text-danger-default text-xs shrink-0">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 border-t border-border-light pt-3 mt-auto shrink-0">
              <button 
                type="button"
                className="flex-1 py-3 px-4 font-bold border border-border-default text-text-secondary bg-surface-default hover:bg-background-subtle rounded-md transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-3 px-4 font-bold bg-primary text-primary-on hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center justify-center gap-2 shadow-sm transition-all"
                onClick={onCheckout}
                disabled={isProcessing || (isSplitMode ? splitPayments.length === 0 || remainingAmount > 0 : !selectedPaymentMethod || !paymentAmount)}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Sale'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}