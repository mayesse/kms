import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

function nextJobNumber(existingCount) {
  const n = (existingCount || 0) + 1
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `RJ-${date}-${String(n).padStart(3, '0')}`
}

export const repairJobRepository = {
  async getAll(storeId, statusFilter) {
    let query = supabase
      .from('repair_jobs')
      .select('*, repair_job_items(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(storeId, id) {
    const { data, error } = await supabase
      .from('repair_jobs')
      .select('*, repair_job_items(*)')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(storeId, job) {
    const { count, error: countError } = await supabase
      .from('repair_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    if (countError) throw countError

    const job_number = nextJobNumber(count)

    const { data, error } = await supabase
      .from('repair_jobs')
      .insert({
        store_id: storeId,
        job_number,
        customer_name: job.customer_name,
        customer_phone: job.customer_phone || null,
        device_type: job.device_type || null,
        device_model: job.device_model || null,
        issue_description: job.issue_description || null,
        staff_id: job.staff_id || null,
        notes: job.notes || null,
        status: 'received',
      })
      .select()
      .single()

    if (error) throw error
    await activityLogRepository.log(storeId, 'repair_job_created', 'repair_job', data.id, job_number)
    return data
  },

  async addItem(storeId, jobId, item) {
    const { data, error } = await supabase
      .from('repair_job_items')
      .insert({
        job_id: jobId,
        store_id: storeId,
        item_type: item.item_type,
        product_id: item.product_id || null,
        service_id: item.service_id || null,
        name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeItem(storeId, itemId) {
    const { error } = await supabase
      .from('repair_job_items')
      .delete()
      .eq('id', itemId)
      .eq('store_id', storeId)
    if (error) throw error
  },

  async updateStatus(storeId, id, status) {
    const { data, error } = await supabase
      .from('repair_jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    await activityLogRepository.log(storeId, 'repair_job_status', 'repair_job', id, status)
    return data
  },

  async linkSale(storeId, id, saleId) {
    const { data, error } = await supabase
      .from('repair_jobs')
      .update({
        sale_id: saleId,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    await activityLogRepository.log(storeId, 'repair_job_completed', 'repair_job', id, data.job_number)
    return data
  },
}
