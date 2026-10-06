-- Migration: Reconcile opening catalog costs for 5 user-confirmed SKUs
-- Date: 2026-10-06
-- Reference: Lucky Store Opening Cost Reconciliation - 5 Oct 2026
-- Review status: USER_CONFIRMED_SOURCE_COST_DIFFERS_FROM_CATALOG

UPDATE public.items
SET cost = 1.70,
    updated_at = NOW()
WHERE sku = 'CC-PLS-MGM';

UPDATE public.items
SET cost = 1.70,
    updated_at = NOW()
WHERE sku = 'CC-PLS-MGM-1';

UPDATE public.items
SET cost = 59.16,
    updated_at = NOW()
WHERE sku = 'IC-POL-MAN';

UPDATE public.items
SET cost = 255.00,
    updated_at = NOW()
WHERE sku = 'IC-POL-MAN-2';

UPDATE public.items
SET cost = 59.16,
    updated_at = NOW()
WHERE sku = 'IC-POL-PRE';
