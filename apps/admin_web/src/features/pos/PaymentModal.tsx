import { clsx } from 'clsx';
import { Banknote, Smartphone, CreditCard, Wallet, PlusCircle, AlertCircle, X, RefreshCw } from 'lucide-react';

function getPaymentIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cash')) return Banknote;
  if (lower.includes('bkash') || lower.includes('bkash') || lower.includes('mobile')) return Smartphone;
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
  if (!show) return null;

  return (
    <div className="payment-modal" onClick={onClose}>
      <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ margin: 0 }}>Payment</h2>
          <button
            className="button-secondary"
            onClick={onClose}
            style={{ padding: 'var(--space-2)', minWidth: 36, minHeight: 36 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle: Single / Split */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <button
            className={clsx(!isSplitMode && 'button-primary', isSplitMode && 'button-outline')}
            onClick={() => { onSetIsSplitMode(false); }}
            style={{ flex: 1 }}
          >
            <Banknote size={16} style={{ marginRight: 'var(--space-1)' }} />
            Single Payment
          </button>
          <button
            className={clsx(isSplitMode && 'button-primary', !isSplitMode && 'button-outline')}
            onClick={() => { onSetIsSplitMode(true); onSelectPaymentMethod(null); onSetPaymentAmount(''); }}
            style={{ flex: 1 }}
          >
            <PlusCircle size={16} style={{ marginRight: 'var(--space-1)' }} />
            Split Payment
          </button>
        </div>

        {/* Total Amount */}
        <div className="payment-section">
          <span className="payment-section-label">Total Amount</span>
          <div className="payment-total-display">৳{totalAmount.toFixed(2)}</div>
        </div>

        {!isSplitMode ? (
          <>
            {/* Payment Method Selector */}
            <div className="payment-section">
              <span className="payment-section-label">Payment Method</span>
              <div className="payment-methods-grid">
                {paymentMethods.map((method: any) => {
                  const Icon = getPaymentIcon(method.name);
                  return (
                    <button
                      key={method.id}
                      className={clsx('payment-method-chip', selectedPaymentMethod === method.id && 'selected')}
                      onClick={() => onSelectPaymentMethod(method.id)}
                    >
                      <span className="payment-method-icon"><Icon size={16} /></span>
                      {method.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="payment-section">
              <span className="payment-section-label">Quick Amount</span>
              <div className="quick-amount-grid">
                <button className="quick-amount-btn" onClick={() => onQuickAmount(100)}>৳100</button>
                <button className="quick-amount-btn" onClick={() => onQuickAmount(500)}>৳500</button>
                <button className="quick-amount-btn" onClick={() => onQuickAmount(1000)}>৳1000</button>
                <button className="quick-amount-btn exact" onClick={() => onQuickAmount(Math.ceil(totalAmount))}>Exact</button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="payment-section">
              <span className="payment-section-label">Amount Tendered</span>
              <input
                type="number"
                className="payment-input"
                value={paymentAmount}
                onChange={(e) => onSetPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            {/* Change Calculation */}
            {paidTotal > 0 && (
              <div className="change-display">
                <div className="change-label">Change</div>
                <div className="change-amount">৳{changeAmount.toFixed(2)}</div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Split Payment: Already added payments */}
            {splitPayments.length > 0 && (
              <div className="payment-section">
                <span className="payment-section-label">Payments Added</span>
                <div className="split-payment-list">
                  {splitPayments.map((sp) => {
                    const m = paymentMethods.find((pm: any) => pm.id === sp.accountId);
                    const Icon = getPaymentIcon(m?.name || '');
                    return (
                      <div key={sp.id} className="split-payment-item">
                        <div className="split-payment-info">
                          <Icon size={16} />
                          <span>{m?.name || 'Unknown'}</span>
                        </div>
                        <div className="split-payment-amount">৳{sp.amount.toFixed(2)}</div>
                        <button
                          className="button-danger"
                          onClick={() => onRemoveSplitPayment(sp.id)}
                          style={{ marginLeft: 'var(--space-2)', padding: '2px 6px', minHeight: 28, minWidth: 28 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Remaining amount */}
            {remainingAmount > 0 && (
              <div className="split-remaining">
                <span className="split-remaining-label">Remaining</span>
                <span className="split-remaining-amount">৳{remainingAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Add split payment form */}
            {remainingAmount > 0 && (
              <>
                <div className="payment-section">
                  <span className="payment-section-label">Add Payment</span>
                  <div className="payment-methods-grid">
                    {paymentMethods.map((method: any) => {
                      const Icon = getPaymentIcon(method.name);
                      return (
                        <button
                          key={method.id}
                          className={clsx('payment-method-chip', splitMethod === method.id && 'selected')}
                          onClick={() => onSetSplitMethod(method.id)}
                        >
                          <span className="payment-method-icon"><Icon size={16} /></span>
                          {method.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {splitMethod && (
                  <div className="payment-section">
                    <span className="payment-section-label">Amount</span>
                    <input
                      type="number"
                      className="payment-input"
                      value={splitAmount}
                      onChange={(e) => onSetSplitAmount(e.target.value)}
                      placeholder={`Max: ৳${remainingAmount.toFixed(2)}`}
                    />
                    <button
                      className="button-primary"
                      onClick={onAddSplitPayment}
                      disabled={!splitMethod || !splitAmount || parseFloat(splitAmount) <= 0 || parseFloat(splitAmount) > remainingAmount}
                      style={{ marginTop: 'var(--space-2)', width: '100%' }}
                    >
                      <PlusCircle size={16} style={{ marginRight: 'var(--space-1)' }} />
                      Add Payment
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Change Calculation for split */}
            {splitPayments.length > 0 && paidTotal >= totalAmount && (
              <div className="change-display">
                <div className="change-label">Change</div>
                <div className="change-amount">৳{changeAmount.toFixed(2)}</div>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="payment-footer">
          <button className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button-primary"
            onClick={onCheckout}
            disabled={isProcessing || (isSplitMode ? splitPayments.length === 0 || remainingAmount > 0 : !selectedPaymentMethod || !paymentAmount)}
          >
            {isProcessing ? (
              <><RefreshCw size={16} className="animate-spin" style={{ marginRight: 'var(--space-1)' }} /> Processing...</>
            ) : (
              'Complete Sale'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}