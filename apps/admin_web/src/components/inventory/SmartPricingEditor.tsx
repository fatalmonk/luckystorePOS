import { clsx } from 'clsx';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface CompetitorPrice {
  name: string;
  price: number;
  logo: string;
}

interface SmartPricingEditorProps {
  itemId: string;
  cost: number;
  mrp: number;
  currentPrice: number;
  onSave: (price: number) => void;
  onCancel: () => void;
}

// TODO: Replace with real API call to fetch live competitor prices
const MOCK_COMPETITORS: Record<string, CompetitorPrice[]> = {};

export function SmartPricingEditor({
  itemId,
  cost,
  mrp,
  currentPrice,
  onSave,
  onCancel,
}: SmartPricingEditorProps) {
  const [selectedMarkup, setSelectedMarkup] = useState<number | null>(null);

  // Competitor prices - would come from API
  const competitorPrices = MOCK_COMPETITORS[itemId] || [
    { name: 'Shwapno', price: cost * 1.25, logo: 'S' },
    { name: 'Chaldal', price: cost * 1.22, logo: 'C' },
    { name: 'Agora', price: cost * 1.28, logo: 'A' },
  ];

  // Calculate proposed price based on markup
  const proposedPrice = selectedMarkup
    ? Math.round(cost * (1 + selectedMarkup / 100))
    : currentPrice;

  // Check if proposed price exceeds MRP
  const exceedsMrp = mrp > 0 && proposedPrice > mrp;
  const finalPrice = exceedsMrp ? mrp : proposedPrice;

  const handleSave = () => {
    onSave(finalPrice);
  };

  return (
    <div className="flex flex-col items-end gap-2 bg-warm-surface-hover rounded-lg p-3 border border-warm-border-warm shadow-sm">
      {/* Cost Display */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-warm-dim">Cost:</span>
        <span className="font-semibold text-warm-fg">
          ৳{cost.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Competitor Insights */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className="text-xs text-warm-dim">Market:</span>
        {competitorPrices.map((comp) => (
          <div
            key={comp.name}
            className="flex items-center gap-1 text-[10px] bg-surface px-1.5 py-0.5 rounded"
            title={comp.name}
          >
            <span className="font-medium text-warm-muted">{comp.logo}</span>
            <span className="text-warm-fg">
              ৳{comp.price.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* MRP Display */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-warm-dim">MRP (Ceiling):</span>
        <span
          className={clsx(
            'font-semibold',
            exceedsMrp ? 'text-warm-danger' : 'text-warm-fg'
          )}
        >
          ৳{mrp.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Markup Segmented Control */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] text-warm-muted">Quick Markup</span>
        <div className="flex rounded-md overflow-hidden border border-warm-border-warm">
          {[10, 15, 20, 25].map((markup) => (
            <button
              key={markup}
              onClick={() => setSelectedMarkup(markup)}
              className={clsx(
                'px-2 py-1 text-[11px] font-medium transition-colors',
                selectedMarkup === markup
                  ? 'bg-warm-accent text-white'
                  : 'bg-warm-surface text-warm-muted hover:bg-warm-surface-hover'
              )}
            >
              {markup}%
            </button>
          ))}
        </div>
      </div>

      {/* Final Price with Validation */}
      <div className="flex items-center gap-2 mt-1">
        {exceedsMrp && (
          <span className="flex items-center gap-1 text-[10px] text-warm-danger">
            <AlertCircle size={10} />
            Max Retail Price Reached
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-warm-dim">Final:</span>
          <span
            className={clsx(
              'text-sm font-bold font-mono',
              exceedsMrp ? 'text-warm-danger' : 'text-warm-success'
            )}
          >
            ৳{finalPrice.toLocaleString('en-IN')}
            {selectedMarkup && !exceedsMrp && (
              <span className="ml-1 text-[10px] text-warm-muted">
                ({selectedMarkup}%)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleSave}
          className="px-3 py-1 text-[11px] bg-warm-accent text-white rounded hover:bg-warm-accent/90 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-[11px] bg-warm-surface text-warm-muted rounded hover:bg-warm-surface-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
