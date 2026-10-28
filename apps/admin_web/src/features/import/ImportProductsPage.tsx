import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { ImportWizard, type ImportPreviewResult } from '../../components/ImportWizard';
import { supabase } from "@/lib/supabase";
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '@/components';
import { useTranslation } from 'react-i18next';

const optionalUrl = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string()
    .url('Image URL must be a valid URL')
    .refine(
      (str) => !str || str.startsWith('https://'),
      { message: 'Image URL must use HTTPS' }
    )
    .optional(),
);

const optionalMoney = z.preprocess(
  (value) => value === '' || value === undefined ? undefined : value,
  z.number({ message: 'Value must be a number' }).min(0, 'Value cannot be negative').optional(),
);

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  price: optionalMoney,
  cost: optionalMoney,
  mrp: optionalMoney,
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  image_url: optionalUrl,
  is_active: z.boolean().optional(),
});

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function imageSha256(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} exceeds the 10 MiB WebP limit`);
  if (file.type && file.type.toLowerCase() !== 'image/webp') throw new Error(`${file.name} must use the image/webp media type`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') {
    throw new Error(`${file.name} is not a valid WebP file`);
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const ImportProductsPage: React.FC = () => {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const { t } = useTranslation();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const pendingApply = useRef<{ fingerprint: string; batch: Record<string, unknown>; idempotencyKey: string; preview: ImportPreviewResult; checksums: Record<number, string> } | null>(null);

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
    { key: 'brand', label: 'Brand', type: 'string' as const },
    { key: 'price', label: 'Sales Price (৳)', type: 'number' as const },
    { key: 'cost', label: 'Purchase Price (৳)', type: 'number' as const },
    { key: 'mrp', label: 'MRP (৳)', type: 'number' as const },
    { key: 'sku', label: 'Item Code (SKU)', type: 'string' as const },
    { key: 'barcode', label: 'Barcode', type: 'string' as const },
    { key: 'image_url', label: 'Image URL', type: 'string' as const },
    { key: 'is_active', label: 'Active', type: 'boolean' as const, defaultValue: true },
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
      Brand: 'Dano',
      'Sales Price (৳)': 850,
      'Purchase Price (৳)': 780,
      'MRP (৳)': 900,
      'Item Code (SKU)': 'DDP-001',
      Barcode: '894000123456',
      'Image URL': '',
      Category: categories[0]?.name || 'Dairy',
      Active: true,
    },
    {
      'Product Name': 'Rupchanda Soyabean Oil 5L',
      Brand: 'Rupchanda',
      'Sales Price (৳)': 910,
      'Purchase Price (৳)': 860,
      'MRP (৳)': 950,
      'Item Code (SKU)': 'RSO-5L',
      Barcode: '894000654321',
      'Image URL': '',
      Category: categories[1]?.name || 'Oil',
      Active: true,
    },
  ];

  const requestImport = async (form: FormData) => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) throw new Error('Sign in before previewing or applying a product import');
    const response = await fetch(`${supabaseUrl}/functions/v1/import-inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionData.session.access_token}`, apikey: supabaseAnonKey },
      body: form,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error ?? result?.message ?? `Import request failed (${response.status})`);
    return result;
  };

  const buildBatch = (data: Record<string, string | number | boolean>[]) => ({
    contract_version: 1,
    batch_id: crypto.randomUUID(),
    source: 'admin-products-csv-v1',
    ...(storeId ? { requested_store_id: storeId } : {}),
    rows: data.map((row, index) => ({
      source_row: index + 2,
      product: {
        sku: String(row.sku ?? '').trim(),
        name: String(row.name ?? '').trim(),
        ...(row.brand ? { brand: String(row.brand).trim() } : {}),
        ...(row.barcode ? { barcode: String(row.barcode).trim() } : {}),
        ...(row.cost !== '' && row.cost !== undefined ? { cost: Number(row.cost) } : {}),
        ...(row.price !== '' && row.price !== undefined ? { price: Number(row.price) } : {}),
        ...(row.mrp !== '' && row.mrp !== undefined ? { mrp: Number(row.mrp) } : {}),
        ...(row.is_active !== undefined ? { is_active: Boolean(row.is_active) } : {}),
        ...(row.category_id ? { category: String(row.category_id) } : {}),
      },
      stock: { mode: 'none' },
      ...(row.image_url ? { image: { kind: 'url', url: String(row.image_url).trim() } } : {}),
    })),
  });

  const attachmentFingerprint = async (data: Record<string, string | number | boolean>[], attachments: Record<number, File>) => {
    const checksums: Record<number, string> = {};
    for (const [row, file] of Object.entries(attachments)) checksums[Number(row)] = await imageSha256(file);
    return { fingerprint: JSON.stringify({ data, checksums }), checksums };
  };

  const handlePreview = async (data: Record<string, string | number | boolean>[], attachments: Record<number, File>): Promise<ImportPreviewResult> => {
    const { fingerprint, checksums } = await attachmentFingerprint(data, attachments);
    const batch = buildBatch(data);
    const form = new FormData();
    form.append('operation', 'preview');
    form.append('batch', JSON.stringify(batch));
    for (const [row, file] of Object.entries(attachments)) {
      const sourceRow = Number(row);
      form.append(`image_${sourceRow}`, file, file.name);
      form.append(`image_sha256_${sourceRow}`, checksums[sourceRow]);
    }
    const preview = await requestImport(form) as ImportPreviewResult;
    if (!preview?.preview_hash || !preview?.counts || !Array.isArray(preview.rows)) throw new Error('Server returned an incomplete import preview');
    pendingApply.current = { fingerprint, batch, idempotencyKey: crypto.randomUUID(), preview, checksums };
    return { ...preview, images: Object.entries(attachments).map(([row, file]) => ({ source_row: Number(row), name: file.name, size: file.size, sha256: checksums[Number(row)] })) };
  };

  const handleApply = async (data: Record<string, string | number | boolean>[], attachments: Record<number, File>, preview: ImportPreviewResult) => {
    const pending = pendingApply.current;
    const { fingerprint, checksums } = await attachmentFingerprint(data, attachments);
    if (!pending || pending.fingerprint !== fingerprint || pending.preview.preview_hash !== preview.preview_hash) throw new Error('Batch changed after preview. Review a fresh preview before applying.');
    if (JSON.stringify(checksums) !== JSON.stringify(pending.checksums)) throw new Error('Image checksum changed after preview. Review a fresh preview before applying.');
    const form = new FormData();
    form.append('operation', 'apply');
    form.append('batch', JSON.stringify(pending.batch));
    form.append('idempotency_key', pending.idempotencyKey);
    form.append('approved_preview_hash', preview.preview_hash);
    for (const [row, file] of Object.entries(attachments)) {
      const sourceRow = Number(row);
      form.append(`image_${sourceRow}`, file, file.name);
      form.append(`image_sha256_${sourceRow}`, checksums[sourceRow]);
    }
    const applied = await requestImport(form);
    if (applied?.counts?.invalid || applied?.counts?.ambiguous) {
      const rowErrors = (Array.isArray(applied.rows) ? applied.rows : [])
        .filter((row) => row.outcome === 'invalid' || row.outcome === 'ambiguous' || row.errors?.length)
        .map((row) => `row ${row.source_row}: ${(row.errors ?? []).join('; ') || row.outcome}`);
      throw new Error(`Some rows were not applied. Review the server response before retrying.${rowErrors.length ? ` ${rowErrors.join(' | ')}` : ''}`);
    }
    pendingApply.current = null;
    notify(`Successfully processed ${data.length} products`, 'success');
  };

  const handleLegacySubmit = async () => { throw new Error('Product imports must be previewed and explicitly applied'); };

  return (
    <div className="dashboard-container p-6 space-y-6">
      <ImportWizard
        title={t('nav.importProducts')}
        sampleFileName="lucky_store_products_template.csv"
        sampleData={sampleData}
        validationSchema={productSchema}
        onImportSubmit={handleLegacySubmit}
        imageAttachments
        onPreview={handlePreview}
        onApply={handleApply}
        previewTarget={`Supabase project ${new URL(supabaseUrl).hostname.split('.')[0]} · store ${storeId ?? 'session default'}`}
        fieldMeta={fieldMeta}
      />
    </div>
  );
};

export default ImportProductsPage;
