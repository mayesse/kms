import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const staffRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(storeId, id) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getByPin(storeId, pin) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('store_id', storeId)
      .eq('pin', pin)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  async create(storeId, data) {
    const { data: staff, error } = await supabase
      .from('staff')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'staff_created', 'staff', staff.id, staff.name)
    return staff
  },

  async update(storeId, id, data) {
    const { data: staff, error } = await supabase
      .from('staff')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'staff_updated', 'staff', id, staff.name)
    return staff
  },

  async toggleActive(storeId, id, isActive) {
    return this.update(storeId, id, { is_active: isActive })
  },
}
