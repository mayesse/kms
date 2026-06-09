import { supabase } from '../lib/supabase'

export const categoryRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase.from('categories').select('*').eq('store_id', storeId).order('name')
    if (error) throw error
    return data || []
  },
  async create(storeId, d) {
    const { data, error } = await supabase.from('categories').insert({ ...d, store_id: storeId }).select().single()
    if (error) throw error
    return data
  },
  async update(storeId, id, d) {
    const { data, error } = await supabase.from('categories').update(d).eq('id', id).eq('store_id', storeId).select().single()
    if (error) throw error
    return data
  },
  async delete(storeId, id) {
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('store_id', storeId)
    if (error) throw error
  },
}
