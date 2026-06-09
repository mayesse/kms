import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const tourismRepository = {
  // === PACKAGES ===
  async getPackages(storeId, type) {
    let query = supabase
      .from('travel_packages')
      .select('*, travel_package_tiers(*)')
      .eq('store_id', storeId)
      .eq('status', 'active')
    if (type) query = query.eq('type', type)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getPackageById(storeId, id) {
    const { data, error } = await supabase
      .from('travel_packages')
      .select('*, travel_package_tiers(*, travel_package_prices(*))')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createPackage(storeId, pkg) {
    const { data, error } = await supabase
      .from('travel_packages')
      .insert({ ...pkg, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'travel_package_created', 'travel_package', data.id, data.name)
    return data
  },

  async updatePackage(storeId, id, pkg) {
    const { data, error } = await supabase
      .from('travel_packages')
      .update({ ...pkg, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addPackageTier(storeId, tier) {
    const { data, error } = await supabase
      .from('travel_package_tiers')
      .insert(tier)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addTierPrice(storeId, price) {
    const { data, error } = await supabase
      .from('travel_package_prices')
      .insert(price)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === DOSSIERS ===
  async getDossiers(storeId, filters = {}) {
    let query = supabase
      .from('travel_dossiers')
      .select('*, travel_packages(name, type)')
      .eq('store_id', storeId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.type) query = query.eq('type', filters.type)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getDossierById(storeId, id) {
    const { data, error } = await supabase
      .from('travel_dossiers')
      .select('*, travel_packages(*, travel_package_tiers(*)), travel_clients(*, travel_visa_tracking(*)), travel_bookings(*), travel_payments(*)')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createDossier(storeId, dossier) {
    const { data, error } = await supabase
      .from('travel_dossiers')
      .insert({ ...dossier, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'travel_dossier_created', 'travel_dossier', data.id, data.name)
    return data
  },

  async updateDossier(storeId, id, dossier) {
    const { data, error } = await supabase
      .from('travel_dossiers')
      .update({ ...dossier, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteDossier(storeId, id) {
    const { error } = await supabase
      .from('travel_dossiers')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
  },

  // === CLIENTS ===
  async getClients(storeId, dossierId) {
    let query = supabase
      .from('travel_clients')
      .select('*, travel_visa_tracking(*)')
      .eq('store_id', storeId)
    if (dossierId) query = query.eq('dossier_id', dossierId)
    const { data, error } = await query.order('name')
    if (error) throw error
    return data || []
  },

  async addClient(storeId, client) {
    const { data, error } = await supabase
      .from('travel_clients')
      .insert({ ...client, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'travel_client_added', 'travel_client', data.id, data.name)
    return data
  },

  async updateClient(storeId, id, client) {
    const { data, error } = await supabase
      .from('travel_clients')
      .update({ ...client, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteClient(storeId, id) {
    const { error } = await supabase
      .from('travel_clients')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)
    if (error) throw error
  },

  // === VISA ===
  async updateVisaStatus(storeId, id, status) {
    const { data, error } = await supabase
      .from('travel_visa_tracking')
      .update({ status, decision_date: status === 'approved' || status === 'rejected' ? new Date().toISOString().slice(0, 10) : undefined, collected_date: status === 'collected' ? new Date().toISOString().slice(0, 10) : undefined })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === PAYMENTS ===
  async getPayments(storeId, dossierId) {
    let query = supabase
      .from('travel_payments')
      .select('*, travel_clients(name)')
      .eq('store_id', storeId)
    if (dossierId) query = query.eq('dossier_id', dossierId)
    const { data, error } = await query.order('due_date')
    if (error) throw error
    return data || []
  },

  async addPayment(storeId, payment) {
    const paymentData = { ...payment, store_id: storeId }
    if (paymentData.paid_date) paymentData.status = 'paid'
    const { data, error } = await supabase
      .from('travel_payments')
      .insert(paymentData)
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'travel_payment_recorded', 'travel_payment', data.id, `${data.amount}`)
    return data
  },

  // === BOOKINGS ===
  async getBookings(storeId, dossierId) {
    let query = supabase
      .from('travel_bookings')
      .select('*')
      .eq('store_id', storeId)
    if (dossierId) query = query.eq('dossier_id', dossierId)
    const { data, error } = await query.order('booking_date')
    if (error) throw error
    return data || []
  },

  async addBooking(storeId, booking) {
    const { data, error } = await supabase
      .from('travel_bookings')
      .insert({ ...booking, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === SUPPLIERS ===
  async getSuppliers(storeId, type) {
    let query = supabase
      .from('travel_suppliers')
      .select('*')
      .eq('store_id', storeId)
    if (type) query = query.eq('type', type)
    const { data, error } = await query.order('name')
    if (error) throw error
    return data || []
  },

  async addSupplier(storeId, supplier) {
    const { data, error } = await supabase
      .from('travel_suppliers')
      .insert({ ...supplier, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    await activityLogRepository.log(storeId, 'travel_supplier_created', 'travel_supplier', data.id, data.name)
    return data
  },

  async updateSupplier(storeId, id, supplier) {
    const { data, error } = await supabase
      .from('travel_suppliers')
      .update(supplier)
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // === REPORTS ===
  async getDashboardStats(storeId) {
    const now = new Date().toISOString()
    const [dossiersRes, paymentsRes, packagesRes] = await Promise.all([
      supabase.from('travel_dossiers').select('id, status, created_at').eq('store_id', storeId),
      supabase.from('travel_payments').select('amount, status').eq('store_id', storeId),
      supabase.from('travel_packages').select('id, type, status').eq('store_id', storeId),
    ])
    const dossiers = dossiersRes.data || []
    const payments = paymentsRes.data || []
    const packages = packagesRes.data || []
    return {
      total_dossiers: dossiers.length,
      active_dossiers: dossiers.filter(d => d.status === 'confirmed' || d.status === 'pending').length,
      total_packages: packages.filter(p => p.status === 'active').length,
      total_revenue: payments.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      pending_payments: payments.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      dossiers_by_status: dossiers.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc }, {}),
    }
  },
}
