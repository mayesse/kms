import { supabase } from '../../../lib/supabase'

export const serviceBookingRepository = {
  async getBookings(storeId, dateFrom, dateTo) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, customers(name, phone), staff(name)')
      .eq('store_id', storeId)
      .gte('start_time', dateFrom)
      .lte('start_time', dateTo)
      .order('start_time', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getStaffAvailability(storeId, staffId, date) {
    const { data, error } = await supabase
      .from('staff_schedule')
      .select('slots')
      .eq('store_id', storeId)
      .eq('staff_id', staffId)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data?.slots || []
  },

  async createBooking(storeId, bookingData) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({ ...bookingData, store_id: storeId })
      .select('*, customers(name, phone), staff(name)')
      .single()
    if (error) throw error
    return data
  },

  async updateBookingStatus(storeId, bookingId, status) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getServiceStats(storeId, dateFrom) {
    const { data, error } = await supabase
      .from('appointments')
      .select('status, staff_id, staff(name)')
      .eq('store_id', storeId)
      .gte('start_time', dateFrom)
    if (error) throw error

    const stats = { total: 0, completed: 0, cancelled: 0, noShow: 0, byStaff: {} }
    ;(data || []).forEach(apt => {
      stats.total++
      if (apt.status === 'completed') stats.completed++
      else if (apt.status === 'cancelled') stats.cancelled++
      else if (apt.status === 'no_show') stats.noShow++
      if (apt.staff?.name) {
        stats.byStaff[apt.staff.name] = (stats.byStaff[apt.staff.name] || 0) + 1
      }
    })
    return stats
  },
}

export default serviceBookingRepository
