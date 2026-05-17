-- ============================================================================
-- MEDIUM PRIORITY SECURITY FIX: Restrict authenticated EXECUTE on admin functions
-- ============================================================================
-- Issue: All authenticated users can execute SECURITY DEFINER functions
-- Fix: Revoke EXECUTE from authenticated on sensitive admin/manager-only functions
-- Note: This assumes role-based checks are done in application layer or via RLS
-- ============================================================================

-- ============================================================================
-- ADMIN-ONLY FUNCTIONS: Accounting Period & Ledger Management
-- ============================================================================

-- Period closing and validation (should be admin only)
REVOKE EXECUTE ON FUNCTION public.close_accounting_period(uuid, date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_trial_balance(uuid, date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.replay_sale_ledger_chain(uuid) FROM authenticated;

-- Ledger worker management (should be admin only)
REVOKE EXECUTE ON FUNCTION public.register_ledger_worker(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.deactivate_ledger_worker(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reclaim_stale_ledger_locks() FROM authenticated;

-- ============================================================================
-- MANAGER-ONLY FUNCTIONS: Overrides and Risk Management
-- ============================================================================

-- POS override token issuance (should be manager only)
REVOKE EXECUTE ON FUNCTION public.issue_pos_override_token(uuid, text, jsonb, integer) FROM authenticated;

-- Void sales (should require manager approval)
REVOKE EXECUTE ON FUNCTION public.void_sale(uuid, text) FROM authenticated;

-- Close risk analytics (manager dashboard)
REVOKE EXECUTE ON FUNCTION public.get_close_risk_analytics(uuid, uuid, date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_monthly_governance_scorecard(uuid, uuid, date) FROM authenticated;

-- ============================================================================
-- FUNCTIONS WITH INTERNAL AUTH CHECKS: Keep accessible but rely on internal checks
-- ============================================================================

-- These functions have role checks inside them, so keep accessible:
-- - complete_sale (checks cashier permissions)
-- - record_purchase (checks user permissions)
-- - adjust_stock (checks manager/admin)
-- - create_sale (checks cashier permissions)

-- ============================================================================
-- NOTE: To fully implement role-based access, consider:
-- 1. Creating PostgreSQL roles: pos_admin, pos_manager, pos_cashier
-- 2. Granting EXECUTE to specific roles instead of authenticated
-- 3. Using RLS policies for row-level restrictions
--
-- Example for future implementation:
--   CREATE ROLE pos_manager;
--   GRANT EXECUTE ON FUNCTION public.void_sale(uuid, text) TO pos_manager;
--   GRANT pos_manager TO specific_user;
-- ============================================================================
