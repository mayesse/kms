import { supabase } from '../lib/supabase'
import { checkTrialLimit } from './trialRepository'

export const supplierRepository = {
  async getAll(storeId, search = '') {
    let query = supabase.from('suppliers').select('*').eq('store_id', storeId).order('name')
    if (search) query = query.ilike('name', `%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },
  async create(storeId, d) {
    await checkTrialLimit(storeId, 'suppliers')
    const { data, error } = await supabase.from('suppliers').insert({ ...d, store_id: storeId }).select().single()
    if (error) throw error
    return data
  },
  async update(storeId, id, d) {
    const { data, error } = await supabase.from('suppliers').update(d).eq('id', id).eq('store_id', storeId).select().single()
    if (error) throw error
    return data
  },
  async delete(storeId, id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('store_id', storeId)
    if (error) throw error
  },
}
