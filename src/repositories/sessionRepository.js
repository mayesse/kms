import { supabase } from '../lib/supabase'

export const sessionRepository = {
  async getOrCreateToday(storeId, deviceId) {
    const today = new Date().toISOString().slice(0, 10)

    // Try to find existing session
    const { data: existing } = await supabase
      .from('sessions')
      .select('*')
      .eq('store_id', storeId)
      .eq('session_date', today)
      .eq('status', 'open')
      .maybeSingle()

    if (existing) return existing

    // Create new session
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        store_id: storeId,
        session_date: today,
        device_id: deviceId,
        opening_cash: 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async close(storeId, sessionId, countedCash, note) {
    // Get expected cash from sales
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    const today = session?.session_date
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, payment_method')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .eq('payment_method', 'cash')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    const expectedCash = (session?.opening_cash || 0) +
      (sales || []).reduce((s, sale) => s + parseFloat(sale.total_amount), 0)

    const discrepancy = countedCash - expectedCash

    const { data, error } = await supabase
      .from('sessions')
      .update({
        status: 'closed',
        closing_cash_expected: expectedCash,
        closing_cash_counted: countedCash,
        cash_discrepancy: discrepancy,
        discrepancy_note: note,
        closed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getActive(storeId) {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('store_id', storeId)
      .eq('session_date', today)
      .eq('status', 'open')
      .maybeSingle()

    if (error) throw error
    return data
  },

  async getAll(storeId) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('store_id', storeId)
      .order('session_date', { ascending: false })
      .limit(30)

    if (error) throw error
    return data || []
  },
}
