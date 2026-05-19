import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Save, Plus, Minus, RotateCcw, Upload, ImageIcon, Package, DollarSign } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useNotify } from '../../components/NotificationContext';

interface ProductUpdateDrawerProps {
  product: any | null;
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
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'stock' | 'pricing'>('stock');

  // Stock tab state
  const [stockMode, setStockMode] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('received');
  const [notes, setNotes] = useState<string>('');
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing tab state
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number | undefined>(undefined);
  const [costPrice, setCostPrice] = useState<number | undefined>(undefined);

  // Dirty tracking
  const [stockDirty, setStockDirty] = useState(false);
  const [pricingDirty, setPricingDirty] = useState(false);

  // Initialize values from product
  useEffect(() => {
    if (product) {
      setSellingPrice(product.price || 0);
      setMrp(product.mrp ?? undefined);
      setCostPrice(product.cost ?? undefined);
    }
  }, [product?.id]);

  // Track dirtiness
  useEffect(() => {
    if (!product) return;
    setPricingDirty(
      sellingPrice !== (product.price || 0) ||
      (mrp ?? 0) !== (product.mrp || 0) ||
      (costPrice ?? 0) !== (product.cost || 0)
    );
  }, [sellingPrice, mrp, costPrice, product]);

  useEffect(() => {
    setStockDirty(quantity > 0 || notes !== '');
  }, [quantity, notes]);

  // Focus the close button when drawer opens
  useEffect(() => {
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key
  useEffect(() => {
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

  // Mutations
  const imageMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${product.id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');
      const { error: updateError } = await supabase
        .from('items')
        .update({ image_url: publicUrl })
        .eq('id', product.id);
      if (updateError) throw new Error(updateError.message);
      return { image_url: publicUrl };
    },
    onSuccess: () => {
      notify('Image updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (err: any) => notify(err.message || 'Failed to upload image.', 'error'),
  });

  const stockMutation = useMutation({
    mutationFn: async () => {
      if (stockMode === 'set') {
        return api.inventory.set(storeId, product.id, quantity, reason, notes);
      } else {
        const delta = stockMode === 'add' ? quantity : -quantity;
        return api.inventory.update(storeId, product.id, delta, reason, notes, idempotencyKey);
      }
    },
    onSuccess: (res) => {
      if (res.is_duplicate) {
        notify('This update was already processed.', 'info');
      } else {
        notify(`Stock updated for ${product.name}`, 'success');
        onSuccess?.(product.name);
      }
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      if (!pricingDirty) onClose();
    },
    onError: (err: any) => notify(err.message || 'Failed to update stock.', 'error'),
  });

  const priceMutation = useMutation({
    mutationFn: async () => {
      const updates: any = {
        price: sellingPrice,
      };
      if (typeof mrp === 'number') updates.mrp = mrp;
      if (typeof costPrice === 'number') updates.cost = costPrice;
      return api.products.update(product.id, updates);
    },
    onSuccess: () => {
      notify(`Prices updated for ${product.name}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (!stockDirty) onClose();
    },
    onError: (err: any) => notify(err.message || 'Failed to update prices.', 'error'),
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockDirty && !stockMutation.isPending) stockMutation.mutate();
    if (pricingDirty && !priceMutation.isPending) priceMutation.mutate();
  };

  const stockColors = {
    add: { bg: 'bg-success-subtle', text: 'text-success-dark', border: 'border-success-default' },
    remove: { bg: 'bg-danger-subtle', text: 'text-danger-default', border: 'border-danger-default' },
    set: { bg: 'bg-primary-subtle', text: 'text-primary-default', border: 'border-primary-default' },
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
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity z-40" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`
          fixed z-50 bg-surface-default shadow-xl flex flex-col animate-slideInRight
          lg:relative lg:ml-auto lg:w-full lg:max-w-[450px] lg:h-full
          max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:h-[85vh] max-lg:rounded-t-2xl max-lg:animate-slideUp
        `}
      >
        {/* Drag handle for mobile */}
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <header className="flex justify-between items-start p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div>
            <h2 id="drawer-title" className="text-xl font-bold text-text-primary">Update Product</h2>
            <p className="text-sm text-text-secondary mt-1">{product.name}</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-md text-text-secondary hover:text-text-primary hover:bg-background-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
            aria-label="Close drawer"
          >
            <X size={24} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border-default bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors',
              activeTab === 'stock'
                ? 'text-primary-default border-b-2 border-primary-default bg-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-slate-100'
            )}
          >
            <Package size={16} />
            Stock
            {stockDirty && <span className="w-2 h-2 rounded-full bg-success-default" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors',
              activeTab === 'pricing'
                ? 'text-primary-default border-b-2 border-primary-default bg-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-slate-100'
            )}
          >
            <DollarSign size={16} />
            Pricing
            {pricingDirty && <span className="w-2 h-2 rounded-full bg-success-default" />}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'stock' ? (
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
                      : 'bg-transparent text-text-secondary border-border-default hover:bg-background-subtle focus:ring-primary-default'
                  )}
                  aria-pressed={stockMode === 'add'}
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
                      : 'bg-transparent text-text-secondary border-border-default hover:bg-background-subtle focus:ring-primary-default'
                  )}
                  aria-pressed={stockMode === 'remove'}
                >
                  <Minus size={20} /><span className="font-semibold text-sm">Remove</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode('set')}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-3 rounded-md border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    stockMode === 'set'
                      ? `${stockColors.set.bg} ${stockColors.set.text} border-${stockColors.set.border} focus:ring-primary-default`
                      : 'bg-transparent text-text-secondary border-border-default hover:bg-background-subtle focus:ring-primary-default'
                  )}
                  aria-pressed={stockMode === 'set'}
                >
                  <RotateCcw size={20} /><span className="font-semibold text-sm">Set</span>
                </button>
              </div>

              {/* Product Image */}
              <div className="form-group">
                <label className="block text-sm font-medium text-text-secondary mb-2">Product Image</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-[72px] h-[72px] rounded-md overflow-hidden border border-border-default bg-surface-default flex-shrink-0"
                    role="img"
                    aria-label={product.image_url || imagePreview ? `Product image of ${product.name}` : 'No product image'}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted"><ImageIcon size={28} /></div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border-default bg-surface-default text-text-primary text-sm font-medium hover:bg-background-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
                    >
                      <Upload size={16} />
                      {imageFile ? 'Change Image' : 'Upload Image'}
                    </button>
                    {imageFile && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => imageMutation.mutate(imageFile)}
                          disabled={imageMutation.isPending}
                          className="flex-1 px-3 py-2 rounded-md border-none bg-primary-default text-white text-sm font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
                        >
                          {imageMutation.isPending ? 'Uploading...' : 'Save Image'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="px-2 py-2 rounded-md border border-border-default bg-surface-default text-text-secondary hover:text-text-primary hover:bg-background-subtle transition-colors"
                          aria-label="Remove selected image"
                        ><X size={16} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="form-group">
                <label htmlFor="quantity-input" className="block text-sm font-medium text-text-secondary mb-1">
                  {stockMode === 'set' ? 'Target Stock' : `Quantity to ${stockMode === 'add' ? 'Add' : 'Remove'}`}
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                  min={0}
                  className="w-full px-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent transition-all duration-200 h-12 text-base"
                />
              </div>

              {/* Reason Selection */}
              <div className="form-group">
                <label htmlFor="reason-select" className="block text-sm font-medium text-text-secondary mb-1">Reason for change</label>
                <select
                  id="reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent transition-all duration-200 h-12 text-base"
                >
                  {stockReasons.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="notes-textarea" className="block text-sm font-medium text-text-secondary mb-1">Notes <span className="text-text-muted font-normal">(optional)</span></label>
                <textarea
                  id="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Broken during handling"
                  rows={4}
                  className="w-full px-3 py-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent resize-none transition-all duration-200"
                />
              </div>
            </>
          ) : (
            /* Pricing Tab */
            <>
              {/* Selling Price */}
              <div className="form-group">
                <label htmlFor="selling-price" className="block text-sm font-medium text-text-secondary mb-1">
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
                    className="w-full pl-8 pr-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent transition-all duration-200 h-12 text-base"
                  />
                </div>
              </div>

              {/* MRP */}
              <div className="form-group">
                <label htmlFor="mrp" className="block text-sm font-medium text-text-secondary mb-1">MRP</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                  <input
                    id="mrp"
                    type="number"
                    min={0}
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent transition-all duration-200 h-12 text-base"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Shown to customers as reference price</p>
              </div>

              {/* Cost Price */}
              <div className="form-group">
                <label htmlFor="cost-price" className="block text-sm font-medium text-text-secondary mb-1">Cost Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                  <input
                    id="cost-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent transition-all duration-200 h-12 text-base"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">For margin calculation</p>
              </div>

              {/* Live Margin Preview */}
              <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
                <p className="text-sm text-text-secondary mb-1">Profit margin</p>
                {margin ? (
                  <p className="text-lg font-semibold text-success-default tabular-nums">
                    ৳{margin.profit.toFixed(2)} ({margin.pct}%)
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">Enter cost and selling price to see margin</p>
                )}
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="mt-auto pt-8 pb-4">
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full py-3 px-4 bg-primary-default text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover active:scale-[0.98] transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
              aria-busy={stockMutation.isPending || priceMutation.isPending}
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
