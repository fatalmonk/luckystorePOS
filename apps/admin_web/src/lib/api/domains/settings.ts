import { supabase } from '../../supabase';
import type { ReceiptConfigUpdateInput } from '../types';

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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });
    if (authError) throw authError;
    const authId = authData.user?.id;
    if (!authId) throw new Error('Signup succeeded but no auth user ID returned');
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authId,
        tenant_id: user.tenantId,
        store_id: storeId,
        name: user.fullName,
        role: user.role,
        pos_pin: user.pin,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  addPaymentMethod: async (storeId: string, method: { name: string; type: string; isActive: boolean }) => {
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
};