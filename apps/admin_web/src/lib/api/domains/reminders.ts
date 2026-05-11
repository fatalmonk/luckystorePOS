import { supabase } from '../../supabase';
import type { Reminder, ReminderType } from '../types';

function mapReminderRow(row: {
  id: string;
  tenant_id: string;
  store_id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_type: string;
  is_completed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): Reminder {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    title: row.title,
    description: row.description,
    reminderDate: row.reminder_date,
    reminderType: row.reminder_type as ReminderType,
    isCompleted: row.is_completed,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const reminders = {
  list: async (storeId: string, includeCompleted = false): Promise<Reminder[]> => {
    const { data, error } = await supabase.rpc('get_upcoming_reminders', {
      p_store_id: storeId,
      p_include_completed: includeCompleted,
    });
    if (error) throw error;
    if (!data) return [];
    if (Array.isArray(data)) return data.map(mapReminderRow);
    return [mapReminderRow(data)];
  },
  create: async (params: {
    tenantId: string;
    storeId: string;
    title: string;
    description?: string | null;
    reminderDate: string;
    reminderType: string;
    createdBy?: string | null;
  }): Promise<Reminder> => {
    const { data, error } = await supabase.rpc('create_reminder', {
      p_tenant_id: params.tenantId,
      p_store_id: params.storeId,
      p_title: params.title,
      p_description: params.description ?? '',
      p_reminder_date: params.reminderDate,
      p_reminder_type: params.reminderType,
      p_created_by: params.createdBy ?? undefined,
    });
    if (error) throw error;
    return mapReminderRow(data);
  },
  update: async (params: {
    reminderId: string;
    title?: string;
    description?: string | null;
    reminderDate?: string;
    reminderType?: string;
    isCompleted?: boolean;
  }): Promise<Reminder> => {
    const { data, error } = await supabase.rpc('update_reminder', {
      p_reminder_id: params.reminderId,
      p_title: params.title ?? undefined,
      p_description: params.description ?? undefined,
      p_reminder_date: params.reminderDate ?? undefined,
      p_reminder_type: params.reminderType ?? undefined,
      p_is_completed: params.isCompleted ?? undefined,
    });
    if (error) throw error;
    return mapReminderRow(data);
  },
  remove: async (reminderId: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_reminder', {
      p_reminder_id: reminderId,
    });
    if (error) throw error;
  },
};