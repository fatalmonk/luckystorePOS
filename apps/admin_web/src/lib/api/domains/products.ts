import { supabase } from "@/lib/supabase";
import type { ProductCreateInput, ProductUpdateInput, FindOrCreateItemInput, ItemSummary } from '../types';

const AUTO_SKU_PREFIX = 'GEN-';
const generateSku = () => `${AUTO_SKU_PREFIX}${Math.random().toString(36).slice(2, 14).toUpperCase()}`;

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
    if (!tenantId) throw new Error('Tenant context is required to resolve purchase items');
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Item name is required');
    }

    const cost = asNonNegativeNumber(input.cost, 0) ?? 0;
    const price = asNonNegativeNumber(input.price, null);
    const mrp = asNonNegativeNumber(input.mrp, null);
    const barcode = input.barcode?.trim() || null;
    const sku = input.sku?.trim() || null;
    const categoryId = input.category_id ?? null;
    const imageUrl = input.image_url ?? null;
    const brand = input.brand?.trim() || null;

    // 1. If explicit item ID was passed (e.g. completing details for an OCR auto-created item)
    if (input.id) {
      const updateData: Record<string, any> = { name: trimmedName };
      if (input.cost != null && Number.isFinite(Number(input.cost))) updateData.cost = cost;
      if (input.price != null && Number.isFinite(Number(input.price))) updateData.price = price;
      if (input.mrp !== undefined && (input.mrp === null || Number.isFinite(Number(input.mrp)))) updateData.mrp = mrp;
      if (input.barcode !== undefined) updateData.barcode = barcode;
      if (input.sku !== undefined) updateData.sku = sku;
      if (input.category_id !== undefined) updateData.category_id = categoryId;
      if (input.image_url !== undefined) updateData.image_url = imageUrl;
      if (input.brand !== undefined) updateData.brand = brand;

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
      .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url, is_active');

    matchQuery = matchQuery.eq('tenant_id', tenantId);

    if (barcode) {
      matchQuery = matchQuery.eq('barcode', barcode);
    } else if (sku) {
      matchQuery = matchQuery.eq('sku', sku);
    } else {
      matchQuery = matchQuery.ilike('name', escapeLikePattern(trimmedName));
    }

    let { data: existing, error: searchError } = await matchQuery;
    if ((!existing || existing.length === 0) && barcode && sku) {
      let skuQuery = supabase.from('items')
        .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url, is_active')
        .eq('sku', sku);
      skuQuery = skuQuery.eq('tenant_id', tenantId);
      const skuResult = await skuQuery;
      existing = skuResult.data;
      searchError = skuResult.error;
    }
    if (searchError) throw new Error(searchError.message || 'Failed to resolve existing item');
    if (existing && existing.length > 1) {
      throw new Error('More than one inventory item matches this receipt line. Select a specific SKU before completing it.');
    }
    if (existing && existing.length === 1) {
      const row = existing[0] as ItemSummary & { is_active: boolean };
      if (!row.is_active) {
        let reactivateQuery = supabase.from('items')
          .update({ is_active: true, name: trimmedName, cost, price: price ?? 0, mrp, ...(barcode ? { barcode } : {}), ...(sku ? { sku } : {}) } as any)
          .eq('id', row.id);
        reactivateQuery = reactivateQuery.eq('tenant_id', tenantId);
        const { data: reactivated, error: reactivateError } = await reactivateQuery
          .select('id, name, sku, barcode, cost, price, mrp, brand, category_id, image_url')
          .single();
        if (reactivateError) throw new Error(reactivateError.message || 'Failed to reactivate item');
        return reactivated as ItemSummary;
      }
      return row;
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
      insertPayload.tenant_id = tenantId;
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
