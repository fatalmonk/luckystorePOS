import { supabase } from "@/lib/supabase";
import type { Database } from '../../database.types';

export interface StaffMember {
  id: string;
  fullName: string;
  role: string;
  email: string;
  lastLogin: string | null;
}

export interface StaffPerformance {
  userId: string;
  staffName: string;
  role: string;
  totalSales: number;
  totalRevenue: number;
  avgTicket: number;
  totalDiscounts: number;
  activeDays: number;
  revenuePerDay: number;
}

export const staff = {
  list: async (storeId: string): Promise<StaffMember[]> => {
    const { data, error } = await supabase.rpc('get_store_users', {
      p_store_id: storeId,
    });
    if (error) throw error;
    
    const rows = (data ?? []) as Database['public']['Functions']['get_store_users']['Returns'];
    return rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      role: row.role,
      email: row.email,
      lastLogin: row.last_login,
    }));
  },

  updatePin: async (userId: string, pin: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('update_staff_pin', {
      p_user_id: userId,
      p_pin: pin,
    });
    if (error) throw error;
    return !!data;
  },

  getPerformance: async (storeId: string, days: number = 30): Promise<StaffPerformance[]> => {
    const { data, error } = await supabase.rpc('get_staff_performance', {
      p_store_id: storeId,
      p_days: days,
    });
    if (error) throw error;

    const rows = (data ?? []) as Database['public']['Functions']['get_staff_performance']['Returns'];
    return rows.map((row) => ({
      userId: row.user_id,
      staffName: row.staff_name,
      role: row.role,
      totalSales: Number(row.total_sales),
      totalRevenue: Number(row.total_revenue),
      avgTicket: Number(row.avg_ticket),
      totalDiscounts: Number(row.total_discounts),
      activeDays: Number(row.active_days),
      revenuePerDay: Number(row.revenue_per_day),
    }));
  },
};
export default staff;
