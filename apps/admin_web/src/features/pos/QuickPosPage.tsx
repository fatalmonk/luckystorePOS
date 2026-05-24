import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { SkeletonBlock } from '../../components/PageState';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { Search, ScanLine, AlertCircle, X, RefreshCw, ShoppingCart, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { PosProduct } from '../../lib/api/types';
import { ReceiptPreview } from './ReceiptPreview';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { usePosCart } from './usePosCart';
import { usePosScanner } from './usePosScanner';
import { usePosSale } from './usePosSale';
import { ProductCard } from '../../components/product/ProductCard';

import './receipt.css';

export function QuickPosPage() {
  const { storeId, tenantId } = useAuth();

  // Error state (shared across hooks)
  const [error, setError] = useState<string | null>(null);
  const handleError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Refs for focusing
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Cart hook
  const cart = usePosCart(handleError);

  // Realtime: refresh product list on stock_levels changes
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
          cart.setCart(prev => {
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

  useRealtimeSubscription({
    table: 'items',
    event: '*',
    invalidateKeys: [['pos-products', storeId], ['pos-categories', storeId]],
  });

  // Scanner hook
  const scanner = usePosScanner(storeId, cart.addToCart, handleError, cart.totalAmount === 0);

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
    enabled: !!storeId,
  });

  // Fetch receipt config
  const { data: receiptConfig } = useQuery({
    queryKey: ['settings-receipt', storeId],
    queryFn: () => api.settings.getReceiptConfig(storeId),
    enabled: !!storeId,
  });

  // Sale hook
  const sale = usePosSale(
    cart.cart,
    cart.totalAmount,
    cart.subtotal,
    cart.cartDiscount,
    storeId,
    tenantId,
    paymentMethods,
    cart.clearCart,
    handleError,
  );

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clear error on payment modal close
  useEffect(() => {
    if (!sale.showPaymentModal) setError(null);
  }, [sale.showPaymentModal]);

  // Auto focus scanner input when scanning mode is active
  useEffect(() => {
    if (scanner.isScanning) {
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    }
  }, [scanner.isScanning]);

  // Keyboard Shortcuts: F2, F12, Ctrl+K, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape clears cart
      if (e.key === 'Escape') {
        const activeEl = document.activeElement;
        if (activeEl?.tagName !== 'INPUT' && activeEl?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          cart.clearCart();
        }
      }
      
      // F2 toggles scanner
      if (e.key === 'F2') {
        e.preventDefault();
        scanner.setIsScanning(prev => !prev);
      }
      
      // F12 continues billing / opens payment modal
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.cart.length > 0 && !sale.showPaymentModal) {
          sale.setShowPaymentModal(true);
        }
      }
      
      // Ctrl + K focuses search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, scanner, sale]);

  return (
    <div className={clsx('pos-container', showMobileCart && 'pos-container--sheet-open')}>
      <div className="pos-content">
        {/* Left Fluid Area */}
        <div className="pos-left-pane">
          {/* Category Filters (Horizontal) */}
          <div className="pos-categories-horizontal flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
            <button
              className={`category-pill ${activeCategory === null ? 'active' : ''}`}
              onClick={() => setActiveCategory(null)}
              style={{ whiteSpace: 'nowrap' }}
            >
              All Categories
            </button>
            {catLoading ? (
              <div className="category-pill" style={{ whiteSpace: 'nowrap' }}>Loading...</div>
            ) : catError ? (
              <div className="category-pill text-danger" style={{ whiteSpace: 'nowrap' }}>Error loading</div>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-pill ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {category.name} ({category.itemCount})
                </button>
              ))
            )}
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
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search items... (Ctrl+K)"
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="button-primary" onClick={() => scanner.setIsScanning(!scanner.isScanning)}>
                <ScanLine size={16} /> Scan Code (F2)
              </button>
            </div>
          </div>

          {/* Scanner Input */}
          {scanner.isScanning && (
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <input
                ref={scannerInputRef}
                type="text"
                placeholder="Scan barcode or SKU... (Press Enter)"
                className="search-input"
                value={scanner.scanValue}
                onChange={(e) => scanner.setScanValue(e.target.value)}
                onKeyDown={scanner.handleScanKeyDown}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Error Display */}
          {error && !sale.showPaymentModal && (
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
                <div key={i} className="product-card" aria-busy="true">
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
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(p) => cart.addToCart(p, 1)}
                />
              ))
            )}
          </div>
          </div>
        </div>

        {/* Right Panel - Billing (desktop only) */}
        <div className="pos-billing">
          <CartPanel
            cart={cart.cart}
            itemCount={cart.itemCount}
            subtotal={cart.subtotal}
            totalAmount={cart.totalAmount}
            discountType={cart.discountType}
            discountValue={cart.discountValue}
            isProcessing={sale.isProcessing}
            onClearCart={cart.clearCart}
            onRemoveFromCart={cart.removeFromCart}
            onUpdateQty={cart.updateQty}
            onSetDiscountValue={cart.setDiscountValue}
            onSetDiscountType={cart.setDiscountType}
            onContinueBilling={() => sale.setShowPaymentModal(true)}
          />
        </div>
      </div>

      {/* Mobile: Sticky cart trigger bar */}
      <button
        className="mobile-cart-trigger"
        onClick={() => setShowMobileCart(true)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShoppingCart size={20} />
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
          <span className="mobile-cart-badge">{cart.itemCount}</span>
        </span>
        <span className="mobile-cart-total">৳{cart.totalAmount.toFixed(2)}</span>
        <ChevronUp size={20} />
      </button>

      {/* Mobile: Cart sheet overlay */}
      {showMobileCart && (
        <>
          <div className="cart-sheet-overlay" onClick={() => setShowMobileCart(false)} />
          <div className="cart-sheet">
            <div className="cart-sheet-handle">
              <div className="cart-sheet-handle-bar" />
            </div>
            <div className="cart-sheet-header">
              <h2>Billing ({cart.itemCount})</h2>
              <button
                className="text-danger"
                onClick={cart.clearCart}
                disabled={cart.cart.length === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: cart.cart.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: cart.cart.length === 0 ? 0.5 : 1,
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                Clear Items
              </button>
            </div>
            <div className="cart-sheet-body">
              <CartPanel
                cart={cart.cart}
                itemCount={cart.itemCount}
                subtotal={cart.subtotal}
                totalAmount={cart.totalAmount}
                discountType={cart.discountType}
                discountValue={cart.discountValue}
                isProcessing={sale.isProcessing}
                onClearCart={cart.clearCart}
                onRemoveFromCart={cart.removeFromCart}
                onUpdateQty={cart.updateQty}
                onSetDiscountValue={cart.setDiscountValue}
                onSetDiscountType={cart.setDiscountType}
                onContinueBilling={() => sale.setShowPaymentModal(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      <PaymentModal
        show={sale.showPaymentModal}
        totalAmount={cart.totalAmount}
        isProcessing={sale.isProcessing}
        isSplitMode={sale.isSplitMode}
        selectedPaymentMethod={sale.selectedPaymentMethod}
        paymentAmount={sale.paymentAmount}
        splitPayments={sale.splitPayments}
        splitMethod={sale.splitMethod}
        splitAmount={sale.splitAmount}
        paymentMethods={paymentMethods}
        paidTotal={sale.paidTotal}
        changeAmount={sale.changeAmount}
        remainingAmount={sale.remainingAmount}
        error={error}
        onClose={sale.resetPaymentModal}
        onSetIsSplitMode={sale.setIsSplitMode}
        onSelectPaymentMethod={sale.setSelectedPaymentMethod}
        onSetPaymentAmount={sale.setPaymentAmount}
        onSetSplitMethod={sale.setSplitMethod}
        onSetSplitAmount={sale.setSplitAmount}
        onAddSplitPayment={sale.addSplitPayment}
        onRemoveSplitPayment={sale.removeSplitPayment}
        onQuickAmount={sale.handleQuickAmount}
        onCheckout={sale.handleCheckout}
      />

      {sale.completedSale && (
        <ReceiptPreview
          cart={sale.completedSale.cart}
          subtotal={sale.completedSale.subtotal}
          discount={sale.completedSale.discount}
          totalAmount={sale.completedSale.totalAmount}
          paymentMethod={sale.completedSale.paymentMethod}
          paidAmount={sale.completedSale.paidAmount}
          changeAmount={sale.completedSale.changeAmount}
          saleNumber={sale.completedSale.saleNumber}
          batchId={sale.completedSale.batchId}
          receiptConfig={receiptConfig ? {
            store_name: receiptConfig.store_name || '',
            header_text: receiptConfig.header_text || '',
            footer_text: receiptConfig.footer_text || '',
          } : null}
          onClose={() => sale.resetPaymentModal}
        />
      )}
    </div>
  );
}