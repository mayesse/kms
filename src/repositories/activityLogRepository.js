import { supabase } from '../lib/supabase'

export const activityLogRepository = {
  async log(storeId, actionType, entityType, entityId, entityName, details, amount) {
    const { error } = await supabase
      .from('activity_log')
      .insert({
        store_id: storeId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details,
        amount,
      })
    if (error) console.error('Activity log error:', error)
  },

  async getAll(storeId, filters = {}) {
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (filters.from) query = query.gte('created_at', filters.from)
    if (filters.to) query = query.lte('created_at', filters.to)
    if (filters.actionType) query = query.eq('action_type', filters.actionType)
    if (filters.search) query = query.ilike('entity_name', `%${filters.search}%`)

    const { data, error } = await query.limit(200)
    if (error) throw error
    return data || []
  },
}
