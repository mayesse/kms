import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const priceTierRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('price_tiers')
      .select('*')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async getByProduct(storeId, productId) {
    const { data, error } = await supabase
      .from('price_tiers')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .order('min_qty')
    if (error) throw error
    return data || []
  },

  async getAllForStore(storeId) {
    const { data, error } = await supabase
      .from('price_tiers')
      .select('*')
      .eq('store_id', storeId)
      .order('product_id')
      .order('min_qty')
    if (error) throw error
    return data || []
  },

  async upsert(storeId, productId, tiers) {
    // Delete existing then re-insert
    const { error: delErr } = await supabase
      .from('price_tiers')
      .delete()
      .eq('store_id', storeId)
      .eq('product_id', productId)
    if (delErr) throw delErr

    if (tiers.length === 0) return []

    const toInsert = tiers.map(t => ({
      store_id: storeId,
      product_id: productId,
      name: t.name || null,
      min_qty: t.min_qty,
      unit_price: t.unit_price,
    }))
    const { data, error } = await supabase
      .from('price_tiers')
      .insert(toInsert)
      .select()
    if (error) throw error
    await activityLogRepository.log(storeId, 'price_tiers_updated', 'product', productId)
    return data || []
  },
}
