import { useEffect } from 'react';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '../../lib/zodResolver';
import { productSchema, ProductData } from '../../schemas/product.schema';
import { useUpdateProduct } from '../../hooks/mutations/useProductMutations';
import { Form, FormInput, FormSelect, PriceInput, BarcodeInput, FormCheckbox, FormActions } from '../../components/forms';
import { Drawer } from '../../components/ui/Drawer';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { Button } from '../../components/ui/Button';

interface ProductEditDrawerProps {
  product: any | null;
  categories: any[] | undefined;
  onClose: () => void;
}

export function ProductEditDrawer({ product, categories, onClose }: ProductEditDrawerProps) {
  const updateMutation = useUpdateProduct();

  const form = useForm<ProductData>({
    resolver: zodResolver(productSchema),
    values: product ? {
      name: product.name,
      price: product.price,
      cost: product.cost || 0,
      sku: product.sku || '',
      barcode: product.barcode || '',
      categoryId: product.category_id || '',
      active: product.active ?? true,
      minStockLevel: product.minStockLevel || 5,
    } : undefined
  });

  useUnsavedChangesGuard(form.formState.isDirty);

  if (!product) return null;

  const handleSubmit = (data: ProductData) => {
    updateMutation.mutate({ id: product.id, data }, {
      onSuccess: () => {
        form.reset();
        onClose();
      }
    });
  };

  return (
    <Drawer isOpen={!!product} onClose={onClose} title="Edit Product" className="w-[450px]">
      <Form form={form} onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
        <FormInput 
          name="name"
          label="Product Name"
        />

        <div className="grid grid-cols-2 gap-4">
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
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => form.setValue('sku', 'GEN-' + Math.floor(Math.random()*10000), { shouldDirty: true })} 
              className="mb-[2px]"
            >
              Gen
            </Button>
          </div>
          
          <BarcodeInput 
            name="barcode"
            label="Barcode"
          />
        </div>

        <FormSelect
          name="categoryId"
          label="Category"
          options={categories?.map(c => ({ label: c.name, value: c.id })) || []}
        />

        <div className="mt-2">
          <FormCheckbox 
            name="active"
            label="Active Product"
          />
        </div>

        <div className="mt-auto pt-8">
          <Button type="submit" loading={updateMutation.isPending} icon={<Save size={18} />} className="w-full">
            Save Changes
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
