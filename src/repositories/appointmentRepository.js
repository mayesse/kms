import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const appointmentRepository = {
  async getAll(storeId, dateFrom, dateTo) {
    let query = supabase
      .from('appointments')
      .select('*, services(name, price, duration_minutes), staff(name)')
      .eq('store_id', storeId)
    if (dateFrom) query = query.gte('appointment_date', dateFrom)
    if (dateTo) query = query.lte('appointment_date', dateTo)
    const { data, error } = await query.order('appointment_date')
    if (error) throw error
    return data || []
  },

  async getByDate(storeId, date) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, services(name, price, duration_minutes), staff(name)')
      .eq('store_id', storeId)
      .eq('appointment_date', date)
      .order('start_time')
    if (error) throw error
    return data || []
  },

  async create(storeId, data) {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({ ...data, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'appointment_created', 'appointment', appointment.id, appointment.customer_name)
    return appointment
  },

  async update(storeId, id, data) {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'appointment_updated', 'appointment', id, appointment.customer_name)
    return appointment
  },

  async setStatus(storeId, id, status) {
    return this.update(storeId, id, { status })
  },

  async delete(storeId, id) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
    await activityLogRepository.log(storeId, 'appointment_deleted', 'appointment', id)
  },
}
