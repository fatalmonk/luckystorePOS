import { useState, useMemo, useEffect } from 'react';
import { X, Percent, Hash } from 'lucide-react';
import { clsx } from 'clsx';

interface BulkPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    sellingPrice?: { value: number; isPercentage: boolean };
    mrp?: { value: number; isPercentage: boolean };
    costPrice?: { value: number; isPercentage: boolean };
  }) => void;
  selectedCount: number;
}

export function BulkPriceModal({ isOpen, onClose, onSubmit, selectedCount }: BulkPriceModalProps) {
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [costPrice, setCostPrice] = useState('');
  
  const [sellingMode, setSellingMode] = useState<'absolute' | 'percentage'>('absolute');
  const [mrpMode, setMrpMode] = useState<'absolute' | 'percentage'>('absolute');
  const [costMode, setCostMode] = useState<'absolute' | 'percentage'>('absolute');

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

  const hasValue = sellingPrice || mrp || costPrice;

  const handleSubmit = () => {
    const data: any = {};
    if (sellingPrice) {
      data.sellingPrice = {
        value: parseFloat(sellingPrice),
        isPercentage: sellingMode === 'percentage',
      };
    }
    if (mrp) {
      data.mrp = {
        value: parseFloat(mrp),
        isPercentage: mrpMode === 'percentage',
      };
    }
    if (costPrice) {
      data.costPrice = {
        value: parseFloat(costPrice),
        isPercentage: costMode === 'percentage',
      };
    }
    onSubmit(data);
    // Reset
    setSellingPrice('');
    setMrp('');
    setCostPrice('');
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
        aria-labelledby="bulk-price-modal-title"
        className="relative bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 id="bulk-price-modal-title" className="font-semibold text-foreground">Update Prices</h3>
            <p className="text-sm text-muted-foreground">{selectedCount} products selected</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Selling Price */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-sm font-medium text-foreground">
              Selling Price
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {sellingMode === 'percentage' ? '±' : '৳'}
                </span>
                <input
                  type="number"
                  step={sellingMode === 'percentage' ? '1' : '0.01'}
                  placeholder={sellingMode === 'percentage' ? 'e.g. 10' : 'e.g. 150'}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-input bg-background rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex rounded-md border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSellingMode('absolute')}
                  className={clsx(
                    'px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    sellingMode === 'absolute'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title="Absolute value"
                >
                  <Hash size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSellingMode('percentage')}
                  className={clsx(
                    'px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    sellingMode === 'percentage'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title="Percentage change"
                >
                  <Percent size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sellingMode === 'percentage' 
                ? 'Use +10 for 10% increase, -10 for 10% decrease' 
                : 'Set exact selling price for all selected products'}
            </p>
          </div>

          {/* MRP */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-sm font-medium text-foreground">MRP (optional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {mrpMode === 'percentage' ? '±' : '৳'}
                </span>
                <input
                  type="number"
                  step={mrpMode === 'percentage' ? '1' : '0.01'}
                  placeholder={mrpMode === 'percentage' ? 'e.g. -5' : 'e.g. 200'}
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-input bg-background rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex rounded-md border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMrpMode('absolute')}
                  className={clsx(
                    'px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    mrpMode === 'absolute'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Hash size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setMrpMode('percentage')}
                  className={clsx(
                    'px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    mrpMode === 'percentage'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Percent size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Cost Price */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-sm font-medium text-foreground">Cost Price (optional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {costMode === 'percentage' ? '±' : '৳'}
                </span>
                <input
                  type="number"
                  step={costMode === 'percentage' ? '1' : '0.01'}
                  placeholder={costMode === 'percentage' ? 'e.g. 5' : 'e.g. 100'}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-input bg-background rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex rounded-md border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCostMode('absolute')}
                  className={clsx(
                    'px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    costMode === 'absolute'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Hash size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCostMode('percentage')}
                  className={clsx(
                    'px-2.5 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    costMode === 'percentage'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Percent size={14} />
                </button>
              </div>
            </div>
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
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              hasValue
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
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
