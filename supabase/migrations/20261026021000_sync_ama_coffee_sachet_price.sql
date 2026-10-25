-- Migration: Align AMA Classic Coffee Sachet with verified catalog record
-- Prevents test and seed databases from drifting against production items row

UPDATE public.items
SET
  sku = 'TC-AMA-CLS-075G',
  barcode = 'TC-AMA-CLS-075G',
  name = 'AMA Classic Coffee Sachet 0.75 g',
  short_code = 'TC-AMA-CLS-075G',
  price = 5.0,
  mrp = 5.0,
  cost = 2.0,
  description = 'AMA Classic coffee sachet, net weight 0.75 g, soluble coffee powder for a quick, portable brew.',
  updated_at = NOW()
WHERE id = '3448ed8a-9c0b-49ab-b249-f096fbc210c7'::uuid;
