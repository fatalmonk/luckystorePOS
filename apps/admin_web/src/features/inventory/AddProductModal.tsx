import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Plus, Upload, X, Package } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface ProductAddModalProps {
  isOpen: boolean;
  categories?: Category[];
  onClose: () => void;
}

export function ProductAddModal({ isOpen, categories, onClose }: ProductAddModalProps) {
  const { storeId, tenantId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const margin = cost > 0 && price > 0 ? Math.round(((price - cost) / cost) * 100) : null;
  const lowMargin = margin !== null && margin < 10;

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

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        setUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        imageUrl = urlData?.publicUrl ?? '';
        setUploading(false);
      }

      // 2. Create item
      const insertData: any = {
        tenant_id: tenantId,
        name,
        sku: sku || null,
        barcode: barcode || null,
        category_id: categoryId || null,
        price,
        cost: cost || null,
        mrp: mrp || null,
        image_url: imageUrl || null,
        is_active: true,
      };
      const { data: item, error: createError } = await supabase
        .from('items')
        .insert(insertData)
        .select()
        .single();
      if (createError) throw new Error(createError.message);

      // 3. Create initial stock movement if stock > 0
      if (initialStock > 0 && storeId) {
        const { error: stockError } = await supabase.rpc('adjust_stock', {
          p_store_id: storeId,
          p_item_id: item.id,
          p_delta: initialStock,
          p_reason: 'received',
          p_notes: notes || `Initial stock${purchaseDate ? ` (purchased ${purchaseDate})` : ''}`,
        });
        if (stockError) console.warn('Stock creation failed:', stockError);
      }

      return item;
    },
    onSuccess: () => {
      notify(`"${name}" added to inventory.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      // Reset form
      setName('');
      setSku('');
      setBarcode('');
      setCategoryId('');
      setPrice(0);
      setCost(0);
      setMrp(0);
      setInitialStock(0);
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setImageFile(null);
      setImagePreview(null);
      onClose();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Product to Inventory" size="lg">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="flex flex-col gap-6">
        {/* Image Upload */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-warm-border-warm bg-warm-surface flex items-center justify-center flex-shrink-0">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Package size={32} className="text-warm-dim opacity-40" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="add-image-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg text-sm font-medium hover:bg-warm-border-warm/40 transition-colors"
            >
              <Upload size={16} />
              {imageFile ? 'Change Image' : 'Upload Image'}
            </button>
            {imageFile && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="flex items-center gap-1 text-xs text-warm-muted hover:text-warm-danger"
              >
                <X size={14} /> Remove
              </button>
            )}
            <p className="text-[11px] text-warm-muted">Product photo (optional)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Product Name *"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="e.g. Dano Daily Pusti 1kg"
            className="col-span-2"
          />

          {/* Category */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-sm font-medium text-warm-fg">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="px-3 py-[11px] rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all text-sm"
            >
              <option value="">Select Category</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Pricing Section */}
          <div className="col-span-2 text-xs font-bold uppercase tracking-wider text-warm-muted pt-2 border-t border-warm-border-warm/40">
            Pricing
          </div>

          <Input
            label="Sales Price (৳) *"
            type="number"
            value={price}
            onChange={e => setPrice(parseFloat(e.target.value) || 0)}
            required
            min={0}
            step="0.01"
          />
          <Input
            label="MRP (৳)"
            type="number"
            value={mrp}
            onChange={e => setMrp(parseFloat(e.target.value) || 0)}
            min={0}
            step="0.01"
            placeholder="Max retail price"
          />
          <Input
            label="Cost / Purchase Price (৳)"
            type="number"
            value={cost}
            onChange={e => setCost(parseFloat(e.target.value) || 0)}
            min={0}
            step="0.01"
          />

          {/* Margin indicator */}
          {margin !== null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
              lowMargin ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {lowMargin ? '⚠' : '✓'} Margin: {margin}%
            </div>
          )}

          {/* Identification */}
          <div className="col-span-2 text-xs font-bold uppercase tracking-wider text-warm-muted pt-2 border-t border-warm-border-warm/40">
            Identification
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Item Code (SKU)"
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="DDP-001"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSku('SKU-' + Math.floor(Math.random() * 100000))}
              className="mb-[2px]"
            >
              Generate
            </Button>
          </div>
          <Input
            label="Barcode"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            placeholder="LS-000001"
          />

          {/* Initial Stock */}
          <div className="col-span-2 text-xs font-bold uppercase tracking-wider text-warm-muted pt-2 border-t border-warm-border-warm/40">
            Initial Stock
          </div>

          <Input
            label="Initial Quantity"
            type="number"
            value={initialStock}
            onChange={e => setInitialStock(parseInt(e.target.value) || 0)}
            min={0}
          />
          <Input
            label="Purchase Date"
            type="date"
            value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
          />

          {/* Notes */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-sm font-medium text-warm-fg">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Supplier name, batch info, etc."
              className="px-3 py-2 rounded-md border border-warm-border-warm bg-warm-surface text-warm-fg focus:ring-2 focus:ring-warm-accent focus:border-transparent transition-all text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-warm-border-warm">
          <p className="text-[11px] text-warm-muted">
            {sku && <span>SKU: {sku}</span>}
            {barcode && <span className="ml-3">Barcode: {barcode}</span>}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button
              type="submit"
              loading={createMutation.isPending || uploading}
              icon={<Plus size={18} />}
              disabled={!name || !price}
            >
              Add Product
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
