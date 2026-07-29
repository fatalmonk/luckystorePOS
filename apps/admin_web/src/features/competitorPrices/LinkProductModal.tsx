import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, Link as LinkIcon, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '@/components';
import { linkScrapedProductToItem } from '../../lib/api/domains/competitorPrices';
import { supabase } from '@/lib/supabase';
import type { CompetitorPrice } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';

interface LinkProductModalProps {
  priceRecord: CompetitorPrice | null;
  onClose: () => void;
}

interface ItemCandidate {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export function LinkProductModal({ priceRecord, onClose }: LinkProductModalProps) {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(priceRecord?.product_name || '');
  const [competitorUrl, setCompetitorUrl] = useState(priceRecord?.competitor_product_url || '');

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['itemCandidateSearch', searchQuery.trim()],
    queryFn: async () => {
      const q = searchQuery.trim();
      if (!q) return [];
      const { data } = await supabase
        .from('items')
        .select('id, name, sku, price')
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(10);
      return (data || []) as unknown as ItemCandidate[];
    },
    enabled: !!priceRecord && searchQuery.trim().length >= 2,
  });

  const linkMutation = useMutation({
    mutationFn: (itemId: string) =>
      linkScrapedProductToItem(storeId!, priceRecord!.id, itemId, competitorUrl),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
      notify('Product linked successfully!', 'success');
      onClose();
    },
    onError: () => notify('Failed to link product', 'error'),
  });

  if (!priceRecord) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-warm-paper border border-warm-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-border">
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-emerald-500" />
            <h2 className="text-lg font-bold">1-Click Product Linker</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-warm-surface rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Scraped Product Info */}
          <div className="p-3 rounded-lg border border-warm-border bg-warm-surface/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-warm-muted tracking-wider">Scraped Competitor Product</span>
            <div className="font-semibold text-sm">{priceRecord.product_name}</div>
            <div className="flex items-center justify-between text-xs text-warm-muted pt-1">
              <span>{priceRecord.competitor_name}: <strong className="font-mono text-warm-foreground">{formatCurrency(priceRecord.competitor_price)}</strong></span>
              {priceRecord.competitor_product_url && (
                <a
                  href={priceRecord.competitor_product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                >
                  View Page <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Competitor URL Input */}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Competitor Product URL</label>
            <input
              type="text"
              placeholder="Paste competitor product URL (optional)..."
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-warm-border bg-warm-paper text-warm-foreground focus:outline-none"
            />
          </div>

          {/* Search Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Search Your Inventory Catalog</label>
            <div className="relative">

              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-muted" />
              <input
                type="text"
                placeholder="Search Lucky Store items by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-warm-border bg-warm-paper text-warm-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-warm-muted">Matching Inventory Candidates</span>

            {searchLoading && <div className="text-xs text-warm-muted p-3 text-center">Searching inventory...</div>}

            {searchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
              <div className="text-xs text-warm-muted p-3 text-center border border-dashed border-warm-border rounded-lg">
                No inventory item found matching &quot;{searchQuery}&quot;. Try searching another keyword or SKU.
              </div>
            )}

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {searchResults?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-warm-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors group"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{item.name}</span>
                    <span className="text-[10px] text-warm-muted">SKU: {item.sku} • Our Price: <strong className="font-mono text-warm-foreground">{formatCurrency(item.price)}</strong></span>

                  </div>
                  <button
                    onClick={() => linkMutation.mutate(item.id)}
                    disabled={linkMutation.isPending}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    <Check size={13} />
                    Link Product
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
