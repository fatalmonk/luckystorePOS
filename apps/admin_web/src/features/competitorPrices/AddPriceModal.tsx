import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { addCompetitorPrice, fetchCompetitorNames } from '../../lib/api/domains/competitorPrices';
import { supabase } from '../../lib/supabase';
import type { CompetitorPriceFormData } from '../../lib/api/types';
import './AddPriceModal.css';

interface AddPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export function AddPriceModal({ isOpen, onClose }: AddPriceModalProps) {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [competitorName, setCompetitorName] = useState('');
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const { data: existingCompetitors } = useQuery({
    queryKey: ['competitorNames', storeId],
    queryFn: () => fetchCompetitorNames(storeId!),
    enabled: !!storeId && isOpen,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['productSearch', searchQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name, sku, price')
        .eq('store_id', storeId)
        .ilike('name', `%${searchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.length >= 2 && showProductSearch,
  });

  const addMutation = useMutation({
    mutationFn: (data: CompetitorPriceFormData) => addCompetitorPrice(storeId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
      notify('Competitor price added', 'success');
      resetForm();
      onClose();
    },
    onError: () => notify('Failed to add price', 'error'),
  });

  const resetForm = () => {
    setSearchQuery('');
    setSelectedProduct(null);
    setCompetitorName('');
    setCompetitorPrice('');
    setCompetitorUrl('');
    setShowProductSearch(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    addMutation.mutate({
      item_id: selectedProduct.id,
      competitor_name: competitorName,
      competitor_price: parseFloat(competitorPrice),
      competitor_url: competitorUrl || undefined,
    });
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductSearch(false);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Competitor Price</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Product Selection */}
          <div className="form-group">
            <label>Product *</label>
            {!selectedProduct ? (
              <div className="product-search">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowProductSearch(true);
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    className="search-input"
                  />
                </div>
                {showProductSearch && searchResults && searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((product: Product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="search-result-item"
                        onClick={() => selectProduct(product)}
                      >
                        <span className="product-name">{product.name}</span>
                        {product.sku && <span className="product-sku">{product.sku}</span>}
                        <span className="product-price">৳{product.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="selected-product">
                <div className="product-info">
                  <span className="product-name">{selectedProduct.name}</span>
                  {selectedProduct.sku && <span className="product-sku">{selectedProduct.sku}</span>}
                </div>
                <button
                  type="button"
                  className="btn-change"
                  onClick={() => setSelectedProduct(null)}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Competitor Name */}
          <div className="form-group">
            <label>Competitor Name *</label>
            <input
              type="text"
              list="competitor-suggestions"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              placeholder="e.g., Daraz, Pickaboo"
              required
              className="form-input"
            />
            <datalist id="competitor-suggestions">
              {existingCompetitors?.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Competitor Price */}
          <div className="form-group">
            <label>Competitor Price *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={competitorPrice}
              onChange={(e) => setCompetitorPrice(e.target.value)}
              placeholder="0.00"
              required
              className="form-input"
            />
          </div>

          {/* Competitor URL */}
          <div className="form-group">
            <label>Product URL (optional)</label>
            <input
              type="url"
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              placeholder="https://..."
              className="form-input"
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedProduct || !competitorName || !competitorPrice || addMutation.isPending}
            >
              {addMutation.isPending ? 'Adding...' : 'Add Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
