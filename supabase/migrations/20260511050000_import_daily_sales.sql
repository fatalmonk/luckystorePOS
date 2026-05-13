-- Migration: Import historical daily sales data from CSV
-- Applied: 2026-05-11
-- Store ID: 4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd (Lucky Store)

DO $$
DECLARE
  v_store_id uuid := '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = v_store_id) THEN
    RAISE NOTICE 'Store % not found — skipping daily sales import', v_store_id;
    RETURN;
  END IF;

  INSERT INTO public.daily_sales (store_id, sale_date, cash_amount, bkash_amount, credit_amount, total_sales, stock_purchase, daily_expense) VALUES
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-03', 0, 0, 0, 0, 165013, 183763),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-04', 6300, 0, 0, 6300, 27450, 27550),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-05', 0, 0, 0, 0, 20023, 31420),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-06', 6869, 0, 0, 6869, 33622, 33722),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-07', 3273, 0, 0, 3273, 27946, 30206),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-08', 4033, 0, 0, 4033, 141658, 141758),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-09', 4393, 0, 0, 4393, 28963, 30303),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-10', 6743, 4400, 0, 11143, 8340, 8440),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-11', 11588, 0, 0, 11588, 0, 100),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-12', 6313, 0, 0, 6313, 47613, 49853),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-13', 6153, 0, 0, 6153, 52319, 54019),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-14', 8242, 0, 0, 8242, 16331, 18131),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-15', 4998, 0, 0, 4998, 5212, 10612),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-16', 6385, 0, 0, 6385, 9634, 24854),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-17', 6657, 1100, 0, 7757, 0, 200),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-18', 12793, 1400, 0, 14193, 6120, 8220),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-19', 7789, 0, 0, 7789, 3613, 4213),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-20', 8279, 0, 0, 8279, 10757, 27717),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-21', 4793, 0, 0, 4793, 22960, 23060),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-22', 10716, 0, 0, 10716, 23264, 27364),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-23', 11373, 0, 235, 11608, 15237, 15487),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-24', 11051, 0, 896, 11947, 900, 1000),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-25', 10738, 0, 10704, 21442, 4123, 4673),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-26', 9151, 0, 899, 10050, 52473, 52523),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-27', 11645, 0, 3320, 14965, 2802, 2852),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-28', 10371, 0, 4716, 15087, 2094, 3394),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-29', 22187, 0, 2560, 24747, 17418, 17468),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-04-30', 13773, 0, 18807, 32580, 2253, 2333),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-01', 9676, 0, 0, 9676, 0, 2040),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-02', 11398, 0, 0, 11398, 3543, 4613),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-03', 16050, 2110, 0, 18160, 7476, 7636),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-04', 10612, 0, 0, 10612, 17127.60, 23237.60),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-05', 13802, 0, 0, 13802, 32352, 32402),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-06', 7658, 0, 0, 7658, 0, 2000),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-07', 15017, 0, 0, 15017, 0, 0),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-08', 16140, 0, 0, 16140, 0, 0),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-09', 10702, 0, 0, 10702, 0, 0),
('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '2026-05-10', 14360, 0, 0, 14360, 0, 0)
ON CONFLICT (store_id, sale_date) DO UPDATE SET
    cash_amount = EXCLUDED.cash_amount,
    bkash_amount = EXCLUDED.bkash_amount,
    credit_amount = EXCLUDED.credit_amount,
    total_sales = EXCLUDED.total_sales,
    stock_purchase = EXCLUDED.stock_purchase,
    daily_expense = EXCLUDED.daily_expense,
    updated_at = now();

  RAISE NOTICE 'Imported daily sales successfully';
END;
$$;

-- Summary comment
-- Total records imported: 39
-- Date range: April 3 - May 10, 2026
-- Total Sales: ৳403,168
-- Total Stock Purchase: ৳808,636.60
-- Total Daily Expense: ৳907,163.60