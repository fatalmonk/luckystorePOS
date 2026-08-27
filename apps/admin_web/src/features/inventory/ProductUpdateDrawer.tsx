import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Save, Plus, Minus, RotateCcw, Upload, ImageIcon, Package, DollarSign, Info, Activity } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { fetchCompetitorPrices } from '../../lib/api/domains/competitorPrices';
import { supabase } from "@/lib/supabase";
import { deleteFromR2, extractR2Key } from '../../lib/r2';
import { uploadProcessedImage } from '../../lib/images';
import { clsx } from 'clsx';
import { useNotify } from '@/components';
import { useAuth } from '../../lib/AuthContext';
import type { Database } from '../../lib/database.types';
import { PriceHistoryMini } from './PriceHistoryMini';
import { CategoryPicker } from '@/components';
import { calcMargin } from '@/lib/format';

type ProductWithExtras = {
  id: string;
  name: string;
  barcode: string | null;
  brand: string | null;
  category_id: string | null;
  cost: number | null;
  created_at: string | null;
  description: string | null;
  group_tag: string | null;
  image_url: string | null;
  is_active: boolean | null;
  mrp: number | null;
  price: number | null;
  short_code: string | null;
  sku: string | null;
  tenant_id: string | null;
  updated_at: string | null;
  current_qty?: number;
  category_name?: string;
  reorder_status?: string;
  last_purchased_date?: string;
};

interface ProductUpdateDrawerProps {
  product: ProductWithExtras | null;
  storeId: string;
  onClose: () => void;
  /** Called with product name after successful update, for highlighting parent card */
  onSuccess?: (productName: string) => void;
}

const stockReasons = [
  { value: 'received', label: 'Purchase' },
  { value: 'correction', label: 'Sale correction' },
  { value: 'damaged', label: 'Damage' },
  { value: 'lost', label: 'Theft/loss' },
  { value: 'returned', label: 'Return' },
  { value: 'other', label: 'Manual fix' },
];

export function ProductUpdateDrawer({ product, storeId, onClose, onSuccess }: ProductUpdateDrawerProps) {
  const { notify } = useNotify();
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Mobile swipe down to dismiss
  const touchStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 90) {
      onClose();
    }
    setDragOffset(0);
    touchStartY.current = null;
  };

  // Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'stock' | 'pricing'>('info');

  // Stock tab state
  const [stockMode, setStockMode] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>('received');
  const [notes, setNotes] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing tab state
  const [sellingPrice, setSellingPrice] = useState<number>(product?.price || 0);
  const [mrp, setMrp] = useState<number | undefined>(product?.mrp ?? undefined);
  const [costPrice, setCostPrice] = useState<number | undefined>(product?.cost ?? undefined);
  const [categoryId, setCategoryId] = useState<string | null>(product?.category_id ?? null);

  // Min qty editing state
  const [editingMinQty, setEditingMinQty] = useState<number | null>(null);
  const [isEditingMinQty, setIsEditingMinQty] = useState(false);
  const minQtyMutation = useMutation({
    mutationFn: async (newMinQty: number) => {
      if (!product) throw new Error('No product selected');
      return api.inventory.setMinQty(storeId, product.id, newMinQty);
    },
    onSuccess: () => {
      notify('Low stock threshold updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      setIsEditingMinQty(false);
      setEditingMinQty(null);
    },
    onError: (err: Error) => notify(err.message || 'Failed to update threshold.', 'error'),
  });

  // Derived Dirty tracking
  const pricingDirty = product ? (
    (sellingPrice || 0) !== (product.price || 0) ||
    (mrp ?? null) !== (product.mrp ?? null) ||
    (costPrice ?? null) !== (product.cost ?? null)
  ) : false;

  const stockDirty = quantity > 0 || notes.trim() !== '';
  const infoDirty = product ? (product.category_id ?? null) !== (categoryId ?? null) : false;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);
  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setSellingPrice(product.price || 0);
    setMrp(product.mrp ?? undefined);
    setCostPrice(product.cost ?? undefined);
    setCategoryId(product.category_id ?? null);
    setQuantity(0);
    setNotes('');
    setReason('received');
    setStockMode('add');
  }

  // Focus the close button when drawer opens
  useEffect(() => {
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key — only client-side
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || typeof document === 'undefined') return;
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
    drawer.addEventListener('keydown', handleTabKey);
    return () => drawer.removeEventListener('keydown', handleTabKey);
  }, []);

  // Margin calculation
  const margin = useMemo(() => {
    const sp = Number(sellingPrice) || 0;
    const cp = Number(costPrice) || 0;
    const pct = calcMargin(cp, sp);
    if (pct === null) return null;
    const profit = sp - cp;
    return { profit, pct };
  }, [sellingPrice, costPrice]);

  // Competitor Prices
  const { data: competitorPrices, isLoading: isLoadingCompetitors } = useQuery({
    queryKey: ['competitorPrices', storeId, product?.id],
    queryFn: () => product ? fetchCompetitorPrices(storeId, { itemId: product.id }) : [],
    enabled: !!product && activeTab === 'pricing',
  });

  // Mutations
  const imageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!product) throw new Error('No product selected');
      // Process and upload new WebP image
      const publicUrl = await uploadProcessedImage({
        file,
        sku: product.sku,
        barcode: product.barcode,
        itemId: product.id,
      });

      // Persist the new image_url in the items table
      await api.inventory.updateProduct(storeId, product.id, { image_url: publicUrl });

      // Delete the old image if the key/path has changed
      const getCleanPath = (url: string) => url.split('?')[0];
      const oldUrl = product.image_url;
      if (oldUrl && getCleanPath(oldUrl) !== getCleanPath(publicUrl)) {
        const r2Key = extractR2Key(oldUrl);
        if (r2Key) {
          try {
            await deleteFromR2(r2Key);
          } catch (err) {
            console.warn('Failed to delete old image from R2:', err);
          }
        }
      }

      return { image_url: publicUrl };
    },
    onSuccess: () => {
      notify('Image updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (err: Error) => notify(err.message || 'Failed to upload image.', 'error'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('No product selected');

      const promises: Promise<any>[] = [];

      // 1. Stock adjustment
      if (stockDirty && quantity > 0) {
        if (stockMode === 'set') {
          promises.push(api.inventory.set(storeId, product.id, quantity, reason, notes));
        } else {
          const delta = stockMode === 'add' ? quantity : -quantity;
          promises.push(api.inventory.update(storeId, product.id, delta, reason, notes));
        }
      }

      // 2. Pricing updates
      if (pricingDirty) {
        const updates: Partial<Database['public']['Tables']['items']['Update']> = {
          price: sellingPrice,
        };
        if (typeof mrp === 'number') updates.mrp = mrp;
        if (typeof costPrice === 'number') updates.cost = costPrice;
        promises.push(api.products.update(product.id, updates, product.tenant_id || tenantId));
      }

      // 3. Category update
      if (infoDirty) {
        promises.push(api.inventory.updateProduct(storeId, product.id, { category_id: categoryId }));
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      if (!product) return;
      notify(`Changes saved for ${product.name}`, 'success');
      if (stockDirty && quantity > 0) {
        onSuccess?.(product.name);
      }
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: Error) => notify(err.message || 'Failed to save changes.', 'error'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file.', 'error');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    
    // Auto-upload immediately for better UX
    imageMutation.mutate(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isButtonDisabled) {
      saveMutation.mutate();
    }
  };

  const stockColors = {
    add: { bg: 'bg-success-subtle dark:bg-success/15', text: 'text-success', border: 'border-success/30' },
    remove: { bg: 'bg-danger-subtle dark:bg-danger/15', text: 'text-danger', border: 'border-danger/30' },
    set: { bg: 'bg-primary/10 dark:bg-primary/15', text: 'text-primary', border: 'border-primary/30' },
  };

  // Button label logic
  const getButtonLabel = () => {
    if (saveMutation.isPending) {
      return 'Saving...';
    }
    const dirtyParts: string[] = [];
    if (stockDirty && quantity > 0) dirtyParts.push('Stock');
    if (pricingDirty) dirtyParts.push('Price');
    if (infoDirty) dirtyParts.push('Category');
    if (dirtyParts.length === 0) return 'Save Changes';
    if (dirtyParts.length === 1) return `Save ${dirtyParts[0]} Only`;
    return `Save ${dirtyParts.join(' & ')}`;
  };

  const isButtonDisabled = (!stockDirty && !pricingDirty && !infoDirty) || saveMutation.isPending;

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
        className={`
          fixed z-50 bg-surface dark:bg-[#141417]/85 dark:backdrop-blur-2xl shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col
          lg:relative lg:ml-auto lg:w-full lg:max-w-[480px] lg:h-full lg:border-l lg:border-border dark:lg:border-white/[0.12] dark:lg:border-t-white/[0.22] lg:animate-slideInRight
          max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:max-h-[92dvh] max-lg:h-[90dvh] max-lg:rounded-t-3xl max-lg:border-t max-lg:border-border dark:max-lg:border-white/[0.15] max-lg:animate-slideUp
        `}
      >
        {/* Drag handle for mobile */}
        <div 
          className="lg:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 rounded-full bg-border/80 dark:bg-white/20" />
        </div>

        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3 sm:p-5 border-b border-border dark:border-white/[0.08] bg-surface/80 dark:bg-[#141417]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex gap-3 items-center min-w-0">
            {/* Quick Image Upload */}
            <div 
              className="relative group cursor-pointer w-12 h-12 sm:w-13 sm:h-13 rounded-xl border border-border dark:border-white/[0.12] bg-surface-raised dark:bg-white/[0.04] overflow-hidden flex-shrink-0 shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Click to change image"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
              ) : product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-1" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted"><ImageIcon size={20} /></div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {imageMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={16} className="text-white" />
                )}
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="header-image-upload"
              aria-label="Upload product image"
            />

            <div className="min-w-0">
              <h2 id="drawer-title" className="text-base sm:text-lg font-bold text-text-primary truncate">Update Product</h2>
              <p className="text-xs text-text-muted truncate mt-0.5" title={product.name}>{product.name}</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full text-text-secondary hover:text-text-primary hover:bg-background-subtle dark:hover:bg-white/[0.08] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tabs - Segmented Control */}
        <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-1 bg-background-subtle dark:bg-white/[0.06] dark:backdrop-blur-md rounded-xl flex border border-border/40 dark:border-white/[0.06] flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-lg transition-all',
              activeTab === 'info'
                ? 'bg-surface dark:bg-white/[0.12] text-primary dark:text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Info size={14} />
            Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-lg transition-all',
              activeTab === 'stock'
                ? 'bg-surface dark:bg-white/[0.12] text-primary dark:text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Package size={14} />
            Stock
            {stockDirty && <span className="w-2 h-2 rounded-full bg-success ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-lg transition-all',
              activeTab === 'pricing'
                ? 'bg-surface dark:bg-white/[0.12] text-primary dark:text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <DollarSign size={14} />
            Pricing
            {pricingDirty && <span className="w-2 h-2 rounded-full bg-success ml-0.5" />}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">
            {activeTab === 'info' ? (
              <div className="flex flex-col gap-3.5 sm:gap-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">SKU</p>
                  <p className="text-sm font-medium text-text-primary font-mono truncate">{product.sku || '—'}</p>
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Barcode</p>
                  <p className="text-sm font-medium text-text-primary font-mono truncate">{product.barcode || '—'}</p>
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Current Stock</p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">{product.current_qty ?? '—'}</p>
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Category</p>
                  <CategoryPicker
                    value={categoryId}
                    categories={categories?.map((c: any) => ({ id: c.id, name: c.name || c.category || '', parent_id: c.parent_id })) ?? []}
                    onChange={setCategoryId}
                    size="md"
                  />
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Cost (Per Unit)</p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">৳{(product.cost || 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Selling Price</p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">৳{(product.price || 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">MRP</p>
                  <p className="text-sm font-medium text-text-primary tabular-nums">৳{(product.mrp || 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Status</p>
                  <p className="text-sm font-medium text-text-primary">{product.reorder_status || (product.is_active ? 'Active' : 'Inactive')}</p>
                </div>
                {/* Low Stock Alert (editable) */}
                <div className="p-3.5 bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08] rounded-xl shadow-sm col-span-2">
                  <p className="text-[11px] text-text-muted tracking-wide mb-1">Low Stock Alert (min_qty)</p>
                  {isEditingMinQty ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={editingMinQty ?? ''}
                        onChange={(e) => setEditingMinQty(parseInt(e.target.value) || 0)}
                        aria-label="Low stock alert threshold (min_qty)"
                        className="w-24 rounded-lg border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary text-sm px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => minQtyMutation.mutate(editingMinQty ?? 0)}
                        disabled={minQtyMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-on text-xs font-semibold disabled:opacity-50 shadow-sm"
                      >
                        {minQtyMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditingMinQty(false); setEditingMinQty(null); }}
                        className="px-3 py-1.5 rounded-lg border border-border dark:border-white/[0.12] text-text-muted text-xs hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary tabular-nums">{(product as any).min_qty ?? 5}</p>
                      <button
                        type="button"
                        onClick={() => { setEditingMinQty((product as any).min_qty ?? 5); setIsEditingMinQty(true); }}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-background-subtle dark:bg-white/[0.03] dark:backdrop-blur-sm rounded-xl border border-border dark:border-white/[0.08] mt-2">
                 <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} className="text-text-muted"/>
                    <h3 className="text-sm font-semibold text-text-primary">History & Insights</h3>
                 </div>
                 <p className="text-xs text-text-muted mb-1">Last Purchased: <span className="text-text-primary font-medium">{product.last_purchased_date ? new Date(product.last_purchased_date).toLocaleDateString() : 'Unknown'}</span></p>
                 <p className="text-xs text-text-muted">To view detailed price history or ledger entries, visit the item's ledger page.</p>
              </div>
            </div>
          ) : activeTab === 'stock' ? (
            <>
              {/* Mode Selection */}
              <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="Stock adjustment mode">
                <button
                  type="button"
                  onClick={() => setStockMode('add')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 active:scale-95',
                    stockMode === 'add'
                      ? `${stockColors.add.bg} ${stockColors.add.text} ${stockColors.add.border} font-bold shadow-sm`
                      : 'bg-surface dark:bg-white/[0.03] text-text-muted border-border dark:border-white/[0.08] hover:bg-background-subtle'
                  )}
                  aria-pressed={stockMode === 'add' ? true : false}
                >
                  <Plus size={18} /><span className="text-xs">Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('remove')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 active:scale-95',
                    stockMode === 'remove'
                      ? `${stockColors.remove.bg} ${stockColors.remove.text} ${stockColors.remove.border} font-bold shadow-sm`
                      : 'bg-surface dark:bg-white/[0.03] text-text-muted border-border dark:border-white/[0.08] hover:bg-background-subtle'
                  )}
                  aria-pressed={stockMode === 'remove' ? true : false}
                >
                  <Minus size={18} /><span className="text-xs">Remove</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('set')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 active:scale-95',
                    stockMode === 'set'
                      ? `${stockColors.set.bg} ${stockColors.set.text} ${stockColors.set.border} font-bold shadow-sm`
                      : 'bg-surface dark:bg-white/[0.03] text-text-muted border-border dark:border-white/[0.08] hover:bg-background-subtle'
                  )}
                  aria-pressed={stockMode === 'set' ? true : false}
                >
                  <RotateCcw size={18} /><span className="text-xs">Set</span>
                </button>
              </div>

              {/* Quantity Input */}
              <div className="form-group">
                <label htmlFor="quantity-input" className="block text-xs font-medium text-text-muted mb-1.5">
                  {stockMode === 'set' ? 'Target Stock' : `Quantity to ${stockMode === 'add' ? 'Add' : 'Remove'}`}
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                  min={0}
                  className="w-full px-3.5 rounded-xl border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-12 text-base tabular-nums"
                />
              </div>

              {/* Reason Selection */}
              <div className="form-group">
                <label htmlFor="reason-select" className="block text-xs font-medium text-text-muted mb-1.5">Reason for change</label>
                <select
                  id="reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3.5 rounded-xl border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-12 text-sm"
                >
                  {stockReasons.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="notes-textarea" className="block text-xs font-medium text-text-muted mb-1.5">Notes <span className="text-text-muted/70 font-normal">(optional)</span></label>
                <textarea
                  id="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received new shipment from supplier"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all text-sm"
                />
              </div>
            </>
          ) : (
            /* Pricing Tab */
            <>
              {/* Selling Price */}
              <div className="form-group">
                <label htmlFor="selling-price" className="block text-xs font-medium text-text-muted mb-1.5">
                  Selling Price <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-medium">৳</span>
                  <input
                    id="selling-price"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3.5 rounded-xl border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-12 text-base tabular-nums"
                  />
                </div>
              </div>

              {/* MRP */}
              <div className="form-group">
                <label htmlFor="mrp" className="block text-xs font-medium text-text-muted mb-1.5">MRP</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-medium">৳</span>
                  <input
                    id="mrp"
                    type="number"
                    min={0}
                    step="0.01"
                    value={mrp ?? ''}
                    onChange={(e) => setMrp(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3.5 rounded-xl border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-12 text-base tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">Shown to customers as reference / sticker price</p>
              </div>

              {/* Cost Price */}
              <div className="form-group">
                <label htmlFor="cost-price" className="block text-xs font-medium text-text-muted mb-1.5">Cost Price</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-medium">৳</span>
                  <input
                    id="cost-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice ?? ''}
                    onChange={(e) => setCostPrice(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3.5 rounded-xl border border-border dark:border-white/[0.12] bg-surface dark:bg-white/[0.04] text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-12 text-base tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">Used for accurate gross profit margin calculations</p>
              </div>

              {/* Live Margin Preview */}
              <div className="p-4 rounded-xl bg-primary/10 dark:bg-primary/[0.08] dark:backdrop-blur-md border border-primary/20 dark:border-primary/30 dark:border-t-primary/50">
                <p className="text-xs text-text-muted tracking-wide mb-1 font-medium">Expected Profit Margin</p>
                {margin ? (
                  <p className="text-lg font-bold text-primary tabular-nums">
                    ৳{margin.profit.toFixed(2)} ({margin.pct.toFixed(1)}%)
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">Enter cost and selling price to see live margin</p>
                )}
              </div>

              {/* Price History */}
              <div className="p-4 rounded-xl bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-text-primary">Price History</h3>
                </div>
                <PriceHistoryMini productId={product?.id} storeId={storeId} />
              </div>

              {/* Competitor Prices */}
              <div className="p-4 rounded-xl bg-surface dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-text-primary">Competitor Prices</h3>
                </div>
                {isLoadingCompetitors ? (
                  <p className="text-xs text-text-muted animate-pulse">Loading...</p>
                ) : competitorPrices && competitorPrices.length > 0 ? (
                  <ul className="space-y-2">
                    {competitorPrices.map(comp => (
                      <li key={comp.id} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary font-medium">{comp.competitor_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-primary font-semibold tabular-nums">৳{comp.competitor_price}</span>
                          {comp.competitor_url && (
                            <a 
                              href={comp.competitor_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-[11px]"
                            >
                              Link
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted">No competitor prices found.</p>
                )}
              </div>
            </>
          )}

          </div>

          {/* Sticky Submit Footer */}
          <div className="p-4 sm:px-6 sm:py-4 bg-surface/95 dark:bg-[#141417]/95 backdrop-blur-lg border-t border-border/40 dark:border-white/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.4)] pb-[max(env(safe-area-inset-bottom,16px),16px)] flex-shrink-0">
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full h-12 py-3 px-4 bg-primary text-primary-on rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.98] transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-busy={saveMutation.isPending ? true : false}
            >
              <Save size={18} />
              {getButtonLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
