const url = 'http://127.0.0.1:54321/rest/v1/rpc/set_inventory_stock';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bWl1cHRxdHFyaXZ2YWNzdGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU0OTg1OTksImV4cCI6MjAzMTA3NDU5OX0.eW_t_QOaW1iHhA_uFjM1wB5m_z_H1U_K2Yv_x8Z-K6U';
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    'Prefer': 'tx=serializable, return=representation'
  },
  body: JSON.stringify({
    p_tenant_id: '00000000-0000-0000-0000-000000000000',
    p_store_id: '00000000-0000-0000-0000-000000000000',
    p_item_id: '00000000-0000-0000-0000-000000000000',
    p_new_quantity: 100,
    p_movement_type: 'manual',
    p_reference_type: 'system'
  })
});
console.log(await res.text());
