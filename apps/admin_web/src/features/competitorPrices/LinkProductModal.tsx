import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '@/components';
import { linkScrapedProductToItem } from '../../lib/api/domains/competitorPrices';
import { supabase } from '@/lib/supabase';
import type { CompetitorPrice } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';
import './AddPriceModal.css';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<ItemCandidate | null>(null);

  // Re-initialise whenever the modal opens with a new record
  useEffect(() => {
    if (priceRecord) {
      setSearchQuery(priceRecord.product_name || '');
      setCompetitorUrl(priceRecord.competitor_product_url || '');
      setSelectedItem(null);
    }
  }, [priceRecord]);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['itemCandidateSearch', searchQuery.trim()],
    queryFn: async () => {
      const q = searchQuery.trim();
      if (q.length < 2) return [];
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
      notify('Competitor price linked successfully!', 'success');
      onClose();
    },
    onError: () => notify('Failed to link product', 'error'),
  });

  if (!priceRecord) return null;

  const handleSave = () => {
    if (!selectedItem) {
      notify('Please select an inventory item first', 'error');

      return;
    }
    linkMutation.mutate(selectedItem.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content flex flex-col" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-emerald-500" />
            <h2>1-Click Product Linker</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-form" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>

          {/* Scraped info card */}
          <div className="form-group">
            <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--surface-default)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Scraped Competitor Product
              </span>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{priceRecord.product_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>
                  {priceRecord.competitor_name}:{' '}
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-default)' }}>
                    {formatCurrency(priceRecord.competitor_price)}
                  </strong>
                </span>
                {priceRecord.competitor_product_url && (
                  <a
                    href={priceRecord.competitor_product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}
                  >
                    View Page <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Competitor URL */}
          <div className="form-group">
            <label>Competitor Product URL</label>
            <input
              type="url"
              placeholder="Paste competitor product URL (optional)..."
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Selected item chip */}
          {selectedItem && (
            <div className="form-group">
              <label>Linked Catalog Item</label>
              <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #059669', background: 'rgba(5,150,105,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedItem.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    SKU: {selectedItem.sku} &bull; Our Price:{' '}
                    <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(selectedItem.price)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Product search — shown only when nothing selected */}
          {!selectedItem && (
            <div className="form-group">
              <label>Search Inventory Catalog</label>
              <div className="product-search">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Type product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Candidates */}
          {!selectedItem && searchQuery.trim().length >= 2 && (
            <div className="form-group">
              <label>Matching Inventory Candidates</label>
              {searchLoading && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>Searching...</div>}
              {searchResults && searchResults.length === 0 && !searchLoading && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', border: '1px dashed var(--border-default)', borderRadius: 8, textAlign: 'center' }}>
                  No items found for &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        SKU: {item.sku} &bull; {formatCurrency(item.price)}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>Select</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-default)' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--surface-default)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedItem || linkMutation.isPending}
            onClick={handleSave}
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: selectedItem ? '#059669' : '#aaa', color: '#fff', cursor: selectedItem ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}
          >
            {linkMutation.isPending ? 'Saving...' : 'Save & Link Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
