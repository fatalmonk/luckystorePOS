import { useState, useRef } from 'react';
import { X, Save, Plus, Minus, RotateCcw, Upload, ImageIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

interface StockUpdateDrawerProps {
  product: any | null;
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

import { useNotify } from '../../components/NotificationContext';

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
    onError: (err: any) => {
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
    onError: (err: any) => {
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

  return (
    <div 
      className="drawer-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
        backdropFilter: 'blur(2px)'
      }}
    >
      <div 
        className="drawer-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'var(--bg-card)',
          height: '100%',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-6)'
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700' }}>Update Stock</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={24} /></button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
            <button 
              type="button"
              onClick={() => setMode('add')}
              className={clsx('mode-btn', mode === 'add' && 'active')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                backgroundColor: mode === 'add' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: mode === 'add' ? 'var(--color-success)' : 'var(--text-muted)',
                fontWeight: '600'
              }}
            >
              <Plus size={20} /> Add
            </button>
            <button 
              type="button"
              onClick={() => setMode('remove')}
              className={clsx('mode-btn', mode === 'remove' && 'active')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                backgroundColor: mode === 'remove' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: mode === 'remove' ? 'var(--color-danger)' : 'var(--text-muted)',
                fontWeight: '600'
              }}
            >
              <Minus size={20} /> Remove
            </button>
            <button 
              type="button"
              onClick={() => setMode('set')}
              className={clsx('mode-btn', mode === 'set' && 'active')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                backgroundColor: mode === 'set' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: mode === 'set' ? 'var(--color-primary)' : 'var(--text-muted)',
                fontWeight: '600'
              }}
            >
              <RotateCcw size={20} /> Set
            </button>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: 'var(--space-2)' }}>
              Product Image
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  flexShrink: 0,
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={28} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={16} />
                  {imageFile ? 'Change Image' : 'Upload Image'}
                </button>
                {imageFile && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => imageMutation.mutate(imageFile)}
                      disabled={imageMutation.isPending}
                      style={{
                        flex: 1,
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        opacity: imageMutation.isPending ? 0.7 : 1,
                      }}
                    >
                      {imageMutation.isPending ? 'Uploading...' : 'Save Image'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: 'var(--space-1)' }}>
              {mode === 'set' ? 'Target Stock' : 'Quantity to ' + (mode === 'add' ? 'Add' : 'Remove')}
            </label>
            <input 
              type="number" 
              value={quantity} 
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              required
              min={0}
              style={{ width: '100%', padding: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: '700', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: 'var(--space-1)' }}>Reason for change</label>
            <select 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              required
              style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)' }}
            >
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: 'var(--space-1)' }}>Notes (optional)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Broken during handling"
              style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', minHeight: '100px' }}
            />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 'var(--space-8)' }}>
            <button 
              type="submit" 
              disabled={adjustmentMutation.isPending}
              style={{ 
                width: '100%',
                backgroundColor: 'var(--color-primary)', 
                color: 'white', 
                padding: 'var(--space-3)', 
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                opacity: adjustmentMutation.isPending ? 0.7 : 1
              }}
            >
              <Save size={18} /> {adjustmentMutation.isPending ? 'Updating...' : 'Confirm Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
