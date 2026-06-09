import { supabase } from '../../../lib/supabase'

export const orderRepository = {
  async getKitchenOrders(storeId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*), tables(name)')
      .eq('store_id', storeId)
      .in('order_type', ['dine_in', 'takeaway', 'delivery'])
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 86400000 * 2).toISOString())
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getOrdersByTable(storeId, tableId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('store_id', storeId)
      .eq('table_id', tableId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async updateKitchenStatus(storeId, saleId, status) {
    const { data, error } = await supabase
      .from('sales')
      .update({ kitchen_status: status, updated_at: new Date().toISOString() })
      .eq('id', saleId)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getOrderTypeTotals(storeId, dateFrom) {
    const { data, error } = await supabase
      .from('sales')
      .select('order_type, total')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', dateFrom)
    if (error) throw error
    const totals = { dine_in: 0, takeaway: 0, delivery: 0 }
    ;(data || []).forEach(sale => {
      const type = sale.order_type || 'dine_in'
      totals[type] = (totals[type] || 0) + parseFloat(sale.total || 0)
    })
    return totals
  },
}

export default orderRepository
