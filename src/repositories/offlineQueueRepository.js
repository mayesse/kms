import { supabase } from '../lib/supabase'

/** Server-side backup queue (optional sync when online). */
export const offlineQueueRepository = {
  async enqueue(storeId, payload) {
    const { data, error } = await supabase
      .from('offline_sale_queue')
      .insert({ store_id: storeId, payload, status: 'pending' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getPending(storeId) {
    const { data, error } = await supabase
      .from('offline_sale_queue')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at')
    if (error) throw error
    return data || []
  },

  async markCompleted(storeId, id) {
    const { error } = await supabase
      .from('offline_sale_queue')
      .update({ status: 'completed', synced_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
  },

  async markFailed(storeId, id, message) {
    const { data: row } = await supabase
      .from('offline_sale_queue')
      .select('attempts')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()

    const { error } = await supabase
      .from('offline_sale_queue')
      .update({
        status: 'failed',
        last_error: message,
        attempts: (row?.attempts || 0) + 1,
      })
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
  },
}
