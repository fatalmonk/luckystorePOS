import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Upload, ImageIcon, Check, X, Package } from 'lucide-react';
import { uploadToR2 } from '../../lib/r2';
import type { InventoryItem } from '@/types/inventory';
import { ErrorState } from '../../components/PageState';
import { SkeletonBlock } from '../../components/PageState';

export function MissingImagesPage() {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  // Fetch inventory
  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId!),
    enabled: !!storeId,
  });

  // Filter products missing images
  const productsMissingImages = useMemo(() => {
    return (inventory ?? []).filter((item: InventoryItem) => !item.image_url);
  }, [inventory]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    for (const item of productsMissingImages) {
      const cat = item.category_name || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [productsMissingImages]);

  // Handle file selection
  const handleFileSelect = (productId: string, file: File) => {
    setSelectedFiles(prev => ({ ...prev, [productId]: file }));
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const key = `products/${storeId}/${productId}-${file.name}`;
      const url = await uploadToR2(file, key);
      
      // Update product with new image URL
      await api.inventory.updateProduct(storeId!, productId, { image_url: url });
      
      return { productId, url };
    },
    onMutate: ({ productId }) => {
      setUploadingProductId(productId);
    },
    onSuccess: ({ productId, url }, { file }) => {
      notify(`Image uploaded for product!`, 'success');
      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
    },
    onError: (err: Error, { productId }) => {
      notify(err.message || 'Failed to upload image', 'error');
    },
    onSettled: () => {
      setUploadingProductId(null);
    },
  });

  const handleUpload = (productId: string) => {
    const file = selectedFiles[productId];
    if (!file) {
      notify('Please select an image first', 'error');
      return;
    }
    uploadMutation.mutate({ productId, file });
  };

  if (error) {
    return (
      <div className="inventory-container pt-6">
        <PageHeader
          title="Products Missing Images"
          subtitle="Upload product images to improve visibility"
        />
        <Card className="mt-6">
          <ErrorState message="Failed to load inventory." onRetry={() => refetch()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="inventory-container pt-6">
      <PageHeader
        title="Products Missing Images"
        subtitle={`${productsMissingImages.length} products need images`}
        actions={
          <Button
            variant="secondary"
            icon={<Check size={18} />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <Card className="mt-6 p-8">
          <div className="flex items-center justify-center gap-4 text-warm-muted">
            <SkeletonBlock className="w-8 h-8 rounded-full" />
            <span>Loading products...</span>
          </div>
        </Card>
      ) : productsMissingImages.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-text-secondary">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">All Done!</h3>
          <p>All products have images uploaded.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <Card key={category} className="p-4">
              <h3 className="text-sm font-semibold text-warm-fg mb-3 flex items-center gap-2">
                <Package size={16} />
                {category}
                <span className="text-xs text-warm-muted">({items.length} products)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-border-default rounded-lg p-3 bg-surface hover:border-warm-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Placeholder image */}
                      <div className="w-16 h-16 rounded bg-warm-bg flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-warm-muted/50" />
                      </div>
                      
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-warm-fg truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-warm-muted mt-0.5">
                          SKU: {item.sku || 'N/A'}
                        </p>
                        <p className="text-xs text-warm-dim mt-0.5">
                          Stock: {item.current_qty} pcs
                        </p>
                      </div>
                    </div>

                    {/* Upload controls */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(item.id, file);
                        }}
                        className="hidden"
                        id={`file-${item.id}`}
                        disabled={uploadingProductId === item.id}
                      />
                      
                      <label
                        htmlFor={`file-${item.id}`}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded border text-xs font-medium cursor-pointer transition-colors",
                          selectedFiles[item.id]
                            ? "bg-warm-success/10 border-warm-success/30 text-warm-success hover:bg-warm-success/20"
                            : "bg-warm-bg border-border-default text-warm-muted hover:bg-warm-accent/10 hover:text-warm-accent"
                        )}
                      >
                        <Upload size={14} />
                        {selectedFiles[item.id] ? selectedFiles[item.id].name.slice(0, 20) + (selectedFiles[item.id].name.length > 20 ? '...' : '') : 'Select Image'}
                      </label>
                      
                      <button
                        onClick={() => handleUpload(item.id)}
                        disabled={!selectedFiles[item.id] || uploadingProductId === item.id}
                        className={cn(
                          "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                          selectedFiles[item.id] && uploadingProductId !== item.id
                            ? "bg-warm-accent text-black hover:bg-warm-accent/80"
                            : "bg-warm-bg text-warm-muted cursor-not-allowed"
                        )}
                      >
                        {uploadingProductId === item.id ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          'Upload'
                        )}
                      </button>
                    </div>

                    {/* Upload status */}
                    {uploadingProductId === item.id && (
                      <div className="mt-2 text-xs text-warm-accent">
                        Uploading image...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Utility for cleaner class merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}