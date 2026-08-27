import { useState, useEffect } from 'react';
import { X, Plus, Equal } from 'lucide-react';
import { clsx } from 'clsx';

interface BulkStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    value: number;
    mode: 'add' | 'set';
    reason: string;
    notes?: string;
  }) => void;
  selectedCount: number;
}

export function BulkStockModal({ isOpen, onClose, onSubmit, selectedCount }: BulkStockModalProps) {
  const [stockValue, setStockValue] = useState('');
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [reason, setReason] = useState('Stock Count / Correction');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const hasValue = stockValue !== '' && !isNaN(parseFloat(stockValue));

  const handleSubmit = () => {
    if (!hasValue) return;
    onSubmit({
      value: parseFloat(stockValue),
      mode,
      reason,
      notes: notes || undefined,
    });
    // Reset
    setStockValue('');
    setNotes('');
    setReason('Stock Count / Correction');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-stock-modal-title"
        className="relative bg-warm-surface text-warm-fg rounded-2xl border border-warm-border-warm shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-warm-border-warm">
          <div>
            <h3 id="bulk-stock-modal-title" className="font-display font-black text-warm-fg text-lg">Update Stock Levels</h3>
            <p className="text-xs text-warm-muted mt-0.5">{selectedCount} products selected</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-warm-muted hover:text-warm-fg hover:bg-warm-surface-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Update Mode
            </label>
            <div className="flex rounded-lg border border-border-default overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={clsx(
                  'flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  mode === 'add'
                    ? 'bg-primary text-primary-on font-bold'
                    : 'bg-surface text-text-secondary hover:bg-background-subtle'
                )}
              >
                <Plus size={14} />
                Add / Subtract Delta
              </button>
              <button
                type="button"
                onClick={() => setMode('set')}
                className={clsx(
                  'flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  mode === 'set'
                    ? 'bg-primary text-primary-on font-bold'
                    : 'bg-surface text-text-secondary hover:bg-background-subtle'
                )}
              >
                <Equal size={14} />
                Set Exact Quantity
              </button>
            </div>
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Quantity
            </label>
            <input
              type="number"
              placeholder={mode === 'add' ? 'e.g. 10 or -5' : 'e.g. 50'}
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
            <p className="text-[10px] text-text-muted">
              {mode === 'add'
                ? 'Enter positive values to add stock, or negative values (e.g., -5) to subtract.'
                : 'Sets the exact inventory count to this quantity for all selected products.'}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label htmlFor="bulk-stock-reason" className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Reason
            </label>
            <select
              id="bulk-stock-reason"
              aria-label="Stock update reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="Stock Count / Correction">Stock Count / Correction</option>
              <option value="Restock / Purchase">Restock / Purchase</option>
              <option value="Damage / Waste">Damage / Waste</option>
              <option value="Returned Items">Returned Items</option>
              <option value="Promotion / Gift">Promotion / Gift</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Notes (optional)
            </label>
            <textarea
              placeholder="Add extra context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-background-subtle rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasValue}
            className={clsx(
              'px-4 py-2 text-sm font-bold rounded-lg transition-colors',
              hasValue
                ? 'bg-primary text-primary-on hover:opacity-90 shadow-sm'
                : 'bg-background-subtle text-text-muted cursor-not-allowed'
            )}
          >
            Apply to {selectedCount} Products
          </button>
        </div>
      </div>
    </div>
  );
}
