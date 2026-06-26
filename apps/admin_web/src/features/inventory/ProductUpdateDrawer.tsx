import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Save, Plus, Minus, RotateCcw, Upload, ImageIcon, Package, DollarSign, Info, Activity } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { fetchCompetitorPrices } from '../../lib/api/domains/competitorPrices';
import { supabase } from "@/lib/supabase";
import { uploadToR2 } from '../../lib/r2';
import { clsx } from 'clsx';
import { useNotify } from '../../components/NotificationContext';
import { useAuth } from '../../lib/AuthContext';
import type { Database } from '../../lib/database.types';
import { PriceHistoryMini } from './PriceHistoryMini';

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

  // Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'stock' | 'pricing'>('info');

  // Stock tab state
  const [stockMode, setStockMode] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('received');
  const [notes, setNotes] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing tab state
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number | undefined>(undefined);
  const [costPrice, setCostPrice] = useState<number | undefined>(undefined);

  // Min qty editing state
  const [editingMinQty, setEditingMinQty] = useState<number | null>(null);
  const [isEditingMinQty, setIsEditingMinQty] = useState(false);
  const minQtyMutation = useMutation({
    mutationFn: async (newMinQty: number) => {
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
    sellingPrice !== (product.price || 0) ||
    (mrp ?? 0) !== (product.mrp || 0) ||
    (costPrice ?? 0) !== (product.cost || 0)
  ) : false;

  const stockDirty = quantity > 0 || notes !== '';

  const [prevProductId, setPrevProductId] = useState(product?.id);
  if (product?.id !== prevProductId) {
    setPrevProductId(product?.id);
    setSellingPrice(product?.price || 0);
    setMrp(product?.mrp ?? undefined);
    setCostPrice(product?.cost ?? undefined);
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
    if (!cp || cp <= 0 || !sp) return null;
    const profit = sp - cp;
    const pct = Math.round((profit / cp) * 100);
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
      // Upload to R2 CDN via Worker (not Supabase Storage)
      const fileExt = file.name.split('.').pop() || 'jpg';
      const r2Key = `products/${product.id}/${crypto.randomUUID()}.${fileExt}`;
      const publicUrl = await uploadToR2(file, r2Key);
      // Persist the new image_url in the items table
      await api.inventory.updateProduct(storeId, product.id, { image_url: publicUrl });
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

  const stockMutation = useMutation({
    mutationFn: async () => {
      if (stockMode === 'set') {
        return api.inventory.set(storeId, product.id, quantity, reason, notes);
      } else {
        const delta = stockMode === 'add' ? quantity : -quantity;
        return api.inventory.update(storeId, product.id, delta, reason, notes);
      }
    },
    onSuccess: () => {
      notify(`Stock updated for ${product.name}`, 'success');
      onSuccess?.(product.name);
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      if (!pricingDirty) onClose();
    },
    onError: (err: Error) => notify(err.message || 'Failed to update stock.', 'error'),
  });

  const priceMutation = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('No product selected');
      const updates: Partial<Database['public']['Tables']['items']['Update']> = {
        price: sellingPrice,
      };
      if (typeof mrp === 'number') updates.mrp = mrp;
      if (typeof costPrice === 'number') updates.cost = costPrice;
      return api.products.update(product.id, updates, product.tenant_id || tenantId);
    },
    onSuccess: () => {
      notify(`Prices updated for ${product.name}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (!stockDirty) onClose();
    },
    onError: (err: Error) => notify(err.message || 'Failed to update prices.', 'error'),
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
    if (stockDirty && !stockMutation.isPending) stockMutation.mutate();
    if (pricingDirty && !priceMutation.isPending) priceMutation.mutate();
  };

  const stockColors = {
    add: { bg: 'bg-success-subtle', text: 'text-success-dark', border: 'border-success-default' },
    remove: { bg: 'bg-danger-subtle', text: 'text-danger-default', border: 'border-danger-default' },
    set: { bg: 'bg-primary-subtle', text: 'text-warm-accent', border: 'border-primary-default' },
  };

  // Button label logic
  const getButtonLabel = () => {
    if (stockMutation.isPending || priceMutation.isPending) {
      return 'Saving...';
    }
    if (stockDirty && pricingDirty) return 'Save Price & Stock';
    if (pricingDirty) return 'Save Price Only';
    if (stockDirty) return 'Save Stock Only';
    return 'Save Changes';
  };

  const isButtonDisabled = (!stockDirty && !pricingDirty) || stockMutation.isPending || priceMutation.isPending;

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`app-warm
          fixed z-50 bg-warm-surface shadow-xl flex flex-col animate-slideInRight
          lg:relative lg:ml-auto lg:w-full lg:max-w-[450px] lg:h-full
          max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:h-[85vh] max-lg:rounded-t-2xl max-lg:animate-slideUp
        `}
      >
        {/* Drag handle for mobile */}
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 rounded-full bg-warm-border-warm" />
        </div>

        {/* Header */}
        <header className="flex justify-between items-start p-6 border-b border-warm-border-warm bg-warm-surface sticky top-0 z-10">
          <div className="flex gap-4 items-center">
            {/* Quick Image Upload */}
            <div 
              className="relative group cursor-pointer w-14 h-14 rounded-md border border-warm-border-warm bg-warm-surface overflow-hidden flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Click to change image"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-warm-dim"><ImageIcon size={24} /></div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
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
              <h2 id="drawer-title" className="text-xl font-bold text-warm-fg font-display truncate pr-4">Update Product</h2>
              <p className="text-sm text-warm-muted mt-1 truncate pr-4" title={product.name}>{product.name}</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-md text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/50 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent focus:ring-offset-2"
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </header>

        {/* Tabs - Segmented Control */}
        <div className="mx-6 mt-4 p-1 bg-warm-border-warm/50 rounded-lg flex">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-md transition-all',
              activeTab === 'info'
                ? 'bg-warm-surface text-warm-accent shadow-sm'
                : 'text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/70'
            )}
          >
            <Info size={16} />
            Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-md transition-all',
              activeTab === 'stock'
                ? 'bg-warm-surface text-warm-accent shadow-sm'
                : 'text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/70'
            )}
          >
            <Package size={16} />
            Stock
            {stockDirty && <span className="w-2 h-2 rounded-full bg-success-default ml-1" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-md transition-all',
              activeTab === 'pricing'
                ? 'bg-warm-surface text-warm-accent shadow-sm'
                : 'text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/70'
            )}
          >
            <DollarSign size={16} />
            Pricing
            {pricingDirty && <span className="w-2 h-2 rounded-full bg-success-default ml-1" />}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 overflow-y-auto p-6 bg-warm-surface">
          {activeTab === 'info' ? (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">SKU</p>
                  <p className="text-sm font-medium text-warm-fg font-mono">{product.sku || '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">Barcode</p>
                  <p className="text-sm font-medium text-warm-fg font-mono">{product.barcode || '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">Current Stock</p>
                  <p className="text-sm font-semibold text-warm-fg">{product.current_qty ?? '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">Category</p>
                  <p className="text-sm font-medium text-warm-fg">{product.category_name || product.category_id || '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">Cost (Per Unit)</p>
                  <p className="text-sm font-semibold text-warm-fg">৳{product.cost ?? '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">Selling Price</p>
                  <p className="text-sm font-semibold text-warm-fg">৳{product.price ?? '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">MRP</p>
                  <p className="text-sm font-medium text-warm-fg">৳{product.mrp ?? '—'}</p>
                </div>
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm">
                  <p className="text-xs text-warm-muted mb-1">Status</p>
                  <p className="text-sm font-medium text-warm-fg">{product.reorder_status || (product.is_active ? 'Active' : 'Inactive')}</p>
                </div>
                {/* Low Stock Alert (editable) */}
                <div className="p-3 bg-warm-surface border border-warm-border-warm rounded-lg shadow-sm col-span-2">
                  <p className="text-xs text-warm-muted mb-1">Low Stock Alert (min_qty)</p>
                  {isEditingMinQty ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={editingMinQty ?? ''}
                        onChange={(e) => setEditingMinQty(parseInt(e.target.value) || 0)}
                        aria-label="Low stock alert threshold (min_qty)"
                        className="w-20 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-warm-accent"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => minQtyMutation.mutate(editingMinQty ?? 0)}
                        disabled={minQtyMutation.isPending}
                        className="px-2 py-1 rounded-md bg-warm-accent text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {minQtyMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditingMinQty(false); setEditingMinQty(null); }}
                        className="px-2 py-1 rounded-md border border-warm-border-warm text-warm-muted text-xs hover:text-warm-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-warm-fg">{(product as any).min_qty ?? 5}</p>
                      <button
                        type="button"
                        onClick={() => { setEditingMinQty((product as any).min_qty ?? 5); setIsEditingMinQty(true); }}
                        className="text-xs text-warm-accent hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-warm-border-warm mt-2">
                 <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} className="text-warm-muted"/>
                    <h3 className="text-sm font-semibold text-warm-fg">History & Insights</h3>
                 </div>
                 <p className="text-sm text-warm-muted mb-1">Last Purchased: <span className="text-warm-fg font-medium">{product.last_purchased_date ? new Date(product.last_purchased_date).toLocaleDateString() : 'Unknown'}</span></p>
                 <p className="text-sm text-warm-muted">To view detailed price history or ledger entries, please visit the item's ledger page.</p>
              </div>
            </div>
          ) : activeTab === 'stock' ? (
            <>
              {/* Mode Selection */}
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Stock adjustment mode">
                <button
                  type="button"
                  onClick={() => setStockMode('add')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-md border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    stockMode === 'add'
                      ? `${stockColors.add.bg} ${stockColors.add.text} border-${stockColors.add.border} focus:ring-success-default`
                      : 'bg-transparent text-warm-muted border-warm-border-warm hover:bg-background-subtle focus:ring-warm-accent'
                  )}
                  aria-pressed={stockMode === 'add' ? true : false}
                >
                  <Plus size={20} /><span className="font-semibold text-sm">Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('remove')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-md border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    stockMode === 'remove'
                      ? `${stockColors.remove.bg} ${stockColors.remove.text} border-${stockColors.remove.border} focus:ring-danger-default`
                      : 'bg-transparent text-warm-muted border-warm-border-warm hover:bg-background-subtle focus:ring-warm-accent'
                  )}
                  aria-pressed={stockMode === 'remove' ? true : false}
                >
                  <Minus size={20} /><span className="font-semibold text-sm">Remove</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('set')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-md border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    stockMode === 'set'
                      ? `${stockColors.set.bg} ${stockColors.set.text} border-${stockColors.set.border} focus:ring-warm-accent`
                      : 'bg-transparent text-warm-muted border-warm-border-warm hover:bg-background-subtle focus:ring-warm-accent'
                  )}
                  aria-pressed={stockMode === 'set' ? true : false}
                >
                  <RotateCcw size={20} /><span className="font-semibold text-sm">Set</span>
                </button>
              </div>

              {/* Quantity Input */}
              <div className="form-group">
                <label htmlFor="quantity-input" className="block text-sm font-medium text-warm-muted mb-1">
                  {stockMode === 'set' ? 'Target Stock' : `Quantity to ${stockMode === 'add' ? 'Add' : 'Remove'}`}
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                  min={0}
                  className="w-full px-3 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all duration-200 h-12 text-base"
                />
              </div>

              {/* Reason Selection */}
              <div className="form-group">
                <label htmlFor="reason-select" className="block text-sm font-medium text-warm-muted mb-1">Reason for change</label>
                <select
                  id="reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all duration-200 h-12 text-base"
                >
                  {stockReasons.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="notes-textarea" className="block text-sm font-medium text-warm-muted mb-1">Notes <span className="text-warm-dim font-normal">(optional)</span></label>
                <textarea
                  id="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Broken during handling"
                  rows={4}
                  className="w-full px-3 py-3 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent resize-none transition-all duration-200"
                />
              </div>
            </>
          ) : (
            /* Pricing Tab */
            <>
              {/* Selling Price */}
              <div className="form-group">
                <label htmlFor="selling-price" className="block text-sm font-medium text-warm-muted mb-1">
                  Selling Price <span className="text-danger-default">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                  <input
                    id="selling-price"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all duration-200 h-12 text-base"
                  />
                </div>
              </div>

              {/* MRP */}
              <div className="form-group">
                <label htmlFor="mrp" className="block text-sm font-medium text-warm-muted mb-1">MRP</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                  <input
                    id="mrp"
                    type="number"
                    min={0}
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all duration-200 h-12 text-base"
                  />
                </div>
                <p className="text-xs text-warm-dim mt-1">Shown to customers as reference price</p>
              </div>

              {/* Cost Price */}
              <div className="form-group">
                <label htmlFor="cost-price" className="block text-sm font-medium text-warm-muted mb-1">Cost Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                  <input
                    id="cost-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all duration-200 h-12 text-base"
                  />
                </div>
                <p className="text-xs text-warm-dim mt-1">For margin calculation</p>
              </div>

              {/* Live Margin Preview */}
              <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
                <p className="text-sm text-warm-muted mb-1">Profit margin</p>
                {margin ? (
                  <p className="text-lg font-semibold text-success-default tabular-nums">
                    ৳{margin.profit.toFixed(2)} ({margin.pct}%)
                  </p>
                ) : (
                  <p className="text-sm text-warm-dim">Enter cost and selling price to see margin</p>
                )}
              </div>

              {/* Price History */}
              <div className="p-4 rounded-lg bg-warm-surface border border-warm-border-warm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-warm-fg">Price History</h3>
                </div>
                <PriceHistoryMini productId={product?.id} storeId={storeId} />
              </div>
              {/* Competitor Prices */}
              <div className="p-4 rounded-lg bg-warm-surface border border-warm-border-warm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-warm-fg">Competitor Prices</h3>
                </div>
                {isLoadingCompetitors ? (
                  <p className="text-sm text-warm-muted animate-pulse">Loading...</p>
                ) : competitorPrices && competitorPrices.length > 0 ? (
                  <ul className="space-y-2">
                    {competitorPrices.map(comp => (
                      <li key={comp.id} className="flex items-center justify-between text-sm">
                        <span className="text-warm-fg font-medium">{comp.competitor_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-warm-fg font-semibold tabular-nums">৳{comp.competitor_price}</span>
                          {comp.competitor_url && (
                            <a 
                              href={comp.competitor_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-warm-accent hover:underline text-xs"
                            >
                              Link
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-warm-dim">No competitor prices found.</p>
                )}
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="mt-auto pt-8 pb-4">
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full py-3 px-4 bg-warm-accent text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-warm-accent-light active:scale-[0.98] transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-warm-accent focus:ring-offset-2"
              aria-busy={stockMutation.isPending || priceMutation.isPending ? true : false}
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
