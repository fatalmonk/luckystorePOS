import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface ProductAddModalProps {
  isOpen: boolean;
  categories: any[] | undefined;
  onClose: () => void;
}

export function ProductAddModal({ isOpen, categories, onClose }: ProductAddModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({
    name: '',
    price: 0,
    cost: 0,
    sku: '',
    barcode: '',
    category_id: '',
    active: true,
  });

  const createMutation = useMutation({
    mutationFn: (newProduct: any) => api.products.create(newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setFormData({
        name: '',
        price: 0,
        cost: 0,
        sku: '',
        barcode: '',
        category_id: '',
        active: true,
      });
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Product Name"
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
            placeholder="e.g. Dano Daily Pusti 1kg"
            className="col-span-2"
          />

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-sm font-medium text-text-main">Category</label>
            <select 
              value={formData.category_id} 
              onChange={e => setFormData({...formData, category_id: e.target.value})}
              className="px-3 py-2 rounded-md border border-border-color bg-input text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Category</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <Input 
            label="Sales Price (৳)"
            type="number" 
            value={formData.price} 
            onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
            required
          />
          <Input 
            label="Purchase Price (৳)"
            type="number" 
            value={formData.cost} 
            onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
            required
          />

          <div className="flex items-end gap-2">
            <Input 
              label="Item Code (SKU)"
              value={formData.sku} 
              onChange={e => setFormData({...formData, sku: e.target.value})}
              placeholder="DDP-001"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={() => setFormData({...formData, sku: 'GEN-' + Math.floor(Math.random()*10000)})} className="mb-[2px]">
              Generate
            </Button>
          </div>
          
          <Input 
            label="Barcode"
            value={formData.barcode} 
            onChange={e => setFormData({...formData, barcode: e.target.value})}
            placeholder="LS-000001"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-light">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={createMutation.isPending} icon={<Plus size={18} />}>
            Add Product
          </Button>
        </div>
      </form>
    </Modal>
  );
}
