import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { createDebugLogger } from '../../lib/debug';

const debugLog = createDebugLogger('QuickPosPage');
import { SkeletonBlock } from '../../components/PageState';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { Search, Plus, ScanLine, AlertCircle, X, Trash2, RefreshCw, ShoppingCart, ChevronUp, Banknote, Smartphone, CreditCard, Wallet, PlusCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { PosProduct, PosCategory, CartItem, PaymentInput } from '../../lib/api/types';
import { ReceiptPreview } from './ReceiptPreview';

import './receipt.css';

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

interface SplitPaymentEntry {
  id: string;
  accountId: string;
  amount: number;
}

function getPaymentIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cash') || lower.includes('cash')) return Banknote;
  if (lower.includes('bkash') || lower.includes('bKash') || lower.includes('mobile')) return Smartphone;
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return CreditCard;
  return Wallet;
}

export function QuickPosPage() {
  const { storeId, tenantId } = useAuth();

  // Realtime: refresh product list on stock_levels changes, warn if cart item goes out of stock
  useRealtimeSubscription({
    table: 'stock_levels',
    event: 'UPDATE',
    filter: storeId ? `store_id=eq.${storeId}` : undefined,
    invalidateKeys: [['pos-products', storeId]],
    onEvent: (payload) => {
      const newRecord = payload.new as Record<string, unknown> | undefined;
      if (newRecord && typeof newRecord.qty === 'number' && newRecord.qty <= 0) {
        const itemId = newRecord.item_id as string | undefined;
        if (itemId) {
          setCart(prev => {
            const item = prev.find(i => i.product.id === itemId);
            if (item) {
              setError(`⚠ ${item.product.name} is now out of stock!`);
              setTimeout(() => setError(null), 5000);
            }
            return prev;
          });
        }
      }
    },
  });

  // Realtime: refresh products when items table changes (add/edit/delete)
  useRealtimeSubscription({
    table: 'items',
    event: '*',
    invalidateKeys: [['pos-products', storeId], ['pos-categories', storeId]],
  });

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Search state with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<string>('');

  // Scanner state
  const [scanValue, setScanValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Checkout state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([]);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitMethod, setSplitMethod] = useState<string | null>(null);
  const [splitAmount, setSplitAmount] = useState('');

  // Mobile cart sheet
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const cartDiscount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      return (subtotal * val) / 100;
    }
    return val;
  }, [discountValue, discountType, subtotal]);
  const totalAmount = Math.max(0, subtotal - cartDiscount);

  // Derived: change calculation
  const paidTotal = isSplitMode
    ? splitPayments.reduce((sum, p) => sum + p.amount, 0)
    : (parseFloat(paymentAmount) || 0);
  const changeAmount = Math.max(0, paidTotal - totalAmount);
  const remainingAmount = isSplitMode
    ? Math.max(0, totalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0))
    : 0;

  // Receipt state
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories
  const { data: categories = [], isLoading: catLoading, error: catError } = useQuery({
    queryKey: ['pos-categories', storeId],
    queryFn: () => api.pos.getCategories(storeId),
    enabled: !!storeId,
  });

  // Fetch products
  const { data: products = [], isLoading: prodLoading, error: prodError } = useQuery({
    queryKey: ['pos-products', storeId, activeCategory, debouncedSearch],
    queryFn: () => api.pos.getProducts(storeId, debouncedSearch, activeCategory || undefined),
    enabled: !!storeId,
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods', storeId],
    queryFn: () => api.settings.getPaymentMethods(storeId),
    enabled: !!storeId && showPaymentModal,
  });

  // Fetch receipt config
  const { data: receiptConfig } = useQuery({
    queryKey: ['settings-receipt', storeId],
    queryFn: () => api.settings.getReceiptConfig(storeId),
    enabled: !!storeId,
  });

  // Cart item count
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Add item to cart with stock validation
  const addToCart = useCallback((product: PosProduct, qty: number = 1) => {
    debugLog('Adding to cart', { product, qty });

    if (product.stock <= 0) {
      setError(`${product.name} is out of stock`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      const currentQty = existingIndex >= 0 ? prev[existingIndex].qty : 0;
      const newQty = currentQty + qty;

      if (newQty > product.stock) {
        setError(`Only ${product.stock} available for ${product.name}`);
        setTimeout(() => setError(null), 3000);
        return prev;
      }

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty,
          lineTotal: newQty * updated[existingIndex].unitPrice,
        };
        return updated;
      }

      return [...prev, {
        product,
        qty,
        unitPrice: product.price,
        lineTotal: qty * product.price,
      }];
    });

    setError(null);
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  // Update item quantity
  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;

      if (qty > item.product.stock) {
        setError(`Only ${item.product.stock} available for ${item.product.name}`);
        setTimeout(() => setError(null), 3000);
        return prev;
      }

      return prev.map(cartItem =>
        cartItem.product.id === productId
          ? { ...cartItem, qty, lineTotal: qty * cartItem.unitPrice }
          : cartItem
      );
    });
  }, [removeFromCart]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountValue('');
    setDiscountType('amount');
    setError(null);
  }, []);

  // Handle explicit barcode scan
  const handleScanKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value.trim();
      if (!value) return;

      debugLog('Scanning barcode', value);

      try {
        const product = await api.pos.lookupByScan(value, storeId);
        if (product) {
          addToCart(product, 1);
          setScanValue('');
        } else {
          setError(`Item not found: ${value}`);
          setTimeout(() => setError(null), 3000);
          setScanValue('');
        }
      } catch (err: any) {
        setError(`Scan error: ${err.message}`);
        setTimeout(() => setError(null), 3000);
        setScanValue('');
      }
    }
  }, [storeId, addToCart]);

  // Global scanner listener (no-click scanning)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (showPaymentModal) return;

      const currentTime = Date.now();
      // Scanners type very quickly, usually < 30ms per character
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        const value = buffer.trim();
        buffer = '';
        debugLog('Global scan detected', value);

        try {
          const product = await api.pos.lookupByScan(value, storeId);
          if (product) {
            addToCart(product, 1);
          } else {
            setError(`Item not found: ${value}`);
            setTimeout(() => setError(null), 3000);
          }
        } catch (err: any) {
          setError(`Scan error: ${err.message}`);
          setTimeout(() => setError(null), 3000);
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [storeId, addToCart, showPaymentModal]);

  // Split payment helpers
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
    setError(null);
  }, []);

  const handleQuickAmount = useCallback((amount: number) => {
    setPaymentAmount(String(amount));
  }, []);

  // Handle checkout
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (isSplitMode) {
      if (splitPayments.length === 0) {
        setError('Please add at least one payment');
        return;
      }
      const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < totalAmount) {
        setError(`Insufficient payment. Remaining: ৳${(totalAmount - totalPaid).toFixed(2)}`);
        return;
      }
    } else {
      if (!selectedPaymentMethod || !paymentAmount) {
        setError('Please select payment method and enter amount');
        return;
      }
      const paid = parseFloat(paymentAmount);
      if (isNaN(paid) || paid < totalAmount) {
        setError(`Insufficient payment. Total: ৳${totalAmount.toFixed(2)}`);
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      for (const cartItem of cart) {
        const fresh = await api.pos.lookupByScan(cartItem.product.sku || cartItem.product.id, storeId);
        if (!fresh || fresh.stock < cartItem.qty) {
          setError(`${cartItem.product.name} is now out of stock. Please adjust quantity.`);
          setIsProcessing(false);
          return;
        }
      }

      let payments: Array<{ account_id: string; amount: number; party_id: string | null }>;
      let paidTotal: number;
      let paymentMethodLabel: string;

      if (isSplitMode) {
        payments = splitPayments.map(p => ({
          account_id: p.accountId,
          amount: p.amount,
          party_id: null,
        }));
        paidTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
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
        paidTotal = parseFloat(paymentAmount);
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
        const change = paidTotal - totalAmount;

        setCompletedSale({
          cart: [...cart],
          subtotal,
          discount: cartDiscount,
          totalAmount,
          paymentMethod: paymentMethodLabel,
          paidAmount: paidTotal,
          changeAmount: change,
          saleNumber: result.saleNumber || result.batchId,
          batchId: result.batchId,
        });

        clearCart();
        resetPaymentModal();
        setShowMobileCart(false);
      } else {
        setError(result.error || 'Sale failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[QuickPosPage] Checkout error:', err);
      setError(err.message || 'Sale failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [cart, storeId, tenantId, isSplitMode, selectedPaymentMethod, paymentAmount, splitPayments, totalAmount, subtotal, cartDiscount, paymentMethods, clearCart, resetPaymentModal]);

  // Get initials for product avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get avatar background color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-100 text-emerald-600',
      'bg-blue-100 text-blue-600',
      'bg-purple-100 text-purple-600',
      'bg-pink-100 text-pink-600',
      'bg-orange-100 text-orange-600',
      'bg-teal-100 text-teal-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const selectedPaymentMethodName = paymentMethods.find((m: any) => m.id === selectedPaymentMethod)?.name;

  // Billing panel content (shared between desktop sidebar and mobile sheet)
  const billingContent = (
    <>
      <div className="billing-header">
        <h2>Billing Items ({itemCount})</h2>
        <button
          className="text-danger"
          onClick={clearCart}
          disabled={cart.length === 0}
          style={{
            background: 'none',
            border: 'none',
            cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
            opacity: cart.length === 0 ? 0.5 : 1
          }}
        >
          Clear Items
        </button>
      </div>

      <div className="billing-items">
        {cart.length === 0 ? (
          <div style={{
            padding: 'var(--space-12)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <ShoppingCart size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
            <p>No items in cart</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className="billing-item">
              <div className="billing-item-info">
                <div className="billing-item-name">{item.product.name}</div>
                <div className="billing-item-price">
                  ৳{item.product.price.toFixed(2)} × {item.qty}
                </div>
              </div>
              <div className="billing-item-controls">
                <button
                  className="button-outline"
                  onClick={() => updateQty(item.product.id, item.qty - 1)}
                  style={{ padding: '2px 8px' }}
                >
                  -
                </button>
                <span style={{ margin: '0 8px' }}>{item.qty}</span>
                <button
                  className="button-outline"
                  onClick={() => updateQty(item.product.id, item.qty + 1)}
                  style={{ padding: '2px 8px' }}
                >
                  +
                </button>
                <button
                  className="text-danger"
                  onClick={() => removeFromCart(item.product.id)}
                  style={{
                    marginLeft: 'var(--space-2)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="billing-item-total">
                ৳{item.lineTotal.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="billing-summary">
        <div className="billing-row">
          <span>Sub Total</span>
          <span>৳{subtotal.toFixed(2)}</span>
        </div>
        <div className="billing-actions mt-2 mb-2">
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm font-medium text-text-muted">Discount:</span>
            <div className="flex border border-border-color rounded-md overflow-hidden bg-input flex-1">
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0.00"
                className="bg-transparent border-none outline-none w-full px-3 py-1.5 text-right text-sm"
              />
              <button
                className={clsx("px-3 py-1.5 text-sm font-bold border-l border-border-color", discountType === 'amount' ? "bg-primary text-black" : "bg-card text-text-muted hover:bg-border-light")}
                onClick={() => setDiscountType('amount')}
              >
                ৳
              </button>
              <button
                className={clsx("px-3 py-1.5 text-sm font-bold border-l border-border-color", discountType === 'percentage' ? "bg-primary text-black" : "bg-card text-text-muted hover:bg-border-light")}
                onClick={() => setDiscountType('percentage')}
              >
                %
              </button>
            </div>
          </div>
        </div>
        <div className="billing-total">
          <span>Total Amount</span>
          <span className="text-emerald-600 font-bold">
            ৳{totalAmount.toFixed(2)}
          </span>
        </div>
        <button
          className="button-primary w-full mt-4"
          onClick={() => setShowPaymentModal(true)}
          disabled={cart.length === 0 || isProcessing}
          style={{
            opacity: cart.length === 0 || isProcessing ? 0.5 : 1,
            cursor: cart.length === 0 || isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? (
            <>
              <RefreshCw size={16} className="animate-spin" style={{ marginRight: 'var(--space-2)' }} />
              Processing...
            </>
          ) : (
            'Continue Billing'
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className={clsx('pos-container', showMobileCart && 'pos-container--sheet-open')}>
      <div className="pos-content">
        {/* Left Panel - Categories */}
        <div className="pos-sidebar">
          <h2 className="text-sm font-bold text-text-muted mb-2 px-2 uppercase tracking-wider">Categories</h2>
          <div className="pos-categories">
            <button
              className={`category-pill ${activeCategory === null ? 'active' : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              All Categories
            </button>
            {catLoading ? (
              <div className="category-pill">Loading...</div>
            ) : catError ? (
              <div className="category-pill text-danger">Error loading</div>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-pill ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name} ({category.itemCount})
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center Panel - Products */}
        <div className="pos-products">
          {/* Action Bar */}
          <div className="pos-action-bar">
            <h1 className="text-xl font-bold">Quick POS</h1>
            <div className="pos-action-buttons">
              <div className="pos-search">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="button-primary" onClick={() => setIsScanning(!isScanning)}>
                <ScanLine size={16} /> Scan Code
              </button>
            </div>
          </div>

          {/* Scanner Input */}
          {isScanning && (
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <input
                type="text"
                placeholder="Scan barcode or SKU... (Press Enter)"
                className="search-input"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={handleScanKeyDown}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="card" style={{
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="pos-grid">
            {prodLoading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="product-card">
                  <div className="product-avatar">
                    <SkeletonBlock className="w-full h-full" />
                  </div>
                  <div className="product-info">
                    <SkeletonBlock className="w-4/5 h-5 mb-2" />
                    <SkeletonBlock className="w-2/5 h-4 mb-2" />
                    <SkeletonBlock className="w-[30%] h-[18px]" />
                  </div>
                  <SkeletonBlock className="w-full h-9 mt-2" />
                </div>
              ))
            ) : prodError ? (
              <div className="card" style={{
                padding: 'var(--space-12)',
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--color-danger)'
              }}>
                <AlertCircle size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
                <p>Error loading products. Please try again.</p>
                <button
                  className="button-primary"
                  onClick={() => window.location.reload()}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  <RefreshCw size={16} style={{ marginRight: 'var(--space-2)' }} />
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="card" style={{
                padding: 'var(--space-12)',
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}>
                <AlertCircle size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
                <p>No products found.</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-avatar">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <span className={getAvatarColor(product.name)}>
                        {getInitials(product.name)}
                      </span>
                    )}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <div className="product-quantity">
                      Stock: {product.stock}
                    </div>
                    <div className="product-price">
                      ৳{product.price.toFixed(2)}
                    </div>
                  </div>
                  <button
                    className={clsx(
                      'button-primary w-full mt-2',
                      product.stock <= 0 && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => product.stock > 0 && addToCart(product, 1)}
                    disabled={product.stock <= 0}
                  >
                    {product.stock > 0 ? 'Click to Select' : 'Out of Stock'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Billing (desktop only, hidden on mobile) */}
        <div className="pos-billing">
          {billingContent}
        </div>
      </div>

      {/* Mobile: Sticky cart trigger bar */}
      <button
        className="mobile-cart-trigger"
        onClick={() => setShowMobileCart(true)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShoppingCart size={20} />
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          <span className="mobile-cart-badge">{itemCount}</span>
        </span>
        <span className="mobile-cart-total">৳{totalAmount.toFixed(2)}</span>
        <ChevronUp size={20} />
      </button>

      {/* Mobile: Cart sheet overlay */}
      {showMobileCart && (
        <>
          <div
            className="cart-sheet-overlay"
            onClick={() => setShowMobileCart(false)}
          />
          <div className="cart-sheet">
            <div className="cart-sheet-handle">
              <div className="cart-sheet-handle-bar" />
            </div>
            <div className="cart-sheet-header">
              <h2>Billing ({itemCount})</h2>
              <button
                className="text-danger"
                onClick={clearCart}
                disabled={cart.length === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: cart.length === 0 ? 0.5 : 1,
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                Clear Items
              </button>
            </div>
            <div className="cart-sheet-body">
              {cart.length === 0 ? (
                <div style={{
                  padding: 'var(--space-12)',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <ShoppingCart size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
                  <p>No items in cart</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="billing-item">
                    <div className="billing-item-info">
                      <div className="billing-item-name">{item.product.name}</div>
                      <div className="billing-item-price">
                        ৳{item.product.price.toFixed(2)} × {item.qty}
                      </div>
                    </div>
                    <div className="billing-item-controls">
                      <button
                        className="button-outline"
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        style={{ padding: '2px 8px' }}
                      >
                        -
                      </button>
                      <span style={{ margin: '0 8px' }}>{item.qty}</span>
                      <button
                        className="button-outline"
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        style={{ padding: '2px 8px' }}
                      >
                        +
                      </button>
                      <button
                        className="text-danger"
                        onClick={() => removeFromCart(item.product.id)}
                        style={{
                          marginLeft: 'var(--space-2)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="billing-item-total">
                      ৳{item.lineTotal.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="cart-sheet-footer">
              <div className="billing-row">
                <span>Sub Total</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              <div className="billing-total" style={{ marginTop: 'var(--space-2)' }}>
                <span>Total Amount</span>
                <span className="text-emerald-600 font-bold">৳{totalAmount.toFixed(2)}</span>
              </div>
              <button
                className="button-primary w-full"
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0 || isProcessing}
                style={{
                  marginTop: 'var(--space-3)',
                  opacity: cart.length === 0 || isProcessing ? 0.5 : 1,
                  cursor: cart.length === 0 || isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing ? 'Processing...' : 'Continue Billing'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal" onClick={resetPaymentModal}>
          <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ margin: 0 }}>Payment</h2>
              <button
                className="button-secondary"
                onClick={resetPaymentModal}
                style={{ padding: 'var(--space-2)', minWidth: 36, minHeight: 36 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Toggle: Single / Split */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <button
                className={clsx(!isSplitMode && 'button-primary', isSplitMode && 'button-outline')}
                onClick={() => { setIsSplitMode(false); setSplitPayments([]); }}
                style={{ flex: 1 }}
              >
                <Banknote size={16} style={{ marginRight: 'var(--space-1)' }} />
                Single Payment
              </button>
              <button
                className={clsx(isSplitMode && 'button-primary', !isSplitMode && 'button-outline')}
                onClick={() => { setIsSplitMode(true); setSelectedPaymentMethod(null); setPaymentAmount(''); }}
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
                {/* Payment Method Selector (chips with icons) */}
                <div className="payment-section">
                  <span className="payment-section-label">Payment Method</span>
                  <div className="payment-methods-grid">
                    {paymentMethods.map((method: any) => {
                      const Icon = getPaymentIcon(method.name);
                      return (
                        <button
                          key={method.id}
                          className={clsx('payment-method-chip', selectedPaymentMethod === method.id && 'selected')}
                          onClick={() => setSelectedPaymentMethod(method.id)}
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
                    <button className="quick-amount-btn" onClick={() => handleQuickAmount(100)}>৳100</button>
                    <button className="quick-amount-btn" onClick={() => handleQuickAmount(500)}>৳500</button>
                    <button className="quick-amount-btn" onClick={() => handleQuickAmount(1000)}>৳1000</button>
                    <button className="quick-amount-btn exact" onClick={() => handleQuickAmount(Math.ceil(totalAmount))}>Exact</button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="payment-section">
                  <span className="payment-section-label">Amount Tendered</span>
                  <input
                    type="number"
                    className="payment-input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
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
                              onClick={() => removeSplitPayment(sp.id)}
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
                              onClick={() => setSplitMethod(method.id)}
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
                          onChange={(e) => setSplitAmount(e.target.value)}
                          placeholder={`Max: ৳${remainingAmount.toFixed(2)}`}
                        />
                        <button
                          className="button-primary"
                          onClick={addSplitPayment}
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
              <button
                className="button-secondary"
                onClick={resetPaymentModal}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                onClick={handleCheckout}
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
      )}

      {completedSale && (
        <ReceiptPreview
          cart={completedSale.cart}
          subtotal={completedSale.subtotal}
          discount={completedSale.discount}
          totalAmount={completedSale.totalAmount}
          paymentMethod={completedSale.paymentMethod}
          paidAmount={completedSale.paidAmount}
          changeAmount={completedSale.changeAmount}
          saleNumber={completedSale.saleNumber}
          batchId={completedSale.batchId}
          receiptConfig={receiptConfig ? {
            store_name: receiptConfig.store_name || '',
            header_text: receiptConfig.header_text || '',
            footer_text: receiptConfig.footer_text || '',
          } : null}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}