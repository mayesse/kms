import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const batchRepository = {
  async getAll(storeId, productId) {
    let query = supabase
      .from('batches')
      .select('*, products(name)')
      .eq('store_id', storeId)
    if (productId) query = query.eq('product_id', productId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  /** First-expiry-first-out batches with stock for a product */
  async getFefoForProduct(storeId, productId) {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  /** Batch FEFO query for multiple products at once (single SELECT with IN) */
  async getFefoForProducts(storeId, productIds) {
    if (!productIds?.length) return {}
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('store_id', storeId)
      .in('product_id', productIds)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    const map = {}
    for (const batch of (data || [])) {
      if (!map[batch.product_id]) map[batch.product_id] = []
      map[batch.product_id].push(batch)
    }
    return map
  },

  async getExpiring(storeId, withinDays = 30) {
    const today = new Date().toISOString().slice(0, 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + withinDays)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('batches')
      .select('*, products(name)')
      .eq('store_id', storeId)
      .gte('expiry_date', today)
      .lte('expiry_date', cutoffStr)
      .gt('quantity', 0)
      .order('expiry_date')
    if (error) throw error
    return data || []
  },

  async getExpired(storeId) {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('batches')
      .select('*, products(name)')
      .eq('store_id', storeId)
      .lt('expiry_date', today)
      .gt('quantity', 0)
      .order('expiry_date')
    if (error) throw error
    return data || []
  },

  async getExpiryAlertSummary(storeId, withinDays = 30) {
    const [expired, expiring] = await Promise.all([
      this.getExpired(storeId),
      this.getExpiring(storeId, withinDays),
    ])
    return {
      expiredCount: expired.length,
      expiringCount: expiring.length,
      expired,
      expiring,
      total: expired.length + expiring.length,
    }
  },

  async create(storeId, data) {
    const { data: batch, error } = await supabase
      .from('batches')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'batch_created', 'batch', batch.id, batch.lot_number)
    return batch
  },

  async updateQty(storeId, id, delta) {
    const { data: batch } = await supabase
      .from('batches')
      .select('quantity')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()
    const newQty = (batch?.quantity || 0) + delta
    const { data, error } = await supabase
      .from('batches')
      .update({ quantity: Math.max(0, newQty), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
