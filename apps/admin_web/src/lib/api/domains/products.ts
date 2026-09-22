import { supabase } from "@/lib/supabase";
import type { ProductCreateInput, ProductUpdateInput, FindOrCreateItemInput, ItemSummary } from '../types';

const AUTO_SKU_PREFIX = 'GEN-';
const generateSku = () => `${AUTO_SKU_PREFIX}${Math.floor(10000 + Math.random() * 90000)}`;

const asNonNegativeNumber = (value: number | null | undefined, fallback: number | null) =>
  value != null && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

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
  create: async (tenantId: string, product: ProductCreateInput) => {
    const { stock: _stock, ...itemData } = product;
    const { data, error } = await supabase
      .from('items')
      .insert({ ...itemData, tenant_id: tenantId } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  findOrCreate: async (tenantId: string, input: FindOrCreateItemInput): Promise<ItemSummary> => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Item name is required');
    }

    const cost = asNonNegativeNumber(input.cost, 0) ?? 0;
    const price = asNonNegativeNumber(input.price, null);
    const mrp = asNonNegativeNumber(input.mrp, null);
    const barcode = input.barcode?.trim() || null;
    const sku = input.sku?.trim() || null;
    const categoryId = input.category_id ?? input.categoryId ?? null;
    const imageUrl = input.image_url ?? input.imageUrl ?? null;
    const brand = input.brand?.trim() || null;

    // 1. If explicit item ID was passed (e.g. completing details for an OCR auto-created item)
    if (input.id) {
      const updateData: Record<string, any> = { name: trimmedName };
      if (input.cost != null && Number.isFinite(Number(input.cost))) updateData.cost = cost;
      if (input.price != null && Number.isFinite(Number(input.price))) updateData.price = price;
      if (input.mrp != null && Number.isFinite(Number(input.mrp))) updateData.mrp = mrp;
      if (barcode) updateData.barcode = barcode;
      if (sku) updateData.sku = sku;
      if (categoryId) updateData.category_id = categoryId;
      if (imageUrl) updateData.image_url = imageUrl;
      if (brand) updateData.brand = brand;

      const { data: updated, error: updateError } = await supabase
        .from('items')
        .update(updateData as any)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
        .single();

      if (updateError) throw new Error(updateError.message || 'Failed to update item');
      return updated as ItemSummary;
    }

    // 2. Check if item already exists by barcode, sku, or case-insensitive exact name
    let matchQuery = supabase
      .from('items')
      .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
      .eq('is_active', true);

    if (tenantId) {
      matchQuery = matchQuery.eq('tenant_id', tenantId);
    }

    if (barcode) {
      matchQuery = matchQuery.eq('barcode', barcode);
    } else if (sku) {
      matchQuery = matchQuery.eq('sku', sku);
    } else {
      matchQuery = matchQuery.ilike('name', escapeLikePattern(trimmedName));
    }

    const { data: existing, error: searchError } = await matchQuery.limit(1);
    if (!searchError && existing && existing.length > 0) {
      return existing[0] as ItemSummary;
    }

    // If searched by barcode/sku but didn't find, also verify if exact name matches
    if (barcode || sku) {
      let nameQuery = supabase
        .from('items')
        .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
        .ilike('name', escapeLikePattern(trimmedName))
        .eq('is_active', true);
      if (tenantId) nameQuery = nameQuery.eq('tenant_id', tenantId);
      const { data: nameMatches } = await nameQuery.limit(1);
      if (nameMatches && nameMatches.length > 0) {
        return nameMatches[0] as ItemSummary;
      }
    }

    // 3. Insert new item if not found
    // The unique indexes are the final authority. Retry only an automatically
    // generated SKU collision; explicit barcode/SKU conflicts must be surfaced.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const finalSku = sku || generateSku();
      const insertPayload: Record<string, any> = {
        name: trimmedName,
        sku: finalSku,
        cost,
        price: price ?? 0,
        mrp,
        brand,
        is_active: true,
      };
      if (tenantId) insertPayload.tenant_id = tenantId;
      if (barcode) insertPayload.barcode = barcode;
      if (categoryId) insertPayload.category_id = categoryId;
      if (imageUrl) insertPayload.image_url = imageUrl;

      const { data: created, error: insertError } = await supabase
        .from('items')
        .insert(insertPayload as any)
        .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
        .single();

      if (!insertError) return created as ItemSummary;
      if (!sku && insertError.code === '23505' && attempt < 3) continue;
      throw new Error(insertError.message || 'Failed to create item');
    }

    throw new Error('Unable to generate a unique SKU. Please try again.');
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
  create: async (tenantId: string, storeId: string, category: {
    name: string;
    category: string;
    slug: string;
    parent_id?: string | null;
    color?: string | null;
    icon?: string | null;
    emoji?: string | null;
    display_order?: number | null;
    active?: boolean | null;
    image_url?: string | null;
    id?: string;
  }) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        tenant_id: tenantId,
        store_id: storeId,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: {
    name?: string;
    category?: string;
    slug?: string;
    parent_id?: string | null;
    color?: string | null;
    icon?: string | null;
    emoji?: string | null;
    display_order?: number | null;
    active?: boolean | null;
  }) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  remove: async (id: string) => {
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
