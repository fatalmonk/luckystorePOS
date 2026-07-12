import { supabase } from "@/lib/supabase";
import { createClient } from '@supabase/supabase-js';
import type { ReceiptConfigUpdateInput } from '../types';
import type { Database } from '../../database.types';

// Create a single temporary client for signups to prevent GoTrue warning
const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'temp-signup-key',
    },
  }
);

export const settings = {
  getPaymentMethods: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_payment_methods', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  getUsers: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_store_users', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  getReceiptConfig: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_receipt_config_simple', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  updateReceiptConfig: async (storeId: string, config: ReceiptConfigUpdateInput) => {
    const { data, error } = await supabase.rpc('update_receipt_config_simple', {
      p_store_id: storeId,
      p_store_name: config.store_name,
      p_header_text: config.header_text,
      p_footer_text: config.footer_text
    });
    if (error) throw error;
    return data;
  },
  addUser: async (storeId: string, user: { email: string; password: string; fullName: string; role: string; pin: string; tenantId: string }) => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: user.email,
        password: user.password,
      });
      
      if (authError) {
        console.error("Auth Error full object:", authError);
        throw new Error(authError.message || `Auth Error: ${JSON.stringify(authError, Object.getOwnPropertyNames(authError))}`);
      }
      
      const authId = authData.user?.id;
      if (!authId) {
        throw new Error('Signup succeeded but no auth user ID returned from Supabase.');
      }
      
      // 2. Create user record via RPC (bypasses RLS)
      const { data, error } = await supabase.rpc('create_store_user' as any, {
        p_email: user.email,
        p_full_name: user.fullName,
        p_role: user.role,
        p_pin: user.pin,
        p_store_id: storeId,
        p_tenant_id: user.tenantId,
        p_auth_id: authId,
      });
      
      if (error) {
        console.error("RPC Error full object:", error);
        throw new Error(error.message || `Database Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      }
      
      return data;
    } catch (err: any) {
      console.error("Catch block err:", err);
      throw new Error(err.message || `Unknown Error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
    }
  },
  addPaymentMethod: async (
    storeId: string,
    method: {
      name: string;
      type: Database['public']['Enums']['payment_type'];
      isActive: boolean;
    }
  ) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([{
        store_id: storeId,
        name: method.name,
        type: method.type,
        is_active: method.isActive,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  togglePaymentMethod: async (methodId: string, isActive: boolean) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_active: isActive })
      .eq('id', methodId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deletePaymentMethod: async (methodId: string) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  updateUser: async (userId: string, updates: { name?: string; role?: string; pos_pin?: string }) => {
    const { data, error } = await supabase.rpc('update_store_user' as any, {
      p_user_id: userId,
      p_updates: updates,
    });
    if (error) throw error;
    return data;
  },
  deleteUser: async (userId: string) => {
    const { data, error } = await supabase.rpc('delete_store_user' as any, {
      p_user_id: userId,
    });
    if (error) throw error;
    return data;
  },
};