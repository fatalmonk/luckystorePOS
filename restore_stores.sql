INSERT INTO public.stores (id, tenant_id, name) 
VALUES ('4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd', '00000000-0000-0000-0000-000000000001', 'Lucky Store') 
ON CONFLICT (id) DO NOTHING;
