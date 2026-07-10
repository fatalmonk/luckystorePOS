-- Migration: get_inventory_list_v2 (Pagination, Available Stock, Margin, Total Value)

CREATE OR REPLACE FUNCTION public.get_inventory_list_v2(
    p_store_id uuid,
    p_search text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_status text DEFAULT 'ALL', -- 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'ALL'
    p_sort_by text DEFAULT 'name', -- 'name', 'price', 'available_qty', 'total_value', 'margin_pct'
    p_sort_order text DEFAULT 'asc', -- 'asc', 'desc'
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    sku text,
    category_id uuid,
    category_name text,
    image_url text,
    price numeric,
    cost numeric,
    mrp numeric,
    total_qty integer,
    reserved_qty integer,
    available_qty integer,
    margin_pct numeric,
    total_value numeric,
    reorder_status text,
    min_qty integer,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    WITH base_data AS (
        SELECT 
            i.id,
            i.name,
            i.sku,
            i.category_id,
            c.name AS category_name,
            i.image_url,
            i.price,
            i.cost,
            i.mrp,
            COALESCE(sl.qty, 0)::integer AS total_qty,
            COALESCE(sl.reserved, 0)::integer AS reserved_qty,
            (COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0))::integer AS available_qty,
            CASE 
                WHEN COALESCE(i.price, 0) > 0 AND COALESCE(i.cost, 0) > 0 THEN 
                    ROUND(((i.price - i.cost) / i.price * 100), 2)
                ELSE 0 
            END AS margin_pct,
            ((COALESCE(sl.qty, 0) - COALESCE(sl.reserved, 0)) * COALESCE(i.price, 0)) AS total_value,
            COALESCE(sat.min_qty, 5)::integer AS min_qty
        FROM public.items i
        LEFT JOIN public.categories c ON i.category_id = c.id
        LEFT JOIN public.stock_levels sl ON sl.item_id = i.id AND sl.store_id = p_store_id
        LEFT JOIN public.stock_alert_thresholds sat ON sat.item_id = i.id AND sat.store_id = p_store_id
        WHERE i.is_active = true
          AND (p_category_id IS NULL OR i.category_id = p_category_id)
          AND (
              p_search IS NULL OR p_search = '' 
              OR i.name ILIKE '%' || p_search || '%' 
              OR i.sku ILIKE '%' || p_search || '%'
          )
    ),
    status_filtered AS (
        SELECT *,
            CASE
                WHEN available_qty <= 0 THEN 'OUT_OF_STOCK'
                WHEN available_qty <= min_qty THEN 'LOW_STOCK'
                ELSE 'IN_STOCK'
            END AS reorder_status
        FROM base_data
    ),
    final_filtered AS (
        SELECT * FROM status_filtered
        WHERE 
            p_status = 'ALL' 
            OR (p_status = 'IN_STOCK' AND available_qty > min_qty)
            OR (p_status = 'LOW_STOCK' AND available_qty <= min_qty AND available_qty > 0)
            OR (p_status = 'OUT_OF_STOCK' AND available_qty <= 0)
    ),
    counted AS (
        SELECT count(*) AS total_count FROM final_filtered
    )
    SELECT 
        f.id, f.name, f.sku, f.category_id, f.category_name, f.image_url, 
        f.price, f.cost, f.mrp, f.total_qty, f.reserved_qty, f.available_qty, 
        f.margin_pct, f.total_value, f.reorder_status, f.min_qty,
        c.total_count
    FROM final_filtered f
    CROSS JOIN counted c
    ORDER BY 
        CASE WHEN p_sort_order = 'asc' THEN
            CASE p_sort_by
                WHEN 'name' THEN f.name
                WHEN 'sku' THEN f.sku
                ELSE NULL
            END
        END ASC,
        CASE WHEN p_sort_order = 'desc' THEN
            CASE p_sort_by
                WHEN 'name' THEN f.name
                WHEN 'sku' THEN f.sku
                ELSE NULL
            END
        END DESC,
        CASE WHEN p_sort_order = 'asc' THEN
            CASE p_sort_by
                WHEN 'price' THEN f.price
                WHEN 'available_qty' THEN f.available_qty
                WHEN 'total_value' THEN f.total_value
                WHEN 'margin_pct' THEN f.margin_pct
                ELSE NULL
            END
        END ASC NULLS FIRST,
        CASE WHEN p_sort_order = 'desc' THEN
            CASE p_sort_by
                WHEN 'price' THEN f.price
                WHEN 'available_qty' THEN f.available_qty
                WHEN 'total_value' THEN f.total_value
                WHEN 'margin_pct' THEN f.margin_pct
                ELSE NULL
            END
        END DESC NULLS LAST,
        f.name ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;
