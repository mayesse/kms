import { supabase } from '../lib/supabase'

export const holdRepository = {
  async createHold(storeId, customerName, note, cartItems, total) {
    const { data, error } = await supabase
      .from('holds')
      .insert({
        store_id: storeId,
        customer_name: customerName,
        note,
        total_amount: total,
        items_snapshot: cartItems,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAll(storeId) {
    const { data, error } = await supabase
      .from('holds')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async markPaid(storeId, holdId) {
    const { error } = await supabase
      .from('holds')
      .update({ status: 'paid', resolved_at: new Date().toISOString() })
      .eq('id', holdId)
      .eq('store_id', storeId)

    if (error) throw error
  },

  async cancel(storeId, holdId) {
    const { error } = await supabase
      .from('holds')
      .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
      .eq('id', holdId)
      .eq('store_id', storeId)

    if (error) throw error
  },
}
