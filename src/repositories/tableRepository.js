import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const tableRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async create(storeId, data) {
    const { data: table, error } = await supabase
      .from('tables')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'table_created', 'table', table.id, table.name)
    return table
  },

  async update(storeId, id, data) {
    const { data: table, error } = await supabase
      .from('tables')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'table_updated', 'table', id, table.name)
    return table
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'table_deleted', 'table', id)
  },

  async setOccupied(storeId, id, occupied) {
    const payload = { status: occupied ? 'occupied' : 'free' }
    if (occupied) payload.occupied_at = new Date().toISOString()
    else payload.occupied_at = null
    return this.update(storeId, id, payload)
  },

  async getAvailable(storeId) {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .in('status', ['free', 'reserved'])
      .order('name')
    if (error) throw error
    return data || []
  },

  async merge(storeId, sourceId, targetId) {
    const groupId = sourceId
    await supabase.from('tables').update({ merged_with: groupId }).eq('id', sourceId).eq('store_id', storeId)
    await supabase.from('tables').update({ merged_with: groupId }).eq('id', targetId).eq('store_id', storeId)
    await activityLogRepository.log(storeId, 'tables_merged', 'table', groupId, `Merged ${sourceId} + ${targetId}`)
  },

  async unmerge(storeId, tableId) {
    await supabase.from('tables').update({ merged_with: null }).eq('store_id', storeId).eq('merged_with', tableId)
    await supabase.from('tables').update({ merged_with: null }).eq('id', tableId).eq('store_id', storeId)
    await activityLogRepository.log(storeId, 'tables_unmerged', 'table', tableId)
  },
}
