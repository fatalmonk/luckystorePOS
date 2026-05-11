import { useState } from 'react';
import { X, Save, Plus, Minus, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '../../lib/zodResolver';
import { inventoryAdjustmentSchema, InventoryAdjustmentData } from '../../schemas/inventory.schema';
import { useUpdateInventory } from '../../hooks/mutations/useUpdateInventory';
import { Form, FormSelect, StockAdjustmentInput } from '../../components/forms';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

interface StockUpdateDrawerProps {
  product: any | null;
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

export function StockUpdateDrawer({ product, onClose }: StockUpdateDrawerProps) {
  const { notify } = useNotify();
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const updateMutation = useUpdateInventory();

  const form = useForm<InventoryAdjustmentData>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: {
      productId: product?.id || '',
      adjustmentQuantity: 1,
      reason: 'received',
      notes: '',
    }
  });

  useUnsavedChangesGuard(form.formState.isDirty);

  if (!product) return null;

  const handleSubmit = (data: InventoryAdjustmentData) => {
    updateMutation.mutate({ data, mode }, {
      onSuccess: (res: any) => {
        if (res?.is_duplicate) {
          notify('This update was already processed.', 'info');
        } else {
          notify('Stock updated successfully.', 'success');
        }
        form.reset();
        onClose();
      },
      onError: (err: any) => {
        notify(err.message || 'Failed to update stock. Please try again.', 'error');
      }
    });
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

        <Form form={form} onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
          <div className="grid grid-cols-3 gap-2">
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

          <StockAdjustmentInput
            name="adjustmentQuantity"
            label={mode === 'set' ? 'Target Stock' : 'Quantity to ' + (mode === 'add' ? 'Add' : 'Remove')}
          />

          <FormSelect
            name="reason"
            label="Reason for change"
            options={reasons}
          />

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: 'var(--space-1)' }}>Notes (optional)</label>
            <textarea 
              {...form.register('notes')}
              placeholder="e.g. Broken during handling"
              style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', minHeight: '100px' }}
            />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 'var(--space-8)' }}>
            <button 
              type="submit" 
              disabled={updateMutation.isPending}
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
                opacity: updateMutation.isPending ? 0.7 : 1
              }}
            >
              <Save size={18} /> {updateMutation.isPending ? 'Updating...' : 'Confirm Update'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
