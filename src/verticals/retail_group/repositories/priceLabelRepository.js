import { supabase } from '../../../lib/supabase'

export const priceLabelRepository = {
  async getLabelData(storeId, productIds) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, barcode, selling_price, purchase_price, categories(name, color)')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .in('id', productIds)
    if (error) throw error
    return data || []
  },

  async updatePrice(storeId, productId, newPrice) {
    const { data, error } = await supabase
      .from('products')
      .update({ selling_price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('store_id', storeId)
      .select('id, name, selling_price')
      .single()
    if (error) throw error
    return data
  },

  async bulkUpdatePrices(storeId, updates) {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('products')
      .upsert(
        updates.map(u => ({
          id: u.productId,
          store_id: storeId,
          selling_price: u.price,
          updated_at: now,
        })),
        { onConflict: 'id' }
      )
      .select('id, name, selling_price')
    if (error) throw error
    return data || []
  },
}

export default priceLabelRepository
