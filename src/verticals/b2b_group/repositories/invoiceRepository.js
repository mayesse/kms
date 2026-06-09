import { supabase } from '../../../lib/supabase'

export const invoiceRepository = {
  async getInvoiceData(storeId, saleId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*), customers(name, phone, address), store_profiles(name, address, phone, tax_id)')
      .eq('store_id', storeId)
      .eq('id', saleId)
      .single()
    if (error) throw error
    return data
  },

  async getRecentInvoices(storeId, limit = 20) {
    const { data, error } = await supabase
      .from('sales')
      .select('id, receipt_number, total, customer_name, created_at, payment_method')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  async generateInvoiceNumber(storeId) {
    const { data, error } = await supabase
      .from('sales')
      .select('receipt_number')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const lastNum = parseInt((data?.receipt_number || 'INV-0000').replace('INV-', ''), 10) || 0
    return `INV-${String(lastNum + 1).padStart(4, '0')}`
  },

  async updateInvoiceNumber(storeId, saleId, invoiceNumber) {
    const { error } = await supabase
      .from('sales')
      .update({ receipt_number: invoiceNumber, updated_at: new Date().toISOString() })
      .eq('id', saleId)
      .eq('store_id', storeId)
    if (error) throw error
  },
}

export default invoiceRepository
