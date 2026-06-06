import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const commissionRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('commissions')
      .select('*, staff(name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByStaff(storeId, staffId) {
    const { data, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('store_id', storeId)
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(storeId, data) {
    const { data: commission, error } = await supabase
      .from('commissions')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return commission
  },

  async calculateStaffCommission(storeId, staffId, saleTotal) {
    const { data: rules, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('store_id', storeId)
      .eq('staff_id', staffId)
      .eq('is_active', true)
    if (error) throw error
    if (!rules || rules.length === 0) return 0
    const rate = rules[0].commission_rate || 0
    return (saleTotal * rate) / 100
  },

  async update(storeId, id, data) {
    const { data: commission, error } = await supabase
      .from('commissions')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'commission_updated', 'commission', id)
    return commission
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('commissions')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'commission_deleted', 'commission', id)
  },
}
