-- =============================================================================
-- Migration: Cleanup Overloaded Function Signatures
-- Timestamp: 20260517130000
-- Purpose: Drop stale, overloaded duplicate functions to prevent "is not unique"
--          ambiguity errors during runtime execution and replay certification.
-- =============================================================================

-- Drop duplicate overloaded versions of adjust_stock (7-argument vs 6-argument)
DROP FUNCTION IF EXISTS public.adjust_stock(uuid, uuid, integer, text, text, uuid, text) CASCADE;

-- Drop duplicate overloaded versions of deduct_stock (4-argument and 5-argument vs 6-argument)
DROP FUNCTION IF EXISTS public.deduct_stock(uuid, uuid, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.deduct_stock(uuid, uuid, integer, jsonb, uuid) CASCADE;

-- Drop duplicate overloaded versions of void_sale (3-argument vs 2-argument)
DROP FUNCTION IF EXISTS public.void_sale(uuid, text, text) CASCADE;

-- Drop duplicate overloaded versions of record_purchase (7-argument vs 12-argument)
DROP FUNCTION IF EXISTS public.record_purchase(text, uuid, uuid, uuid, uuid, jsonb, text) CASCADE;

-- Drop obsolete 1-argument version of get_stock_level_by_id
DROP FUNCTION IF EXISTS public.get_stock_level_by_id(uuid) CASCADE;
