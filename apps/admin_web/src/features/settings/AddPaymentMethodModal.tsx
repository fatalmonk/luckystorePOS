import { useState } from 'react';
import { X, Plus, CreditCard } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_banking', label: 'bKash / Mobile Banking' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const;

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  storeId: string;
  onClose: () => void;
}

export function AddPaymentMethodModal({ isOpen, storeId, onClose }: AddPaymentMethodModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash',
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (method: any) => api.settings.addPaymentMethod(storeId, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-payments'] });
      setFormData({ name: '', type: 'cash', isActive: true });
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to add payment method');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      name: formData.name,
      type: formData.type,
      isActive: formData.isActive,
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--bg-card)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700' }}>Add Payment Method</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <div className="form-group">
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '600',
                marginBottom: 'var(--space-1)',
              }}
            >
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Nagad"
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div className="form-group">
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '600',
                marginBottom: 'var(--space-1)',
              }}
            >
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-main)',
              }}
            >
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className="form-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) 0',
            }}
          >
            <label
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: '600',
              }}
            >
              Active
            </label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: formData.isActive ? 'var(--color-success)' : 'var(--border-color)',
                position: 'relative',
                transition: 'background-color var(--transition-fast)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: formData.isActive ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  transition: 'left var(--transition-fast)',
                }}
              />
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '500',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-primary)',
                color: '#000',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                opacity: createMutation.isPending ? 0.7 : 1,
              }}
            >
              <Plus size={18} /> {createMutation.isPending ? 'Adding...' : 'Add Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}