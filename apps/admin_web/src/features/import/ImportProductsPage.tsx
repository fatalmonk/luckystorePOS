import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { ImportWizard } from '../../components/ImportWizard';
import { supabase } from "@/lib/supabase";
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { useTranslation } from 'react-i18next';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number({ message: 'Sales Price must be a number' }).min(0, 'Sales Price cannot be negative'),
  cost: z.number({ message: 'Purchase Price must be a number' }).min(0, 'Purchase Price cannot be negative'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
});

export const ImportProductsPage: React.FC = () => {
  const { tenantId, storeId } = useAuth();
  const { notify } = useNotify();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      if (!error && data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  const fieldMeta = [
    { key: 'name', label: 'Product Name', type: 'string' as const, required: true },
    { key: 'price', label: 'Sales Price (৳)', type: 'number' as const, required: true },
    { key: 'cost', label: 'Purchase Price (৳)', type: 'number' as const, required: true },
    { key: 'sku', label: 'Item Code (SKU)', type: 'string' as const },
    { key: 'barcode', label: 'Barcode', type: 'string' as const },
    {
      key: 'category_id',
      label: 'Category',
      type: 'select' as const,
      options: categories.map((c) => c.name), // Show names in dropdown, map back to ID on submit
    },
  ];

  const sampleData = [
    {
      'Product Name': 'Dano Daily Pusti 1kg',
      'Sales Price (৳)': 850,
      'Purchase Price (৳)': 780,
      'Item Code (SKU)': 'DDP-001',
      Barcode: '894000123456',
      Category: categories[0]?.name || 'Dairy',
    },
    {
      'Product Name': 'Rupchanda Soyabean Oil 5L',
      'Sales Price (৳)': 910,
      'Purchase Price (৳)': 860,
      'Item Code (SKU)': 'RSO-5L',
      Barcode: '894000654321',
      Category: categories[1]?.name || 'Oil',
    },
  ];

  const handleImportSubmit = async (data: any[]) => {
    // Map category name to category ID
    const payload = data.map((row) => {
      const catObj = categories.find((c) => c.name === row.category_id);
      return {
        tenant_id: tenantId,
        name: row.name.trim(),
        price: Number(row.price),
        cost: Number(row.cost),
        sku: row.sku?.trim() || `GEN-${Math.floor(Math.random() * 100000)}`,
        barcode: row.barcode?.trim() || null,
        category_id: catObj ? catObj.id : null,
        is_active: true,
      };
    });

    const { error } = await supabase.from('items').insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    notify(`Successfully imported ${data.length} products`, 'success');
  };

  return (
    <div className="dashboard-container p-6 space-y-6">
      <ImportWizard
        title={t('nav.importProducts')}
        sampleFileName="lucky_store_products_template.xlsx"
        sampleData={sampleData}
        validationSchema={productSchema}
        onImportSubmit={handleImportSubmit}
        fieldMeta={fieldMeta}
      />
    </div>
  );
};

export default ImportProductsPage;
