import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const commissionRuleRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('commission_rules')
      .select('*, staff(name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(storeId, data) {
    const { data: rule, error } = await supabase
      .from('commission_rules')
      .insert({ ...data, store_id: storeId })
      .select('*, staff(name)')
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'commission_rule_created', 'commission_rule', rule.id)
    return rule
  },

  async update(storeId, id, data) {
    const { data: rule, error } = await supabase
      .from('commission_rules')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select('*, staff(name)')
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'commission_rule_updated', 'commission_rule', id)
    return rule
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('commission_rules')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'commission_rule_deleted', 'commission_rule', id)
  },
}
