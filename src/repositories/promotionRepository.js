import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const promotionRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getActive(storeId) {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
    if (error) throw error
    return (data || []).filter(p => {
      if (p.start_date && p.start_date > today) return false
      if (p.end_date && p.end_date < today) return false
      return true
    })
  },

  async create(storeId, payload) {
    const { data, error } = await supabase
      .from('promotions')
      .insert({ ...payload, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'promotion_created', 'promotion', data.id, data.name)
    return data
  },

  async update(storeId, id, payload) {
    const { data, error } = await supabase
      .from('promotions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'promotion_deleted', 'promotion', id)
  },
}
