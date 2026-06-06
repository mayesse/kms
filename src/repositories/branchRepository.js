import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const branchRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(storeId, id) {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(storeId, data) {
    const { data: branch, error } = await supabase
      .from('branches')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'branch_created', 'branch', branch.id, branch.name)
    return branch
  },

  async update(storeId, id, data) {
    const { data: branch, error } = await supabase
      .from('branches')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return branch
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'branch_deleted', 'branch', id)
  },

  async getBranchInventory(storeId, branchId) {
    const { data, error } = await supabase
      .from('branch_inventory')
      .select('*, products(id, name, selling_price, quantity)')
      .eq('store_id', storeId)
      .eq('branch_id', branchId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getInventorySummary(storeId) {
    const { data, error } = await supabase
      .from('branch_inventory')
      .select('branch_id, quantity, products(name, selling_price)')
      .eq('store_id', storeId)
    if (error) throw error
    return data || []
  },
}
