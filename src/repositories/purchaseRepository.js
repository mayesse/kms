import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'

export const purchaseRepository = {
  async create(storeId, supplierId, items, note, amountPaid = 0, discount = { type: 'dzd', value: 0 }) {
    const subtotalAmount = items.reduce((sum, i) => sum + i.quantity * i.purchase_price, 0)
    const discountRaw = parseFloat(discount?.value || 0)
    const discountAmount = discount?.type === 'percent'
      ? Math.min(subtotalAmount, subtotalAmount * (discountRaw / 100))
      : Math.min(subtotalAmount, discountRaw)
    const totalAmount = Math.max(0, subtotalAmount - discountAmount)

    // 1. Insert purchase
    const insertData = {
      store_id: storeId,
      supplier_id: supplierId,
      total_amount: totalAmount,
      note: [note, discountAmount > 0 ? `discount:${discountAmount.toFixed(2)} (${discount?.type === 'percent' ? `${discountRaw}%` : 'DZD'})` : null]
        .filter(Boolean)
        .join(' | '),
    }
    // amount_paid column — will be ignored if it doesn't exist yet
    if (amountPaid > 0) insertData.amount_paid = amountPaid

    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // 2. Insert purchase items
    const purchaseItems = items.map(i => ({
      purchase_id: purchase.id,
      product_id: i.product_id,
      quantity: i.quantity,
      purchase_price: i.purchase_price,
    }))

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems)

    if (itemsError) throw itemsError

    // 3. Update product stock — direct read + write (no RPC needed)
    for (const item of items) {
      const convRate = item.conversion_rate || 1
      const qtyToAdd = item.quantity * convRate
      const basePurchasePrice = item.purchase_price / convRate

      const { data: prod } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', item.product_id)
        .eq('store_id', storeId)
        .single()

      await supabase
        .from('products')
        .update({
          quantity: (prod?.quantity || 0) + qtyToAdd,
          purchase_price: basePurchasePrice,
          ...(item.selling_price > 0 ? { selling_price: item.selling_price } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.product_id)
        .eq('store_id', storeId)
    }

    // 4. Activity log
    await activityLogRepository.log(storeId, 'purchase_created', 'purchase',
      purchase.id, `شراء #${purchase.id.slice(0, 8)}`,
      { supplier_id: supplierId, items_count: items.length, subtotal: subtotalAmount, discount_amount: discountAmount }, totalAmount)

    return purchase
  },

  // Record a payment against a purchase
  async recordPayment(storeId, purchaseId, paymentAmount) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('amount_paid, total_amount, id')
      .eq('id', purchaseId)
      .eq('store_id', storeId)
      .single()

    const currentPaid = parseFloat(purchase?.amount_paid || 0)
    const newPaid = Math.min(currentPaid + paymentAmount, parseFloat(purchase?.total_amount || 0))

    const { data, error } = await supabase
      .from('purchases')
      .update({ amount_paid: newPaid })
      .eq('id', purchaseId)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    await activityLogRepository.log(storeId, 'purchase_payment', 'purchase',
      purchaseId, `دفع #${purchaseId.slice(0, 8)}`,
      { payment: paymentAmount, total_paid: newPaid }, paymentAmount)

    return data
  },

  // Mark purchase as fully paid
  async markFullyPaid(storeId, purchaseId) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('total_amount')
      .eq('id', purchaseId)
      .eq('store_id', storeId)
      .single()

    const { data, error } = await supabase
      .from('purchases')
      .update({ amount_paid: purchase?.total_amount })
      .eq('id', purchaseId)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAll(storeId, filters = {}) {
    let query = supabase
      .from('purchases')
      .select('*, suppliers(name, phone)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (filters.supplierId) {
      query = query.eq('supplier_id', filters.supplierId)
    }

    const { data, error } = await query
    if (error) throw error

    let results = data || []

    // Client-side payment status filter
    if (filters.paymentStatus === 'unpaid') {
      results = results.filter(p => (parseFloat(p.amount_paid || 0)) === 0)
    } else if (filters.paymentStatus === 'partial') {
      results = results.filter(p => {
        const paid = parseFloat(p.amount_paid || 0)
        return paid > 0 && paid < parseFloat(p.total_amount)
      })
    } else if (filters.paymentStatus === 'paid') {
      results = results.filter(p => parseFloat(p.amount_paid || 0) >= parseFloat(p.total_amount))
    }

    return results
  },

  // Get supplier debt summary
  async getSupplierDebts(storeId) {
    const { data, error } = await supabase
      .from('purchases')
      .select('supplier_id, total_amount, amount_paid, suppliers(name, phone)')
      .eq('store_id', storeId)

    if (error) throw error

    // Aggregate by supplier
    const suppliers = {}
    for (const p of data || []) {
      const sid = p.supplier_id
      if (!sid) continue
      if (!suppliers[sid]) {
        suppliers[sid] = {
          id: sid,
          name: p.suppliers?.name || 'غير محدد',
          phone: p.suppliers?.phone || '',
          total_purchases: 0,
          total_paid: 0,
          total_debt: 0,
          purchase_count: 0,
        }
      }
      const total = parseFloat(p.total_amount || 0)
      const paid = parseFloat(p.amount_paid || 0)
      suppliers[sid].total_purchases += total
      suppliers[sid].total_paid += paid
      suppliers[sid].total_debt += (total - paid)
      suppliers[sid].purchase_count++
    }

    return Object.values(suppliers).sort((a, b) => b.total_debt - a.total_debt)
  },

  async getBySupplier(storeId, supplierId) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, purchase_items(*, products(name))')
      .eq('store_id', storeId)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getDetail(storeId, purchaseId) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name, phone, address), purchase_items(*, products(name))')
      .eq('store_id', storeId)
      .eq('id', purchaseId)
      .single()

    if (error) throw error
    return data
  },
}
