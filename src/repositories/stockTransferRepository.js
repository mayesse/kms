import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const stockTransferRepository = {
  async getAll(storeId) {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select('*, stock_transfer_items(*, products(name))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getById(storeId, id) {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select('*, stock_transfer_items(*, products(name))')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(storeId, { from_branch_id, to_branch_id, note, items }) {
    const { data: transfer, error } = await supabase
      .from('stock_transfers')
      .insert({
        store_id: storeId,
        from_branch_id,
        to_branch_id,
        note,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error

    if (items && items.length > 0) {
      const transferItems = items.map(item => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity: item.quantity,
      }))
      const { error: itemErr } = await supabase
        .from('stock_transfer_items')
        .insert(transferItems)
      if (itemErr) throw itemErr
    }

    await activityLogRepository.log(storeId, 'stock_transfer_created', 'stock_transfer', transfer.id)
    return transfer
  },

  async advanceStatus(storeId, id, status) {
    const { data, error } = await supabase.rpc('advance_stock_transfer', {
      p_store_id: storeId,
      p_transfer_id: id,
      p_new_status: status,
    })
    if (error) throw error
    await activityLogRepository.log(storeId, 'stock_transfer_status', 'stock_transfer', id, status)
    return data
  },
}
