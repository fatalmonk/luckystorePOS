-- Phase 2A + 2B: Customer Analytics & Staff Performance
-- Provides RPCs:
--   1. get_customer_analytics  -- customer LTV, purchase frequency, total spent
--   2. get_staff_performance   -- sales per cashier, avg ticket, discounts

-- ---------------------------------------------------------------------------
-- 1) RPC: get_customer_analytics
-- Customer analytics from parties + ledger entries linked via sales.
-- Returns LTV, purchase frequency, total spent per customer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_analytics(
  p_store_id uuid,
  p_limit    integer DEFAULT 50
)
RETURNS TABLE (
  party_id              uuid,
  customer_name         text,
  phone                 text,
  total_spent           numeric,
  purchase_count        bigint,
  avg_order_value       numeric,
  last_purchase_date    timestamptz,
  days_since_last       integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH customer_sales AS (
    SELECT
      p.id               AS party_id,
      p.name             AS customer_name,
      p.phone,
      COUNT(DISTINCT s.id)                   AS purchase_count,
      COALESCE(SUM(le.credit), 0) AS total_spent,
      MAX(s.created_at)                      AS last_purchase_date
    FROM public.parties p
    LEFT JOIN public.ledger_entries le ON le.annotation->>'party_id' = p.id::text
    LEFT JOIN public.sales s ON s.id = le.sale_id AND s.store_id = p_store_id AND s.status = 'completed'
    WHERE p.type = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.stores st
        JOIN public.users u ON u.tenant_id = st.tenant_id
        WHERE st.id = p_store_id
          AND u.auth_id = auth.uid()
      )
    GROUP BY p.id, p.name, p.phone
  )
  SELECT
    cs.party_id,
    cs.customer_name,
    cs.phone,
    cs.total_spent,
    cs.purchase_count,
    CASE WHEN cs.purchase_count > 0
      THEN cs.total_spent / cs.purchase_count
      ELSE 0
    END AS avg_order_value,
    cs.last_purchase_date,
    CASE WHEN cs.last_purchase_date IS NOT NULL
      THEN (EXTRACT(EPOCH FROM now() - cs.last_purchase_date) / 86400)::integer
      ELSE NULL
    END AS days_since_last
  FROM customer_sales cs
  WHERE cs.purchase_count > 0
  ORDER BY cs.total_spent DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_customer_analytics(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_analytics(uuid, integer) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2) RPC: get_staff_performance
-- Sales performance per cashier for a given store over the last p_days.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_staff_performance(
  p_store_id uuid,
  p_days     integer DEFAULT 30
)
RETURNS TABLE (
  user_id          uuid,
  staff_name       text,
  role             text,
  total_sales      bigint,
  total_revenue    numeric,
  avg_ticket       numeric,
  total_discounts  numeric,
  active_days      bigint,
  revenue_per_day  numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    u.id                                              AS user_id,
    COALESCE(u.full_name, u.name, u.email)            AS staff_name,
    u.role                                            AS role,
    COUNT(s.id)                                       AS total_sales,
    COALESCE(SUM(s.total_amount), 0)                  AS total_revenue,
    CASE WHEN COUNT(s.id) > 0
      THEN COALESCE(SUM(s.total_amount), 0) / COUNT(s.id)
      ELSE 0
    END                                               AS avg_ticket,
    COALESCE(SUM(s.discount_amount), 0)               AS total_discounts,
    COUNT(DISTINCT DATE(s.created_at))                AS active_days,
    CASE
      WHEN COUNT(DISTINCT DATE(s.created_at)) > 0
      THEN COALESCE(SUM(s.total_amount), 0) / COUNT(DISTINCT DATE(s.created_at))
      ELSE 0
    END                                               AS revenue_per_day
  FROM public.users u
  INNER JOIN public.sales s ON s.cashier_id = u.id
    AND s.store_id = p_store_id
    AND s.status = 'completed'
    AND s.created_at >= now() - (p_days || ' days')::interval
  WHERE EXISTS (
    SELECT 1 FROM public.stores st
    JOIN public.users cu ON cu.tenant_id = st.tenant_id
    WHERE st.id = p_store_id
      AND cu.auth_id = auth.uid()
  )
  GROUP BY u.id, u.full_name, u.name, u.email, u.role
  ORDER BY total_revenue DESC;
$$;

REVOKE ALL ON FUNCTION public.get_staff_performance(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_performance(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Repair: get_store_users (overcome signature mismatch from repair mig)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_store_users(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_store_users(p_store_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  email text,
  last_login timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT id, full_name, role, email, last_login_at
  FROM public.users
  WHERE store_id = p_store_id OR role = 'admin'
  ORDER BY role ASC, full_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_store_users(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_users(uuid) TO authenticated;
