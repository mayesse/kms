import { supabase } from '../lib/supabase'

export const businessTypeChangeRequestRepository = {
  async getLatest(storeId) {
    const { data, error } = await supabase
      .from('business_type_change_requests')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getPendingForStore(storeId) {
    const { data, error } = await supabase
      .from('business_type_change_requests')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(storeId, { currentType, requestedType, note }) {
    const pending = await this.getPendingForStore(storeId)
    if (pending.length > 0) {
      throw new Error('PENDING_REQUEST_EXISTS')
    }

    const { data, error } = await supabase
      .from('business_type_change_requests')
      .insert({
        store_id: storeId,
        current_type: currentType,
        requested_type: requestedType,
        note: note?.trim() || null,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
