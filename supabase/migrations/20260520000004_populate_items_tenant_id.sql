-- Migration: Populate items.tenant_id for existing items where NULL
-- Date: 2026-05-20

-- Update items with NULL tenant_id to use store's tenant_id
UPDATE public.items i
SET tenant_id = s.tenant_id
FROM public.stores s
WHERE i.tenant_id IS NULL
  AND i.category_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.categories c 
    WHERE c.id = i.category_id 
      AND c.tenant_id = s.tenant_id
  );

-- For remaining items with NULL tenant_id, use Lucky Store's tenant
-- Lucky Store ID: 4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd
UPDATE public.items i
SET tenant_id = s.tenant_id
FROM public.stores s
WHERE i.tenant_id IS NULL
  AND s.id = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd'::uuid;

-- Create index if not exists for performance
CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON public.items(tenant_id);

COMMENT ON TABLE public.items IS 'Items table with tenant_id populated for RLS isolation';
