import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { createDebugLogger } from '../../lib/debug';
import type { CartItem } from '../../lib/api/types';

const debugLog = createDebugLogger('QuickPosPage');

interface SplitPaymentEntry {
  id: string;
  accountId: string;
  amount: number;
}

interface CompletedSale {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  saleNumber?: string;
  batchId?: string;
}

interface UsePosSaleReturn {
  isProcessing: boolean;
  showPaymentModal: boolean;
  selectedPaymentMethod: string | null;
  paymentAmount: string;
  splitPayments: SplitPaymentEntry[];
  isSplitMode: boolean;
  splitMethod: string | null;
  splitAmount: string;
  completedSale: CompletedSale | null;
  paidTotal: number;
  changeAmount: number;
  remainingAmount: number;
  setShowPaymentModal: (show: boolean) => void;
  setSelectedPaymentMethod: (method: string | null) => void;
  setPaymentAmount: (amount: string) => void;
  setIsSplitMode: (mode: boolean) => void;
  setSplitMethod: (method: string | null) => void;
  setSplitAmount: (amount: string) => void;
  addSplitPayment: () => void;
  removeSplitPayment: (id: string) => void;
  handleQuickAmount: (amount: number) => void;
  resetPaymentModal: () => void;
  handleCheckout: () => Promise<void>;
}

export function usePosSale(
  cart: CartItem[],
  totalAmount: number,
  subtotal: number,
  cartDiscount: number,
  storeId: string | undefined,
  tenantId: string | undefined,
  paymentMethods: any[],
  clearCart: () => void,
  onError: (msg: string) => void,
): UsePosSaleReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([]);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitMethod, setSplitMethod] = useState<string | null>(null);
  const [splitAmount, setSplitAmount] = useState('');
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  const paidTotal = isSplitMode
    ? splitPayments.reduce((sum, p) => sum + p.amount, 0)
    : (parseFloat(paymentAmount) || 0);
  const changeAmount = Math.max(0, paidTotal - totalAmount);
  const remainingAmount = isSplitMode
    ? Math.max(0, totalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0))
    : 0;

  const addSplitPayment = useCallback(() => {
    if (!splitMethod) return;
    const amount = parseFloat(splitAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (remainingAmount > 0 && amount > remainingAmount) return;
    setSplitPayments(prev => [...prev, { id: crypto.randomUUID(), accountId: splitMethod, amount }]);
    setSplitMethod(null);
    setSplitAmount('');
  }, [splitMethod, splitAmount, remainingAmount]);

  const removeSplitPayment = useCallback((id: string) => {
    setSplitPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const resetPaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod(null);
    setPaymentAmount('');
    setIsSplitMode(false);
    setSplitPayments([]);
    setSplitMethod(null);
    setSplitAmount('');
  }, []);

  const handleQuickAmount = useCallback((amount: number) => {
    setPaymentAmount(String(amount));
  }, []);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) {
      onError('Cart is empty');
      return;
    }

    if (isSplitMode) {
      if (splitPayments.length === 0) {
        onError('Please add at least one payment');
        return;
      }
      const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < totalAmount) {
        onError(`Insufficient payment. Remaining: ৳${(totalAmount - totalPaid).toFixed(2)}`);
        return;
      }
    } else {
      if (!selectedPaymentMethod || !paymentAmount) {
        onError('Please select payment method and enter amount');
        return;
      }
      const paid = parseFloat(paymentAmount);
      if (isNaN(paid) || paid < totalAmount) {
        onError(`Insufficient payment. Total: ৳${totalAmount.toFixed(2)}`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      for (const cartItem of cart) {
        const fresh = storeId ? await api.pos.lookupByScan(cartItem.product.sku || cartItem.product.id, storeId) : null;
        if (!fresh || fresh.stock < cartItem.qty) {
          onError(`${cartItem.product.name} is now out of stock. Please adjust quantity.`);
          setIsProcessing(false);
          return;
        }
      }

      let payments: Array<{ account_id: string; amount: number; party_id: string | null }>;
      let paidTotalInner: number;
      let paymentMethodLabel: string;

      if (isSplitMode) {
        payments = splitPayments.map(p => ({
          account_id: p.accountId,
          amount: p.amount,
          party_id: null,
        }));
        paidTotalInner = splitPayments.reduce((sum, p) => sum + p.amount, 0);
        paymentMethodLabel = splitPayments.map(p => {
          const m = paymentMethods.find((m: any) => m.id === p.accountId);
          return m ? m.name : 'Unknown';
        }).join(' + ');
      } else {
        payments = [{
          account_id: selectedPaymentMethod!,
          amount: parseFloat(paymentAmount),
          party_id: null,
        }];
        paidTotalInner = parseFloat(paymentAmount);
        paymentMethodLabel = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)?.name || 'Cash';
      }

      const saleData = {
        idempotencyKey: crypto.randomUUID(),
        tenantId: tenantId || '',
        storeId: storeId || '',
        items: cart.map(item => ({
          item_id: item.product.id,
          quantity: item.qty,
          unit_price: item.unitPrice,
        })),
        payments,
        notes: null,
      };

      debugLog('Sale payload', saleData);

      const result = await api.pos.createSale(saleData);
      debugLog('Sale result', result);

      if (result.status === 'success') {
        const change = paidTotalInner - totalAmount;

        setCompletedSale({
          cart: [...cart],
          subtotal,
          discount: cartDiscount,
          totalAmount,
          paymentMethod: paymentMethodLabel,
          paidAmount: paidTotalInner,
          changeAmount: change,
          saleNumber: result.saleNumber || result.batchId,
          batchId: result.batchId,
        });

        clearCart();
        resetPaymentModal();
      } else {
        onError(result.error || 'Sale failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[QuickPosPage] Checkout error:', err);
      onError(err.message || 'Sale failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [cart, storeId, tenantId, isSplitMode, selectedPaymentMethod, paymentAmount, splitPayments, totalAmount, subtotal, cartDiscount, paymentMethods, clearCart, resetPaymentModal, onError]);

  return {
    isProcessing,
    showPaymentModal,
    selectedPaymentMethod,
    paymentAmount,
    splitPayments,
    isSplitMode,
    splitMethod,
    splitAmount,
    completedSale,
    paidTotal,
    changeAmount,
    remainingAmount,
    setShowPaymentModal,
    setSelectedPaymentMethod,
    setPaymentAmount,
    setIsSplitMode,
    setSplitMethod,
    setSplitAmount,
    addSplitPayment,
    removeSplitPayment,
    handleQuickAmount,
    resetPaymentModal,
    handleCheckout,
  };
}