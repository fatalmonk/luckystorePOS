import { useState, useRef, useEffect } from 'react';
import { X, Save, Plus, Minus, RotateCcw, Upload, ImageIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useNotify } from '../../components/NotificationContext';

interface StockUpdateDrawerProps {
  product: unknown | null;
  storeId: string;
  onClose: () => void;
}

const reasons = [
  { value: 'received', label: 'Purchase' },
  { value: 'correction', label: 'Sale correction' },
  { value: 'damaged', label: 'Damage' },
  { value: 'lost', label: 'Theft/loss' },
  { value: 'returned', label: 'Return' },
  { value: 'other', label: 'Manual fix' },
];

export function StockUpdateDrawer({ product, storeId, onClose }: StockUpdateDrawerProps) {
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('received');
  const [notes, setNotes] = useState<string>('');
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

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
      if (e.key === 'Escape') {
        onClose();
      }
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

  const imageMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${product.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

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
    onError: (err: unknown) => {
      notify(err.message || 'Failed to upload image.', 'error');
    },
  });

  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'set') {
        return api.inventory.set(storeId, product.id, quantity, reason, notes);
      } else {
        const delta = mode === 'add' ? quantity : -quantity;
        return api.inventory.update(storeId, product.id, delta, reason, notes, idempotencyKey);
      }
    },
    onSuccess: (res) => {
      if (res.is_duplicate) {
        notify('This update was already processed.', 'info');
      } else {
        notify('Stock updated successfully.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
      onClose();
    },
    onError: (err: unknown) => {
      notify(err.message || 'Failed to update stock. Please try again.', 'error');
    }
  });

  if (!product) return null;

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
    adjustmentMutation.mutate();
  };

  const modeColors = {
    add: {
      bg: 'bg-success-subtle',
      text: 'text-success-dark',
      border: 'border-success-default',
    },
    remove: {
      bg: 'bg-danger-subtle',
      text: 'text-danger-default',
      border: 'border-danger-default',
    },
    set: {
      bg: 'bg-primary-subtle',
      text: 'text-primary-default',
      border: 'border-primary-default',
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-color-surface-overlay transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative ml-auto w-full max-w-[450px] h-full bg-surface-default shadow-lg flex flex-col"
      >
        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <h2
              id="stock-drawer-title"
              className="text-xl font-bold text-text-primary"
            >
              Update Stock
            </h2>
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 flex-1 overflow-y-auto"
        >
          {/* Mode Selection */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Stock adjustment mode">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={clsx(
                'flex flex-col items-center gap-1 p-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                mode === 'add'
                  ? `${modeColors.add.bg} ${modeColors.add.text} border-${modeColors.add.border} focus:ring-success-default`
                  : 'bg-transparent text-text-secondary border-border-default hover:bg-background-subtle focus:ring-primary-default'
              )}
              aria-pressed={mode === 'add'}
            >
              <Plus size={20} />
              <span className="font-semibold text-sm">Add</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('remove')}
              className={clsx(
                'flex flex-col items-center gap-1 p-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                mode === 'remove'
                  ? `${modeColors.remove.bg} ${modeColors.remove.text} border-${modeColors.remove.border} focus:ring-danger-default`
                  : 'bg-transparent text-text-secondary border-border-default hover:bg-background-subtle focus:ring-primary-default'
              )}
              aria-pressed={mode === 'remove'}
            >
              <Minus size={20} />
              <span className="font-semibold text-sm">Remove</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('set')}
              className={clsx(
                'flex flex-col items-center gap-1 p-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                mode === 'set'
                  ? `${modeColors.set.bg} ${modeColors.set.text} border-${modeColors.set.border} focus:ring-primary-default`
                  : 'bg-transparent text-text-secondary border-border-default hover:bg-background-subtle focus:ring-primary-default'
              )}
              aria-pressed={mode === 'set'}
            >
              <RotateCcw size={20} />
              <span className="font-semibold text-sm">Set</span>
            </button>
          </div>

          {/* Product Image */}
          <div className="form-group">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Product Image
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-[72px] h-[72px] rounded-md overflow-hidden border border-border-default bg-surface-default flex-shrink-0"
                role="img"
                aria-label={product.image_url || imagePreview ? `Product image of ${product.name}` : 'No product image'}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <ImageIcon size={28} />
                  </div>
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
                      {imageMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </span>
                      ) : (
                        'Save Image'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="px-2 py-2 rounded-md border border-border-default bg-surface-default text-text-secondary hover:text-text-primary hover:bg-background-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
                      aria-label="Remove selected image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="form-group">
            <label
              htmlFor="quantity-input"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {mode === 'set'
                ? 'Target Stock'
                : `Quantity to ${mode === 'add' ? 'Add' : 'Remove'}`}
            </label>
            <input
              id="quantity-input"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
              min={0}
              className="w-full px-3 py-3 text-xl font-bold text-center rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent"
            />
          </div>

          {/* Reason Selection */}
          <div className="form-group">
            <label
              htmlFor="reason-select"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              Reason for change
            </label>
            <select
              id="reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent"
            >
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label
              htmlFor="notes-textarea"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              Notes <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="notes-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken during handling"
              rows={4}
              className="w-full px-3 py-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="mt-auto pt-8">
            <button
              type="submit"
              disabled={adjustmentMutation.isPending}
              className="w-full py-3 px-4 bg-primary-default text-white rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary-default focus:ring-offset-2"
              aria-busy={adjustmentMutation.isPending}
            >
              <Save size={18} />
              {adjustmentMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </span>
              ) : (
                'Confirm Update'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
