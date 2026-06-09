import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const serviceRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(storeId, id) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(storeId, data) {
    const { data: service, error } = await supabase
      .from('services')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'service_created', 'service', service.id, service.name)
    return service
  },

  async update(storeId, id, data) {
    const { data: service, error } = await supabase
      .from('services')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'service_updated', 'service', id, service.name)
    return service
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'service_deleted', 'service', id)
  },
}
