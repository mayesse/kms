import { supabase } from '../../../lib/supabase'

export const drugRepository = {
  async searchBySubstance(storeId, substance) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, barcode, selling_price, quantity, min_stock_threshold, categories(name)')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .or(`name.ilike.%${substance}%,notes.ilike.%${substance}%`)
      .limit(20)
    if (error) throw error
    return data || []
  },

  async getExpiryReport(storeId, daysAhead = 90) {
    const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString()
    const { data, error } = await supabase
      .from('batches')
      .select('*, products!inner(name, categories(name))')
      .eq('store_id', storeId)
      .lte('expiry_date', cutoff)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getDrugStats(storeId) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, quantity, selling_price, purchase_price, min_stock_threshold')
      .eq('store_id', storeId)
      .eq('is_active', true)
    if (error) throw error

    const totalProducts = (data || []).length
    const lowStock = (data || []).filter(p => p.quantity <= p.min_stock_threshold)
    const stockValue = (data || []).reduce((sum, p) =>
      sum + Math.max(0, p.quantity) * parseFloat(p.purchase_price || 0), 0)

    return { totalProducts, lowStockCount: lowStock.length, stockValue }
  },
}

export default drugRepository
