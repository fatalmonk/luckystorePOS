import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '../../lib/zodResolver';
import { productSchema, ProductData } from '../../schemas/product.schema';
import { useCreateProduct } from '../../hooks/mutations/useProductMutations';
import { Form, FormInput, FormSelect, PriceInput, BarcodeInput, FormActions } from '../../components/forms';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface ProductAddModalProps {
  isOpen: boolean;
  categories: any[] | undefined;
  onClose: () => void;
}

export function ProductAddModal({ isOpen, categories, onClose }: ProductAddModalProps) {
  const createMutation = useCreateProduct();
  
  const form = useForm<ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      cost: 0,
      sku: '',
      barcode: '',
      categoryId: '',
      active: true,
      minStockLevel: 5,
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (data: ProductData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        onClose();
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product" className="max-w-2xl">
      <Form form={form} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput 
            name="name"
            label="Product Name"
            placeholder="e.g. Dano Daily Pusti 1kg"
            className="col-span-2"
          />

          <div className="col-span-2">
            <FormSelect
              name="categoryId"
              label="Category"
              options={categories?.map(c => ({ label: c.name, value: c.id })) || []}
            />
          </div>

          <PriceInput 
            name="price"
            label="Sales Price"
          />
          <PriceInput 
            name="cost"
            label="Purchase Price"
          />

          <div className="flex items-end gap-2">
            <FormInput 
              name="sku"
              label="Item Code (SKU)"
              placeholder="DDP-001"
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => form.setValue('sku', 'GEN-' + Math.floor(Math.random()*10000), { shouldDirty: true })} 
              className="mb-[2px]"
            >
              Generate
            </Button>
          </div>
          
          <BarcodeInput 
            name="barcode"
            label="Barcode"
            placeholder="LS-000001"
          />
        </div>

        <FormActions>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={createMutation.isPending} icon={<Plus size={18} />}>
            Add Product
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
