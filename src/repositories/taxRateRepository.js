import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const taxRateRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async getDefault(storeId) {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_default', true)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async create(storeId, data) {
    const { data: rate, error } = await supabase
      .from('tax_rates')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'tax_rate_created', 'tax_rate', rate.id, rate.name)
    return rate
  },

  async update(storeId, id, data) {
    const { data: rate, error } = await supabase
      .from('tax_rates')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'tax_rate_updated', 'tax_rate', id, rate.name)
    return rate
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('tax_rates')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'tax_rate_deleted', 'tax_rate', id)
  },
}
