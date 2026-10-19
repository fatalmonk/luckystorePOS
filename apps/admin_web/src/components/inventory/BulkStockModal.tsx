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
        className="relative bg-card text-card-foreground rounded-xl border border-border shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 id="bulk-stock-modal-title" className="font-semibold text-foreground text-lg">Update Stock Levels</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedCount} products selected</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Update Mode
            </label>
            <div className="flex rounded-md border border-input overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={clsx(
                  'flex-1 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  mode === 'add'
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Equal size={14} />
                Set Exact Quantity
              </button>
            </div>
          </div>

          {/* Value */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quantity
            </label>
            <input
              type="number"
              placeholder={mode === 'add' ? 'e.g. 10 or -5' : 'e.g. 50'}
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              {mode === 'add'
                ? 'Enter positive values to add stock, or negative values (e.g., -5) to subtract.'
                : 'Sets the exact inventory count to this quantity for all selected products.'}
            </p>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bulk-stock-reason" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reason
            </label>
            <select
              id="bulk-stock-reason"
              aria-label="Stock update reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm"
            >
              <option value="Stock Count / Correction">Stock Count / Correction</option>
              <option value="Restock / Purchase">Restock / Purchase</option>
              <option value="Damage / Waste">Damage / Waste</option>
              <option value="Returned Items">Returned Items</option>
              <option value="Promotion / Gift">Promotion / Gift</option>
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </label>
            <textarea
              placeholder="Add extra context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasValue}
            className={clsx(
              'px-4 py-2 text-sm font-semibold rounded-md transition-colors',
              hasValue
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            Apply to {selectedCount} Products
          </button>
        </div>
      </div>
    </div>
  );
}
