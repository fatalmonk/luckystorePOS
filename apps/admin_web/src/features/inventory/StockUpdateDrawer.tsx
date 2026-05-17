import { useState, useRef } from 'react';
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'var(--color-surface-overlay)' }}
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

        <Form form={form} onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
          <div className="grid grid-cols-3 gap-2">
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

          <StockAdjustmentInput
            name="adjustmentQuantity"
            label={mode === 'set' ? 'Target Stock' : 'Quantity to ' + (mode === 'add' ? 'Add' : 'Remove')}
          />

          <FormSelect
            name="reason"
            label="Reason for change"
            options={reasons}
          />

          {/* Notes */}
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: 'var(--space-1)' }}>Notes (optional)</label>
            <textarea
              {...form.register('notes')}
              placeholder="e.g. Broken during handling"
              rows={4}
              className="w-full px-3 py-3 rounded-md border border-border-default bg-input text-text-primary focus:ring-2 focus:ring-primary-default focus:border-transparent resize-none"
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
