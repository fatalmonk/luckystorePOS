import { ShoppingCart, Pencil, Check, X, History } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useNotify } from '../../components/NotificationContext';
import type { PosProduct } from '../../lib/api/types';

interface ProductCardProps {
  product: PosProduct;
  onAddToCart: (product: PosProduct) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  storeId?: string;
  onViewHistory?: (product: PosProduct) => void;
}

const getInitials = (name: string) =>
  name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-100 text-emerald-600',
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600',
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

// Strict currency formatting for Bangladeshi Taka with Indian numbering
// Cost Price: 2 decimals (precision matters), Selling/MRP: integers (unless business requires decimals)
const formatCostPrice = (num: number): string => {
  if (num >= 10000000) {
    return `৳${(num / 10000000).toFixed(2)}Cr`;
  } else if (num >= 100000) {
    return `৳${(num / 100000).toFixed(2)}L`;
  }
  // Always 2 decimal places for cost precision
  return `৳${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatSellingPrice = (num: number): string => {
  const rounded = Math.round(num);
  if (rounded >= 10000000) {
    return `৳${(rounded / 10000000).toFixed(0)}Cr`;
  } else if (rounded >= 100000) {
    return `৳${(rounded / 100000).toFixed(0)}L`;
  }
  // Integer only for selling price
  return `৳${rounded.toLocaleString('en-IN')}`;
};

const formatMRP = (num: number): string => {
  const rounded = Math.round(num);
  if (rounded >= 10000000) {
    return `৳${(rounded / 10000000).toFixed(0)}Cr`;
  } else if (rounded >= 100000) {
    return `৳${(rounded / 100000).toFixed(0)}L`;
  }
  // Integer only for MRP
  return `৳${rounded.toLocaleString('en-IN')}`;
};

// Calculate margin percentage
const calcMargin = (cost: number, price: number) => {
  if (!cost || cost <= 0 || !price) return null;
  return Math.round(((price - cost) / cost) * 100);
};

// Inline Price Editor Component
interface InlinePriceEditorProps {
  price: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}

function InlinePriceEditor({ price, onSave, onCancel }: InlinePriceEditorProps) {
  const [value, setValue] = useState(String(price));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const validate = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 'Invalid number';
    if (num < 0) return 'Price cannot be negative';
    return '';
  };

  const handleSave = () => {
    const err = validate(value);
    if (err) {
      setError(err);
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }
    setSuccess(true);
    setError('');
    onSave(parseFloat(value));
    setTimeout(() => setSuccess(false), 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Slight delay to allow button clicks
    setTimeout(() => {
      handleSave();
    }, 200);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={clsx(
          'w-full px-2 py-1 text-sm font-bold text-slate-900 tabular-nums rounded border outline-none transition-all duration-200',
          success && 'border-success-default ring-2 ring-success-default/30',
          error && 'border-rose-500 ring-2 ring-rose-500/30',
          shake && 'animate-shake',
          !success && !error && 'border-primary-default focus:ring-2 focus:ring-primary-default/30'
        )}
      />
      {error && (
        <p className="text-[10px] text-rose-500 mt-0.5">{error}</p>
      )}
      <div className="flex gap-1 mt-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
          className="flex-1 h-6 bg-primary-default text-white text-[10px] font-medium rounded hover:bg-primary-hover transition-colors flex items-center justify-center gap-0.5"
        >
          <Check size={10} /> Save
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="h-6 px-2 text-slate-500 hover:text-slate-700 text-[10px] font-medium transition-colors"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

// Mobile Price Sheet Component
interface MobilePriceSheetProps {
  product: PosProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (price: number, mrp?: number, cost?: number) => void;
}

function MobilePriceSheet({ product, isOpen, onClose, onSave }: MobilePriceSheetProps) {
  const [price, setPrice] = useState(0);
  const [mrp, setMrp] = useState('');
  const [cost, setCost] = useState('');
  const { notify } = useNotify();

  useEffect(() => {
    if (product) {
      setPrice(product.price || 0);
      setMrp(product.mrp || '');
      setCost(product.cost || '');
    }
  }, [product?.id]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = () => {
    if (price <= 0) {
      notify('Price must be greater than 0', 'error');
      return;
    }
    onSave(price, mrp ? Number(mrp) : undefined, cost ? Number(cost) : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50" />
      
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 animate-slideUp"
        style={{ height: '280px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1 rounded-full bg-slate-300" />
        </div>

        <h3 className="font-semibold text-slate-900 mb-4">Edit Price</h3>

        <div className="space-y-3">
          {/* Price */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Selling Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price || ''}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-3 text-base border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-default focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* MRP */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">MRP</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-default focus:border-transparent"
                />
              </div>
            </div>

            {/* Cost */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cost Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">৳</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-default focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 bg-primary-default text-white rounded-lg font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product, onAddToCart, isFocused, onFocus, storeId, onViewHistory }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const [isAdded, setIsAdded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isHoveringPrice, setIsHoveringPrice] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useNotify();

  // Determine layout: mobile compact vs desktop full
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Price mutation for inline editing
  const priceMutation = useMutation({
    mutationFn: async (price: number) => {
      return api.products.update(product.id, { price });
    },
    onSuccess: () => {
      notify(`Price updated for ${product.name}`, 'success');
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to update price.', 'error');
    },
  });

  const fullPriceMutation = useMutation({
    mutationFn: async (data: { price: number; mrp?: number; cost?: number }) => {
      const updates: any = { price: data.price };
      if (data.mrp !== undefined) updates.mrp = data.mrp;
      if (data.cost !== undefined) updates.cost = data.cost;
      return api.products.update(product.id, updates);
    },
    onSuccess: () => {
      notify(`Prices updated for ${product.name}`, 'success');
      if (storeId) {
        queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to update prices.', 'error');
    },
  });

  const handleClick = () => {
    if (!isOutOfStock && !isEditingPrice) {
      onAddToCart(product);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handlePriceSave = (value: number) => {
    priceMutation.mutate(value);
    setIsEditingPrice(false);
  };

  const handleMobileSave = (price: number, mrp?: number, cost?: number) => {
    fullPriceMutation.mutate({ price, mrp, cost });
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) {
      setShowMobileSheet(true);
    } else {
      setIsEditingPrice(true);
    }
  };

  const hasCost = typeof product.cost === 'number' && product.cost > 0;
  const hasMrp = typeof product.mrp === 'number' && product.mrp > 0;
  const margin = hasCost ? calcMargin(product.cost!, product.price) : null;

  // Pricing health badges
  const priceError = hasMrp && product.price > product.mrp!;
  const lowMargin = margin !== null && margin < 10;

  // Price display values with strict formatting
  const cpDisplay = hasCost ? formatCostPrice(product.cost!) : null;
  const mrpDisplay = hasMrp ? formatMRP(product.mrp!) : null;
  const spDisplay = formatSellingPrice(product.price);

  return (
    <>
      <div
        className={clsx(
          'product-card',
          isFocused && 'ring-2 ring-primary-default ring-offset-2',
          isAdded && 'animate-flash-success',
          !isOutOfStock && [
            'hover:-translate-y-0.5',
            'hover:shadow-level-2',
            'hover:border-border-strong',
            'transition-all duration-200 ease-out'
          ],
          isOutOfStock && 'opacity-60 cursor-not-allowed'
        )}
        role="button"
        tabIndex={0}
        aria-label={`${product.name}, ${product.stock} in stock, ${product.price.toFixed(2)} taka`}
        aria-disabled={isOutOfStock}
        onFocus={onFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={product.name.length > 24 ? product.name : undefined}
      >
        <div className="product-avatar" aria-hidden="true">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" />
          ) : (
            <span className={getAvatarColor(product.name)}>
              {getInitials(product.name)}
            </span>
          )}
        </div>
        <div className="product-info">
          <h3 className="product-name truncate" title={product.name.length > 24 ? product.name : undefined}>
            {product.name}
          </h3>
          <div className="product-meta tabular-nums font-mono" aria-label={`Stock: ${product.stock}`}>
            Qty: {product.stock}
          </div>

          {/* Three-layer pricing footer */}
          <div className="flex justify-between gap-3 mt-2 pt-2 border-t border-border-default">
            {/* Cost Price */}
            {isMobile ? (
              <div className="flex flex-col relative">
                <span className="text-[10px] uppercase text-slate-400 tracking-wide">Margin</span>
                <span
                  className="text-xs text-slate-500 tabular-nums cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onTouchStart={() => setShowTooltip(true)}
                  onTouchEnd={() => setShowTooltip(false)}
                >
                  {margin !== null ? `${margin}%` : '—'}
                </span>
                {showTooltip && hasCost && (
                  <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg z-10 whitespace-nowrap">
                    CP: {formatCostPrice(product.cost!)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 tracking-wide">CP</span>
                <span className="text-xs text-slate-500 tabular-nums">{cpDisplay || '—'}</span>
              </div>
            )}

            {/* MRP */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-slate-400 tracking-wide">MRP</span>
              <span className={clsx(
                'text-xs tabular-nums',
                hasMrp ? 'text-slate-400 line-through' : 'text-slate-400'
              )}>
                {mrpDisplay || '—'}
              </span>
            </div>

            {/* Selling Price - Editable */}
            <div
              className="flex flex-col items-end relative"
              onMouseEnter={() => setIsHoveringPrice(true)}
              onMouseLeave={() => setIsHoveringPrice(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase text-slate-400 tracking-wide">Price</span>
                {onViewHistory && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onViewHistory(product); }}
                    className="text-slate-400 hover:text-primary-default transition-colors"
                    title="View price history"
                  >
                    <History size={12} />
                  </button>
                )}
              </div>
              {isEditingPrice ? (
                <InlinePriceEditor
                  price={product.price}
                  onSave={handlePriceSave}
                  onCancel={() => setIsEditingPrice(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="group flex items-center gap-1 focus:outline-none"
                  title="Click to edit price"
                >
                  <span className="text-base font-bold text-slate-900 tabular-nums group-hover:text-primary-default transition-colors">
                    {spDisplay}
                  </span>
                  {(isHoveringPrice || isMobile) && (
                    <Pencil
                      size={14}
                      className="text-slate-400 group-hover:text-primary-default transition-colors"
                    />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Pricing Health Badges */}
          {(priceError || lowMargin || !hasMrp) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Price > MRP Alert */}
              {priceError && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Invalid
                </span>
              )}
              {/* Low Margin Warning */}
              {lowMargin && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                  Low Margin
                </span>
              )}
              {/* Missing MRP Notice */}
              {!hasMrp && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                  No MRP
                </span>
              )}
            </div>
          )}
        </div>
        <button
          className={clsx(
            'button-primary w-full mt-2 min-h-[44px]',
            'active:scale-[0.98]',
            'transition-transform duration-100',
            isOutOfStock && 'opacity-50 cursor-not-allowed'
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          disabled={isOutOfStock}
          aria-label={isOutOfStock ? 'Out of stock' : `Add ${product.name} to cart`}
        >
          <ShoppingCart size={16} className="mr-2 inline" aria-hidden="true" />
          {isOutOfStock ? 'Out of Stock' : isAdded ? 'Added!' : 'Add to Cart'}
        </button>
      </div>

      {/* Mobile Price Sheet */}
      <MobilePriceSheet
        product={product}
        isOpen={showMobileSheet}
        onClose={() => setShowMobileSheet(false)}
        onSave={handleMobileSave}
      />

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
}
