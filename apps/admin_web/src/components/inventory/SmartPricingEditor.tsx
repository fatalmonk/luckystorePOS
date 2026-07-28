import { clsx } from 'clsx';
import { AlertCircle, Pencil, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import {
  fetchEffectiveCompetitorPrices,
  setManualCompetitorPrice,
  clearManualCompetitorPrice,
} from '../../lib/api/domains/competitorPrices';
import type { EffectiveCompetitorPrice, CompetitorPriceStatus } from '../../lib/api/types';

interface SmartPricingEditorProps {
  itemId: string;
  cost: number;
  mrp: number;
  currentPrice: number;
  onSave: (price: number) => void;
  onCancel: () => void;
}

type CompetitorRow =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'data'; price: EffectiveCompetitorPrice };

const STATUS_LABELS: Record<CompetitorPriceStatus, { label: string; color: string }> = {
  fresh: { label: 'Fresh', color: 'text-warm-success' },
  stale: { label: 'Stale', color: 'text-warm-warning' },
  manual: { label: 'Manual', color: 'text-warm-accent' },
};

export function SmartPricingEditor({
  itemId,
  cost,
  mrp,
  currentPrice,
  onSave,
  onCancel,
}: SmartPricingEditorProps) {
  const { storeId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMarkup, setSelectedMarkup] = useState<number | null>(null);
  const [overrideCompetitorKey, setOverrideCompetitorKey] = useState<string | null>(null);
  const [overridePrice, setOverridePrice] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');

  // Fetch effective competitor prices
  const {
    data: competitors,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['competitorPrices', 'effective', storeId, itemId],
    queryFn: () => fetchEffectiveCompetitorPrices(storeId!, itemId),
    enabled: !!storeId && !!itemId,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Set manual override mutation
  const setOverrideMutation = useMutation({
    mutationFn: (params: {
      competitorKey: string;
      competitorName: string;
      price: number;
      reason?: string;
    }) =>
      setManualCompetitorPrice(
        storeId!,
        itemId,
        params.competitorKey,
        params.competitorName,
        params.price,
        params.reason,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorPrices', 'effective', storeId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
      setOverrideCompetitorKey(null);
      setOverridePrice('');
      setOverrideReason('');
    },
  });

  // Clear manual override mutation
  const clearOverrideMutation = useMutation({
    mutationFn: (competitorKey: string) =>
      clearManualCompetitorPrice(storeId!, itemId, competitorKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorPrices', 'effective', storeId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
    },
  });

  // Calculate proposed price based on markup
  const proposedPrice = selectedMarkup
    ? Math.round(cost * (1 + selectedMarkup / 100))
    : currentPrice;
  const exceedsMrp = mrp > 0 && proposedPrice > mrp;
  const finalPrice = exceedsMrp ? mrp : proposedPrice;

  const handleSave = () => {
    onSave(finalPrice);
  };

  const handleSetOverride = (comp: EffectiveCompetitorPrice) => {
    setOverrideCompetitorKey(comp.competitor_key);
    setOverridePrice(comp.competitor_price.toString());
  };

  const handleSubmitOverride = () => {
    if (!overrideCompetitorKey || !overridePrice) return;
    const comp = competitors?.find((c) => c.competitor_key === overrideCompetitorKey);
    setOverrideMutation.mutate({
      competitorKey: overrideCompetitorKey,
      competitorName: comp?.competitor_name ?? overrideCompetitorKey,
      price: parseFloat(overridePrice),
      reason: overrideReason || undefined,
    });
  };

  // Render competitor price chips
  const renderCompetitors = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-warm-dim">
          <Loader2 size={12} className="animate-spin" />
          <span>Loading market data...</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-warm-danger">
          <AlertCircle size={12} />
          <span>Failed to load competitor data</span>
        </div>
      );
    }

    if (!competitors || competitors.length === 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-warm-dim">
          <span>No competitor data available</span>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 justify-end">
        <span className="text-xs text-warm-dim">Market:</span>
        {competitors.map((comp) => {
          const status = STATUS_LABELS[comp.status];
          return (
            <div
              key={comp.competitor_key}
              className="flex items-center gap-1 text-[10px] bg-surface px-1.5 py-0.5 rounded group/comp relative"
              title={`${comp.competitor_name}: ৳${comp.competitor_price} (${status?.label ?? comp.status})${
                comp.is_manual_override ? ' — Manual override' : ''
              }`}
            >
              <span className={`font-medium ${status?.color ?? 'text-warm-muted'}`}>
                {comp.competitor_name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-warm-fg font-mono">
                ৳{comp.competitor_price.toLocaleString('en-IN')}
              </span>
              {comp.status === 'stale' && (
                <span className="text-[8px] text-warm-warning">stale</span>
              )}
              {comp.is_manual_override && (
                <span className="text-[8px] text-warm-accent">M</span>
              )}
              {/* Override actions on hover */}
              <div className="absolute -top-5 right-0 hidden group-hover/comp:flex items-center gap-0.5 bg-warm-surface-hover border border-warm-border-warm rounded px-1">
                {comp.is_manual_override ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearOverrideMutation.mutate(comp.competitor_key);
                    }}
                    className="text-[9px] text-warm-danger hover:underline"
                    disabled={clearOverrideMutation.isPending}
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetOverride(comp);
                    }}
                    className="text-[9px] text-warm-accent hover:underline"
                  >
                    Override
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
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
      {renderCompetitors()}

      {/* Override Form (inline) */}
      {overrideCompetitorKey && (
        <div className="flex flex-col items-end gap-1.5 w-full max-w-xs">
          <div className="flex items-center gap-2 text-xs text-warm-dim">
            <span>Override for</span>
            <span className="font-semibold text-warm-fg">{overrideCompetitorKey}</span>
            <button
              onClick={() => {
                setOverrideCompetitorKey(null);
                setOverridePrice('');
                setOverrideReason('');
              }}
              className="text-warm-muted hover:text-warm-fg"
            >
              <X size={12} />
            </button>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={overridePrice}
            onChange={(e) => setOverridePrice(e.target.value)}
            placeholder="Price"
            className="w-full px-2 py-1 text-xs font-mono bg-surface border border-warm-border-warm rounded"
          />
          <input
            type="text"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full px-2 py-1 text-xs bg-surface border border-warm-border-warm rounded"
          />
          <button
            onClick={handleSubmitOverride}
            disabled={!overridePrice || setOverrideMutation.isPending}
            className="px-2 py-0.5 text-[10px] bg-warm-accent text-white rounded hover:bg-warm-accent/90 disabled:opacity-50"
          >
            {setOverrideMutation.isPending ? 'Saving...' : 'Set Override'}
          </button>
        </div>
      )}

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