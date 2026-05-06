

import React from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Edit2, Package, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { SkeletonBlock } from '../../components/PageState';
import { Badge } from '../../components/ui/Badge';

interface ProductDetailDrawerProps {
  productId: string | null;
  onClose: () => void;
  onEdit: (product: any) => void;
}

export function ProductDetailDrawer({ productId, onClose, onEdit }: ProductDetailDrawerProps) {
  const { storeId } = useAuth();
  
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.products.get(productId!),
    enabled: !!productId,
  });

  const { data: stockHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['stock-history', storeId, productId],
    queryFn: () => api.inventory.history(storeId!, productId!),
    enabled: !!productId && !!storeId,
  });

  if (!productId) return null;

  return (
    <Drawer isOpen={!!productId} onClose={onClose} title="Product Details" className="w-[500px]">
      {isProductLoading ? (
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="w-full h-32" />
          <SkeletonBlock className="w-1/2 h-6" />
          <SkeletonBlock className="w-full h-40" />
        </div>
      ) : product ? (
        <div className="flex flex-col gap-6">
          {/* Header Info */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-border-light rounded-lg flex items-center justify-center text-text-muted">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Package size={40} />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text-main">{product.name}</h2>
              <div className="text-sm text-text-muted mb-2">{product.categories?.name || 'No Category'}</div>
              <div className="flex gap-2">
                <Badge variant={product.active ? 'success' : 'neutral'}>
                  {product.active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="info">{product.sku || 'No SKU'}</Badge>
              </div>
            </div>
            <Button variant="outline" onClick={() => onEdit(product)} icon={<Edit2 size={16} />}>
              Edit
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-sm text-text-muted mb-1">Sales Price</div>
              <div className="text-xl font-bold text-success">৳{product.price}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-text-muted mb-1">Current Stock</div>
              <div className="text-xl font-bold">{product.stock || 0}</div>
            </div>
          </div>

          {/* Stock History */}
          <section>
            <h3 className="text-lg font-medium text-text-main mb-3 flex items-center gap-2">
              <TrendingUp size={18} /> Stock History Log
            </h3>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-light bg-[rgba(0,0,0,0.02)] text-text-muted text-sm">
                    <th className="p-3">Date</th>
                    <th className="p-3">Change</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-text-muted">Loading history...</td>
                    </tr>
                  ) : stockHistory && stockHistory.length > 0 ? (
                    stockHistory.map((log: any) => (
                      <tr key={log.id} className="border-b border-border-light text-sm">
                        <td className="p-3">{new Date(log.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">
                          <span className={log.delta > 0 ? 'text-success' : log.delta < 0 ? 'text-danger' : ''}>
                            {log.delta > 0 ? '+' : ''}{log.delta}
                          </span>
                        </td>
                        <td className="p-3 text-text-muted">{log.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-text-muted">No stock history available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="text-center text-text-muted p-8">Product not found</div>
      )}
    </Drawer>
  );
}
