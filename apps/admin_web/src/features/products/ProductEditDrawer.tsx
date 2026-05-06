import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface ProductEditDrawerProps {
  product: any | null;
  categories: any[] | undefined;
  onClose: () => void;
}

export function ProductEditDrawer({ product, categories, onClose }: ProductEditDrawerProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price,
        cost: product.cost,
        sku: product.sku,
        barcode: product.barcode,
        category_id: product.category_id,
        active: product.active,
      });
    }
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: (updates: any) => api.products.update(product.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  if (!product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Drawer isOpen={!!product} onClose={onClose} title="Edit Product" className="w-[450px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
        <Input 
          label="Product Name"
          value={formData.name || ''} 
          onChange={e => setFormData({...formData, name: e.target.value})}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Sales Price (৳)"
            type="number" 
            value={formData.price || 0} 
            onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
            required
          />
          <Input 
            label="Purchase Price (৳)"
            type="number" 
            value={formData.cost || 0} 
            onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
            required
          />

          <div className="flex items-end gap-2">
            <Input 
              label="Item Code (SKU)"
              value={formData.sku || ''} 
              onChange={e => setFormData({...formData, sku: e.target.value})}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={() => setFormData({...formData, sku: 'GEN-' + Math.floor(Math.random()*10000)})} className="mb-[2px]">
              Gen
            </Button>
          </div>
          
          <Input 
            label="Barcode"
            value={formData.barcode || ''} 
            onChange={e => setFormData({...formData, barcode: e.target.value})}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-main">Category</label>
          <select 
            value={formData.category_id || ''} 
            onChange={e => setFormData({...formData, category_id: e.target.value})}
            className="px-3 py-2 rounded-md border border-border-color bg-input text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Category</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input 
            type="checkbox" 
            id="active"
            checked={formData.active || false} 
            onChange={e => setFormData({...formData, active: e.target.checked})}
            className="rounded border-border-color text-primary focus:ring-primary"
          />
          <label htmlFor="active" className="text-sm font-medium text-text-main">Active Product</label>
        </div>

        <div className="mt-auto pt-8">
          <Button type="submit" loading={updateMutation.isPending} icon={<Save size={18} />} className="w-full">
            Save Changes
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
