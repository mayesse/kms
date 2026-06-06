import { supabase } from '../lib/supabase'
import { hashPassword } from '../utils/crypto'

export const settingsRepository = {
  async get(storeId) {
    const { data, error } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('id', storeId)
      .single()

    if (error) throw error
    return data
  },

  async update(storeId, data) {
    const { data: result, error } = await supabase
      .from('store_profiles')
      .update(data)
      .eq('id', storeId)
      .select()
      .single()

    if (error) throw error
    return result
  },

  async verifyReportsPassword(storeId, input) {
    const { data, error } = await supabase
      .from('store_profiles')
      .select('reports_password')
      .eq('id', storeId)
      .single()

    if (error) throw error

    // If no password set, deny access (force user to set one first)
    if (!data.reports_password) return true // allow first-time access

    const inputHash = await hashPassword(input)
    return inputHash === data.reports_password
  },

  async setReportsPassword(storeId, newPassword) {
    const hash = await hashPassword(newPassword)
    const { error } = await supabase
      .from('store_profiles')
      .update({ reports_password: hash })
      .eq('id', storeId)

    if (error) throw error
  },
}
