import { supabase } from '../lib/supabase'
import { checkTrialLimit } from './trialRepository'

export const saleRepository = {
  _hasCreditTrackingColumns: null,

  async hasCreditTrackingColumns() {
    if (this._hasCreditTrackingColumns !== null) return this._hasCreditTrackingColumns

    const { error } = await supabase
      .from('sales')
      .select('id, was_credit, credit_paid_at')
      .limit(1)

    if (!error) {
      this._hasCreditTrackingColumns = true
      return true
    }

    const message = `${error.message || ''} ${error.details || ''}`
    if (message.includes('was_credit') || message.includes('credit_paid_at')) {
      this._hasCreditTrackingColumns = false
      return false
    }

    throw error
  },

  // Uses the atomic create_sale RPC function
  async createSale(storeId, sessionId, items, paymentMethod, customerName, customerPhone, customerId, note, discountAmount, verticalOptions = {}) {
    await checkTrialLimit(storeId, 'sales')
    const formattedItems = items.map(item => ({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      service_id: item.service_id || null,
      product_name: item.product_name,
      quantity: item.quantity || item.qty,
      unit_price: item.unit_price,
      purchase_price: item.purchase_price || 0,
      note: item.note || null,
      unit_name: item.unit_name || 'قطعة',
      conversion_rate: item.conversion_rate || 1,
      batch_id: item.batch_id || null,
    }))

    const { data, error } = await supabase.rpc('create_sale', {
      p_store_id: storeId,
      p_session_id: sessionId,
      p_payment_method: paymentMethod,
      p_items: formattedItems,
      p_customer_name: customerName || null,
      p_customer_id: customerId || null,
      p_note: note || null,
      p_discount_amount: discountAmount || 0,
      p_order_type: verticalOptions.orderType || 'counter',
      p_table_id: verticalOptions.tableId || null,
      p_delivery_fee: verticalOptions.deliveryFee || 0,
      p_service_charge: verticalOptions.serviceCharge || 0,
      p_staff_id: verticalOptions.staffId || null,
      p_branch_id: verticalOptions.branchId || null,
      p_tax_rate_id: verticalOptions.taxRateId || null,
      p_tax_amount: verticalOptions.taxAmount || 0,
      p_subtotal_ht: verticalOptions.subtotalHt ?? null,
    })

    if (error) throw error

    if (data?.sale_id) {
      try {
        const invoiceNum = await this.getNextInvoiceNumber(storeId)
        if (invoiceNum) {
          await this.setInvoiceNumber(storeId, data.sale_id, invoiceNum)
          data.invoice_number = invoiceNum
        }
      } catch {
        /* silent — invoice numbering is optional */
      }
    }

    return data
  },

  // Uses the atomic void_sale RPC function
  async voidSale(storeId, saleId, reason) {
    const { data, error } = await supabase.rpc('void_sale', {
      p_store_id: storeId,
      p_sale_id: saleId,
      p_reason: reason,
    })

    if (error) throw error
    return data
  },

  async getByDateRange(storeId, from, to, filters = {}) {
    let query = supabase
      .from('sales')
      .select('*, sale_items(*), tables(name)')
      .eq('store_id', storeId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })

    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.search) {
      query = query.or(`receipt_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`)
    }
    if (filters.tableId) {
      query = query.eq('table_id', filters.tableId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Get sales summary for a date range.
   * IMPORTANT: total_revenue, total_profit, sale_count, avg_basket only include
   * PAID sales (cash + ccp). Credit sales are excluded from these metrics and
   * reported separately as credit_total.
   */
  async getSummary(storeId, from, to, branchId = null) {
    let query = supabase
      .from('sales')
      .select('total_amount, payment_method, sale_items(profit)')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', from)
      .lte('created_at', to)

    if (branchId) query = query.eq('branch_id', branchId)

    const { data: sales, error } = await query

    if (error) throw error

    const allSales = sales || []

    // Only count actually-paid sales (cash, ccp) as revenue
    const paidSales = allSales.filter(s => s.payment_method !== 'credit')
    const creditSales = allSales.filter(s => s.payment_method === 'credit')

    const totalRevenue = paidSales.reduce((s, sale) => s + parseFloat(sale.total_amount), 0)
    const totalProfit = paidSales.reduce((s, sale) =>
      s + (sale.sale_items || []).reduce((si, item) => si + parseFloat(item.profit || 0), 0), 0)
    const saleCount = paidSales.length
    const avgBasket = saleCount > 0 ? totalRevenue / saleCount : 0

    // Payment breakdown (only paid)
    const cashTotal = paidSales.filter(s => s.payment_method === 'cash')
      .reduce((s, sale) => s + parseFloat(sale.total_amount), 0)
    const ccpTotal = paidSales.filter(s => s.payment_method === 'ccp')
      .reduce((s, sale) => s + parseFloat(sale.total_amount), 0)

    // Credit totals (reported separately, NOT included in revenue)
    const creditTotal = creditSales.reduce((s, sale) => s + parseFloat(sale.total_amount), 0)

    return {
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      sale_count: saleCount,
      avg_basket: avgBasket,
      cash_total: cashTotal,
      ccp_total: ccpTotal,
      credit_total: creditTotal,
      // Include total with credit for informational purposes
      total_with_credit: totalRevenue + creditTotal,
      credit_count: creditSales.length,
    }
  },

  async getSaleDetail(storeId, saleId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('store_id', storeId)
      .eq('id', saleId)
      .single()

    if (error) throw error
    return data
  },

  async getTopProducts(storeId, from, to, limit = 5, branchId = null) {
    let salesQuery = supabase
      .from('sales')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .neq('payment_method', 'credit')
      .gte('created_at', from)
      .lte('created_at', to)

    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId)

    const { data: sales, error } = await salesQuery

    if (error) throw error

    const saleIds = (sales || []).map(s => s.id)
    if (saleIds.length === 0) return []

    const { data: items, error: err2 } = await supabase
      .from('sale_items')
      .select('product_name, quantity, unit_price')
      .in('sale_id', saleIds)

    if (err2) throw err2

    // Aggregate by product name
    const agg = {}
    for (const item of items || []) {
      const key = item.product_name
      if (!agg[key]) agg[key] = { product_name: key, total_qty: 0, total_revenue: 0 }
      agg[key].total_qty += item.quantity
      agg[key].total_revenue += item.quantity * parseFloat(item.unit_price)
    }

    return Object.values(agg)
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, limit)
  },

  async getCategoryPerformance(storeId, from, to, branchId = null) {
    let salesQuery = supabase
      .from('sales')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .neq('payment_method', 'credit')
      .gte('created_at', from)
      .lte('created_at', to)

    if (branchId) salesQuery = salesQuery.eq('branch_id', branchId)

    const { data: sales, error } = await salesQuery

    if (error) throw error
    const saleIds = (sales || []).map(s => s.id)
    if (saleIds.length === 0) return []

    // Get sale items with product → category info
    const { data: items, error: err2 } = await supabase
      .from('sale_items')
      .select('quantity, unit_price, purchase_price, product_id')
      .in('sale_id', saleIds)

    if (err2) throw err2

    // Get products with categories
    const productIds = [...new Set((items || []).map(i => i.product_id).filter(Boolean))]
    if (productIds.length === 0) return []

    const { data: products } = await supabase
      .from('products')
      .select('id, category_id, categories(name, color)')
      .in('id', productIds)

    // Build product → category map
    const productCategoryMap = {}
    for (const p of products || []) {
      productCategoryMap[p.id] = {
        name: p.categories?.name || 'بدون فئة',
        color: p.categories?.color || '#6b7280',
      }
    }

    // Aggregate by category
    const cats = {}
    for (const item of items || []) {
      const cat = productCategoryMap[item.product_id] || { name: 'بدون فئة', color: '#6b7280' }
      const key = cat.name
      if (!cats[key]) {
        cats[key] = { name: key, color: cat.color, revenue: 0, profit: 0, qty: 0, items_count: 0 }
      }
      const revenue = item.quantity * parseFloat(item.unit_price)
      const cost = item.quantity * parseFloat(item.purchase_price || 0)
      cats[key].revenue += revenue
      cats[key].profit += (revenue - cost)
      cats[key].qty += item.quantity
      cats[key].items_count++
    }

    return Object.values(cats).sort((a, b) => b.revenue - a.revenue)
  },

  // ─── Debt Management ────────────────────────────────────────

  /**
   * Get all unpaid credit sales, grouped by customer.
   * Returns an array of { customer_name, customer_id, sales: [...], total, oldest_date }
   */
  async getDebtsByCustomer(storeId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('store_id', storeId)
      .eq('payment_method', 'credit')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error

    const sales = data || []

    // Group by customer_name (fallback to customer_id or 'unknown')
    const grouped = {}
    for (const sale of sales) {
      const key = sale.customer_id || sale.customer_name || '__unknown__'
      if (!grouped[key]) {
        grouped[key] = {
          customer_name: sale.customer_name || null,
          customer_id: sale.customer_id || null,
          sales: [],
          total: 0,
          oldest_date: sale.created_at,
        }
      }
      grouped[key].sales.push(sale)
      grouped[key].total += parseFloat(sale.total_amount || 0)
      // Track oldest
      if (sale.created_at < grouped[key].oldest_date) {
        grouped[key].oldest_date = sale.created_at
      }
    }

    return Object.values(grouped).sort((a, b) => b.total - a.total)
  },

  /**
   * Get all unpaid credit sales (flat list) — used by CreditTab
   */
  async getCreditSales(storeId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .eq('payment_method', 'credit')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get collected credit sales history from database.
   * Requires `was_credit` + `credit_paid_at` columns on sales table.
   */
  async getCollectedCreditSales(storeId, from = null, to = null) {
    const hasTracking = await this.hasCreditTrackingColumns()
    if (!hasTracking) return []

    let query = supabase
      .from('sales')
      .select('id, receipt_number, customer_name, total_amount, created_at, credit_paid_at')
      .eq('store_id', storeId)
      .eq('was_credit', true)
      .neq('payment_method', 'credit')
      .not('credit_paid_at', 'is', null)
      .order('credit_paid_at', { ascending: false })

    if (from) query = query.gte('credit_paid_at', from)
    if (to) query = query.lte('credit_paid_at', to)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((sale) => ({
      id: sale.id,
      sale_id: sale.id,
      receipt_number: sale.receipt_number || null,
      customer_name: sale.customer_name || null,
      amount: parseFloat(sale.total_amount || 0),
      sale_created_at: sale.created_at || null,
      paid_at: sale.credit_paid_at,
    }))
  },

  /**
   * Mark a single credit sale as paid.
   * Changes payment_method to 'cash' so it naturally counts in revenue.
   */
  async markCreditPaid(storeId, saleId) {
    const hasTracking = await this.hasCreditTrackingColumns()
    const updatePayload = { payment_method: 'cash' }
    if (hasTracking) {
      updatePayload.was_credit = true
      updatePayload.credit_paid_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('sales')
      .update(updatePayload)
      .eq('id', saleId)
      .eq('store_id', storeId)

    if (error) throw error
  },

  /**
   * Mark ALL credit sales for a customer as paid.
   */
  async markAllCreditPaidForCustomer(storeId, customerName, customerId) {
    const hasTracking = await this.hasCreditTrackingColumns()
    const updatePayload = { payment_method: 'cash' }
    if (hasTracking) {
      updatePayload.was_credit = true
      updatePayload.credit_paid_at = new Date().toISOString()
    }

    let query = supabase
      .from('sales')
      .update(updatePayload)
      .eq('store_id', storeId)
      .eq('payment_method', 'credit')
      .eq('status', 'completed')

    if (customerId) {
      query = query.eq('customer_id', customerId)
    } else if (customerName) {
      query = query.eq('customer_name', customerName)
    } else {
      query = query.is('customer_name', null).is('customer_id', null)
    }

    const { error } = await query
    if (error) throw error
  },

  // ─── Invoice Numbering ────────────────────────────

  async getNextInvoiceNumber(storeId, series = 'A') {
    const { data, error } = await supabase.rpc('get_next_invoice_number', {
      p_store_id: storeId,
      p_series: series,
    })
    if (error) {
      const maxNum = await this._getLocalInvoiceNumber(storeId)
      return maxNum
    }
    return data
  },

  async _getLocalInvoiceNumber(storeId) {
    const { data, error } = await supabase
      .from('sales')
      .select('invoice_number')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !data?.length) {
      return 'FAC-' + new Date().getFullYear() + '-00001'
    }

    const lastNum = parseInt(data[0].invoice_number?.split('-').pop() || '0', 10)
    const nextNum = lastNum + 1
    return 'FAC-' + new Date().getFullYear() + '-' + String(nextNum).padStart(5, '0')
  },

  async setInvoiceNumber(storeId, saleId, invoiceNumber, series = 'A') {
    const { error } = await supabase
      .from('sales')
      .update({ invoice_number: invoiceNumber, invoice_series: series })
      .eq('id', saleId)
      .eq('store_id', storeId)
    if (error) throw error
  },

  // ─── Return Notes (Credit Notes) ──────────────────

  async createReturnNote(storeId, originalSaleId, items, reason, restoreInventory = true) {
    const { data, error } = await supabase.rpc('create_return_note', {
      p_store_id: storeId,
      p_original_sale_id: originalSaleId,
      p_items: items,
      p_reason: reason || null,
      p_restore_inventory: restoreInventory,
    })

    if (error) {
      return this._createReturnNoteFallback(storeId, originalSaleId, items, reason, restoreInventory)
    }
    return data
  },

  async _createReturnNoteFallback(storeId, originalSaleId, items, reason, restoreInventory) {
    let totalAmount = 0
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items

    for (const item of parsedItems) {
      totalAmount += parseFloat(item.unit_price) * parseFloat(item.quantity)
      if (restoreInventory && item.product_id) {
        const { error: invErr } = await supabase.rpc('restore_product_quantity', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        })
        if (invErr) {
          await supabase.from('products')
            .update({ quantity: supabase.raw(`quantity + ${parseFloat(item.quantity)}`) })
            .eq('id', item.product_id)
            .eq('store_id', storeId)
        }
      }
    }

    const receiptNumber = 'NC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString(36).toUpperCase()

    const { data, error } = await supabase
      .from('return_notes')
      .insert({
        store_id: storeId,
        original_sale_id: originalSaleId,
        receipt_number: receiptNumber,
        total_amount: totalAmount,
        reason: reason || null,
        items: parsedItems,
        status: 'completed',
      })
      .select()
      .single()

    if (error) throw error
    return { id: data.id, receipt_number: receiptNumber, total_amount: totalAmount }
  },

  async getReturnNotes(storeId, saleId = null) {
    let query = supabase
      .from('return_notes')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (saleId) query = query.eq('original_sale_id', saleId)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getReturnNote(storeId, returnNoteId) {
    const { data, error } = await supabase
      .from('return_notes')
      .select('*, sales!return_notes_original_sale_id_fkey(receipt_number, total_amount, customer_name)')
      .eq('store_id', storeId)
      .eq('id', returnNoteId)
      .single()

    if (error) throw error
    return data
  },
}
