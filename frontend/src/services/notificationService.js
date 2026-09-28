import { supabase } from './supabase';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function listUserNotifications(userId) {
  const client = requireClient();
  const { data, error } = await client
    .from('user_notifications')
    .select('id, type, title, message, action_path, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(userId, notificationId) {
  const client = requireClient();
  const { data, error } = await client
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id, read_at')
    .single();
  if (error) throw error;
  return data;
}
