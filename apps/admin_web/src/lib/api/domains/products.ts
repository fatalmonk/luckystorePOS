import { supabase } from "@/lib/supabase";
import type { ProductCreateInput, ProductUpdateInput } from '../types';

export const products = {
  list: async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },
  get: async (id: string) => {
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (product: ProductCreateInput) => {
    const { stock: _stock, ...itemData } = product;
    const { data, error } = await supabase.from('items').insert(itemData as any).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: ProductUpdateInput, tenantId?: string) => {
    // If updating price/mrp/cost, use the RPC for proper JSON return
    if (tenantId && (updates.price !== undefined || updates.mrp !== undefined || updates.cost !== undefined)) {
      const { data, error } = await supabase.rpc('update_item_prices' as any, {
        p_item_id: id,
        p_tenant_id: tenantId,
        p_price: updates.price ?? null,
        p_mrp: updates.mrp ?? null,
        p_cost: updates.cost ?? null,
      });
      if (error) throw error;
      // Map RPC response (item_price) to expected interface (price)
      if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0];
        return {
          id: row.item_id,
          name: row.item_name,
          sku: row.item_sku,
          price: row.item_price,
          mrp: row.item_mrp,
          cost: row.item_cost,
          updated_at: row.item_updated_at,
        };
      }
      return data;
    }
    // Otherwise fall back to direct update
    const { stock: _stock, ...itemUpdates } = updates;
    const { data, error } = await supabase.from('items').update(itemUpdates as any).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  remove: async (id: string) => {
    const { data, error } = await supabase.from('items').update({ is_active: false }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

export const categories = {
  list: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  },
};