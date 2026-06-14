import { useState } from 'react';
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

  const hasValue = sellingPrice || mrp || costPrice;

  const handleSubmit = () => {
    const data: Partial<{
      sellingPrice: { value: number; isPercentage: boolean };
      mrp: { value: number; isPercentage: boolean };
      costPrice: { value: number; isPercentage: boolean };
    }> = {};
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
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-surface-default rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Update Prices</h3>
            <p className="text-sm text-slate-500">{selectedCount} products selected</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Selling Price */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Selling Price
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {sellingMode === 'percentage' ? '±' : '৳'}
                </span>
                <input
                  type="number"
                  step={sellingMode === 'percentage' ? '1' : '0.01'}
                  placeholder={sellingMode === 'percentage' ? 'e.g. 10' : 'e.g. 150'}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-primary-default focus:border-transparent"
                />
              </div>
              <div className="flex rounded-md border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSellingMode('absolute')}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    sellingMode === 'absolute'
                      ? 'bg-primary-default text-white'
                      : 'bg-surface-default text-slate-600 hover:bg-slate-50'
                  )}
                  title="Absolute value"
                >
                  <Hash size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSellingMode('percentage')}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    sellingMode === 'percentage'
                      ? 'bg-primary-default text-white'
                      : 'bg-surface-default text-slate-600 hover:bg-slate-50'
                  )}
                  title="Percentage change"
                >
                  <Percent size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {sellingMode === 'percentage' 
                ? 'Use +10 for 10% increase, -10 for 10% decrease' 
                : 'Set exact selling price for all selected products'}
            </p>
          </div>

          {/* MRP */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">MRP (optional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {mrpMode === 'percentage' ? '±' : '৳'}
                </span>
                <input
                  type="number"
                  step={mrpMode === 'percentage' ? '1' : '0.01'}
                  placeholder={mrpMode === 'percentage' ? 'e.g. -5' : 'e.g. 200'}
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-primary-default focus:border-transparent"
                />
              </div>
              <div className="flex rounded-md border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMrpMode('absolute')}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    mrpMode === 'absolute'
                      ? 'bg-primary-default text-white'
                      : 'bg-surface-default text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Hash size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setMrpMode('percentage')}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    mrpMode === 'percentage'
                      ? 'bg-primary-default text-white'
                      : 'bg-surface-default text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Percent size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Cost Price (optional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {costMode === 'percentage' ? '±' : '৳'}
                </span>
                <input
                  type="number"
                  step={costMode === 'percentage' ? '1' : '0.01'}
                  placeholder={costMode === 'percentage' ? 'e.g. 5' : 'e.g. 100'}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-primary-default focus:border-transparent"
                />
              </div>
              <div className="flex rounded-md border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCostMode('absolute')}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    costMode === 'absolute'
                      ? 'bg-primary-default text-white'
                      : 'bg-surface-default text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Hash size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCostMode('percentage')}
                  className={clsx(
                    'px-2 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                    costMode === 'percentage'
                      ? 'bg-primary-default text-white'
                      : 'bg-surface-default text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Percent size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
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
                ? 'bg-primary-default text-white hover:bg-primary-hover'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            Apply to {selectedCount} Products
          </button>
        </div>
      </div>
    </div>
  );
}
