import { supabase } from '../lib/supabase'

export const customerRepository = {
  async getAll(storeId, search = '') {
    let query = supabase.from('customers').select('*').eq('store_id', storeId).order('name')
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async create(storeId, d) {
    const { data, error } = await supabase.from('customers').insert({ ...d, store_id: storeId }).select().single()
    if (error) throw error
    return data
  },

  async update(storeId, id, d) {
    const { data, error } = await supabase.from('customers').update(d).eq('id', id).eq('store_id', storeId).select().single()
    if (error) throw error
    return data
  },

  async delete(storeId, id) {
    const { error } = await supabase.from('customers').delete().eq('id', id).eq('store_id', storeId)
    if (error) throw error
  },

  async getSalesHistory(storeId, customerId) {
    const { data, error } = await supabase.from('sales').select('*, sale_items(*)').eq('store_id', storeId).eq('customer_id', customerId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
}
