import { loadTable, saveTable, getMetaValue, setMetaValue, getValue, setValue, migrateFromLocalStorage } from './db'

const STORE_PREFIX = 'gc_local_'
let _sessionCache = null

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function bind(ctx, fn) {
  return function (...args) { return fn.apply(ctx, args) }
}

class Q {
  constructor(table) {
    this._table = table
    this._ops = []
    this._single = false
    this._maybe = false
  }
  select(fields) { return this }
  insert(data) {
    this._insertData = Array.isArray(data) ? data : [data]
    return this
  }
  update(data) {
    this._updateData = data
    return this
  }
  delete() {
    this._isDelete = true
    return this
  }
  eq(f, v) { this._ops.push({ op: 'eq', f, v }); return this }
  neq(f, v) { this._ops.push({ op: 'neq', f, v }); return this }
  in(f, v) { this._ops.push({ op: 'in', f, v }); return this }
  is(f, v) { this._ops.push({ op: 'is', f, v }); return this }
  gte(f, v) { this._ops.push({ op: 'gte', f, v }); return this }
  lte(f, v) { this._ops.push({ op: 'lte', f, v }); return this }
  order(f, o) { this._order = { f, asc: o?.ascending !== false }; return this }
  limit(n) { this._limit = n; return this }
  range(a, b) { this._range = [a, b]; return this }
  single() { this._single = true; return this }
  maybeSingle() { this._maybe = true; return this }
  textSearch(f, q) { this._ops.push({ op: 'textSearch', f, q }); return this }
  contains(f, v) { this._ops.push({ op: 'contains', f, v: Array.isArray(v) ? v : [v] }); return this }
  ilike(f, v) { this._ops.push({ op: 'ilike', f, v: v.replace(/%/g, '') }); return this }
  or(filterStr) {
    const parts = filterStr.split(',').map(p => {
      const m = p.match(/^(\w+)\.(\w+)\.(.*)$/)
      if (!m) return null
      let val = m[3].replace(/^%/, '').replace(/%$/, '')
      return { field: m[1], op: m[2], val }
    }).filter(Boolean)
    this._ops.push({ op: 'or', parts })
    return this
  }

  _matches(r) {
    for (const o of this._ops) {
      const val = r[o.f]
      switch (o.op) {
        case 'eq': if (val !== o.v) return false; break
        case 'neq': if (val === o.v) return false; break
        case 'in': if (!o.v?.includes(val)) return false; break
        case 'is': if (o.v === null && val != null) return false; if (o.v !== null && val !== o.v) return false; break
        case 'gte': if (val < o.v) return false; break
        case 'lte': if (val > o.v) return false; break
        case 'textSearch': if (!String(val).toLowerCase().includes(String(o.q).toLowerCase())) return false; break
        case 'contains': if (!Array.isArray(val) || !o.v?.some(v => val.includes(v))) return false; break
        case 'ilike': if (!String(val).toLowerCase().includes(String(o.v).toLowerCase())) return false; break
        case 'or': if (!o.parts?.some(p => {
          const rv = r[p.field]
          if (p.op === 'ilike') return String(rv).toLowerCase().includes(String(p.val).toLowerCase())
          if (p.op === 'eq') return rv === p.val
          return String(rv).toLowerCase().includes(String(p.val).toLowerCase())
        })) return false; break
      }
    }
    return true
  }

  async _exec() {
    let rows = await loadTable(this._table)
    rows = rows.map(r => ({ ...r, is_active: r.is_active === false ? false : true }))
    if (this._isDelete) {
      const before = rows.length
      rows = rows.filter(r => !this._matches(r))
      await saveTable(this._table, rows)
      const storeId = this._storeId
      if (storeId) {
        const meta = await getMetaValue(this._table)
        await setMetaValue(this._table, { ...meta, count: (meta?.count || 0) - (before - rows.length) })
      }
      return { data: null, count: before - rows.length, error: null, status: 204 }
    }
    if (this._insertData) {
      const now = new Date().toISOString()
      const storeId = this._storeId
      const added = this._insertData.map(d => ({
        ...d,
        id: d.id || uid(),
        created_at: d.created_at || now,
        updated_at: d.updated_at || now,
        store_id: d.store_id || storeId,
        is_active: d.is_active !== undefined ? d.is_active : true,
      }))
      rows.push(...added)
      await saveTable(this._table, rows)
      if (storeId) {
        const meta = await getMetaValue(this._table)
        await setMetaValue(this._table, { ...meta, count: (meta?.count || 0) + added.length })
      }
      return { data: this._single ? added[0] : added, error: null, status: 201 }
    }
    if (this._updateData) {
      rows = rows.map(r => this._matches(r) ? { ...r, ...this._updateData, updated_at: new Date().toISOString() } : r)
      await saveTable(this._table, rows)
      const updated = rows.filter(r => this._matches({ ...r, ...this._updateData }))
      return { data: this._single ? updated[0] || null : updated, error: null }
    }
    let result = rows.filter(r => this._matches(r))
    if (this._order) {
      result.sort((a, b) => {
        const av = a[this._order.f], bv = b[this._order.f]
        if (av == null) return 1; if (bv == null) return -1
        return av < bv ? (this._order.asc ? -1 : 1) : av > bv ? (this._order.asc ? 1 : -1) : 0
      })
    }
    if (this._limit) result = result.slice(0, this._limit)
    if (this._range) result = result.slice(this._range[0], this._range[1] + 1)
    if (this._single) return { data: result[0] || null, error: result.length === 0 ? { code: 'PGRST116' } : null }
    if (this._maybe) return { data: result[0] || null, error: null }
    return { data: result, error: null }
  }

  async upsert(data) {
    const items = Array.isArray(data) ? data : [data]
    const rows = await loadTable(this._table)
    for (const item of items) {
      const idx = rows.findIndex(r => r.id === item.id)
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...item, updated_at: new Date().toISOString() }
      } else {
        rows.push({ ...item, id: item.id || uid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), store_id: item.store_id || this._storeId, is_active: item.is_active !== undefined ? item.is_active : true })
      }
    }
    await saveTable(this._table, rows)
    return { data: items.length === 1 ? items[0] : items, error: null }
  }

  then(resolve, reject) {
    this._exec().then(resolve, reject)
  }
}

function createLocalClient(storeId) {
  const client = {
    from: (table) => {
      const q = new Q(table)
      q._storeId = storeId
      return q
    },
    rpc: async (fn, params) => {
      if (fn === 'get_next_invoice_number') {
        const seqs = await loadTable('invoice_sequences')
        const seq = seqs.find(s => s.store_id === storeId)
        const next = (seq?.last_number || 0) + 1
        const rows = seqs.filter(s => s.store_id !== storeId)
        rows.push({ store_id: storeId, last_number: next, year: new Date().getFullYear() })
        await saveTable('invoice_sequences', rows)
        return { data: `FAC-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`, error: null }
      }
      if (fn === 'create_return_note') {
        const rows = await loadTable('return_notes')
        const note = { id: uid(), ...params, created_at: new Date().toISOString(), store_id: storeId }
        rows.push(note)
        await saveTable('return_notes', rows)
        return { data: note, error: null }
      }
      if (fn === 'get_trial_info') {
        return await _localGetTrialInfo(client, storeId, params)
      }
      if (fn === 'create_trial') {
        return await _localCreateTrial(client, storeId, params)
      }
      if (fn === 'create_sale') {
        return await _localCreateSale(client, params.p_store_id || storeId, params)
      }
      if (fn === 'void_sale') {
        return await _localVoidSale(client, params.p_store_id || storeId, params)
      }
      if (fn === 'restore_product_quantity') {
        return await _localRestoreProductQuantity(client, params.p_store_id || storeId, params)
      }
      if (fn === 'advance_stock_transfer') {
        return await _localAdvanceStockTransfer(client, params.p_store_id || storeId, params)
      }
      return { data: null, error: { message: `Unknown RPC: ${fn}` } }
    },
    auth: {
      _saveSession: async (session) => {
        _sessionCache = session
        await setValue('local_session', session).catch(() => {})
      },
      signInWithPassword: async ({ email }) => {
        const users = await loadTable('auth_users')
        const user = users.find(u => u.email === email)
        if (!user) return { data: null, error: { message: 'Invalid login credentials' } }
        const session = {
          access_token: 'local_token',
          refresh_token: 'local_refresh',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer',
          user: { id: user.store_id, email: user.email, user_metadata: user.metadata },
        }
        await client.auth._saveSession(session)
        return { data: { user: session.user, session }, error: null }
      },
      signUp: async ({ email, password, options }) => {
        const users = await loadTable('auth_users')
        const exists = users.find(u => u.email === email)
        if (exists) return { data: null, error: { message: 'User already registered' } }
        const storeId = uid()
        users.push({
          id: uid(),
          email,
          store_id: storeId,
          metadata: options?.data || {},
          created_at: new Date().toISOString(),
        })
        await saveTable('auth_users', users)
        await saveTable('store_profiles', [{
          id: storeId, store_name: options?.data?.store_name || 'My Store',
          owner_name: options?.data?.owner_name || '',
          business_type: options?.data?.business_type || 'general',
          phone: options?.data?.phone || '',
          created_at: new Date().toISOString(),
        }])
        const session = {
          access_token: 'local_token',
          refresh_token: 'local_refresh',
          expires_in: 86400,
          user: { id: storeId, email, user_metadata: options?.data || {} },
        }
        await client.auth._saveSession(session)
        return { data: { user: session.user, session }, error: null }
      },
      signOut: async () => {
        _sessionCache = null
        await setValue('local_session', null).catch(() => {})
        return { error: null }
      },
      getSession: async () => {
        if (_sessionCache) return { data: { session: _sessionCache }, error: null }
        try {
          const saved = await getValue('local_session')
          if (saved) {
            _sessionCache = saved
            return { data: { session: saved }, error: null }
          }
        } catch {}
        return { data: { session: null }, error: null }
      },
      onAuthStateChange: (cb) => {
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signInWithOAuth: async () => ({ data: { url: '/app/' }, error: null }),
      setSession: async (session) => {
        _sessionCache = session
        await setValue('local_session', session).catch(() => {})
        return { data: { session }, error: null }
      },
      refreshSession: async () => {
        if (_sessionCache) return { data: { session: _sessionCache }, error: null }
        try {
          const saved = await getValue('local_session')
          if (saved) {
            _sessionCache = saved
            return { data: { session: saved }, error: null }
          }
        } catch {}
        return { data: { session: null }, error: null }
      },
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'local/' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: {}, error: null }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
    realtime: { subscribe: () => {} },
  }

  client.auth.setSession = async (session) => {
    _sessionCache = session
    return { data: { session }, error: null }
  }

  client.auth.getSession = async () => {
    if (_sessionCache) return { data: { session: _sessionCache }, error: null }
    return { data: { session: null }, error: null }
  }

  return client
}

let _migrationDone = false

export async function ensureLocalDataConsistency() {
  if (_migrationDone) return
  _migrationDone = true
  try {
    let rows = await loadTable('products')
    let changed = false
    rows = rows.map(r => {
      if (r.is_active !== false) {
        changed = true
        return { ...r, is_active: true }
      }
      return r
    })
    if (changed) {
      await saveTable('products', rows)
    }
  } catch {
    // non-critical
  }
}

async function _localCreateSale(client, storeId, params) {
  const sales = await loadTable('sales')
  const saleItems = await loadTable('sale_items')
  const products = await loadTable('products')
  const batches = await loadTable('batches')
  const activityLog = await loadTable('activity_log')

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counterKey = `receipt_counter_${storeId}_${today}`
  const prevVal = parseInt(localStorage.getItem(counterKey) || '0', 10)
  const vCounter = prevVal + 1
  localStorage.setItem(counterKey, String(vCounter))
  const receiptNumber = `GC-${today}-${String(vCounter).padStart(3, '0')}`

  const items = Array.isArray(params.p_items)
    ? params.p_items
    : (typeof params.p_items === 'string' ? JSON.parse(params.p_items) : [])

  let subtotal = items.reduce((s, item) => s + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0)
  subtotal += parseFloat(params.p_delivery_fee) || 0
  subtotal += parseFloat(params.p_service_charge) || 0
  subtotal -= parseFloat(params.p_discount_amount) || 0
  if (params.p_subtotal_ht != null && parseFloat(params.p_subtotal_ht) > 0) {
    subtotal = parseFloat(params.p_subtotal_ht)
  }
  const total = subtotal + (parseFloat(params.p_tax_amount) || 0)

  const saleId = uid()
  const now = new Date().toISOString()
  const sale = {
    id: saleId,
    store_id: storeId,
    session_id: params.p_session_id,
    receipt_number: receiptNumber,
    total_amount: total,
    discount_amount: parseFloat(params.p_discount_amount) || 0,
    payment_method: params.p_payment_method,
    customer_name: params.p_customer_name || null,
    customer_id: params.p_customer_id || null,
    note: params.p_note || null,
    order_type: params.p_order_type || 'counter',
    table_id: params.p_table_id || null,
    delivery_fee: parseFloat(params.p_delivery_fee) || 0,
    service_charge: parseFloat(params.p_service_charge) || 0,
    staff_id: params.p_staff_id || null,
    branch_id: params.p_branch_id || null,
    tax_amount: parseFloat(params.p_tax_amount) || 0,
    tax_rate_id: params.p_tax_rate_id || null,
    subtotal_ht: subtotal,
    kitchen_status: ['dine_in', 'takeaway', 'delivery'].includes(params.p_order_type) ? 'pending' : null,
    delivery_status: params.p_order_type === 'delivery' ? 'pending' : null,
    status: 'completed',
    created_at: now,
    updated_at: now,
    is_active: true,
  }
  sales.push(sale)

  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0
    const conversion = parseFloat(item.conversion_rate) || 1
    const saleItem = {
      id: uid(),
      sale_id: saleId,
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: qty,
      unit_price: parseFloat(item.unit_price) || 0,
      purchase_price: parseFloat(item.purchase_price) || 0,
      note: item.note || null,
      batch_id: item.batch_id || null,
      variant_id: item.variant_id || null,
      service_id: item.service_id || null,
      created_at: now,
      updated_at: now,
    }
    saleItems.push(saleItem)

    if (item.variant_id) {
      const variants = await loadTable('product_variants')
      const vIdx = variants.findIndex(v => v.id === item.variant_id && v.store_id === storeId)
      if (vIdx >= 0) {
        variants[vIdx] = { ...variants[vIdx], quantity: parseFloat(variants[vIdx].quantity) - qty, updated_at: now }
        await saveTable('product_variants', variants)
      }
    }

    if (item.batch_id) {
      const bIdx = batches.findIndex(b => b.id === item.batch_id && b.store_id === storeId)
      if (bIdx >= 0) {
        batches[bIdx] = { ...batches[bIdx], quantity: Math.max(0, parseFloat(batches[bIdx].quantity) - qty * conversion), updated_at: now }
      }
    }

    if (item.product_id && !item.service_id) {
      const prodIdx = products.findIndex(p => p.id === item.product_id && p.store_id === storeId)
      if (prodIdx >= 0) {
        products[prodIdx] = { ...products[prodIdx], quantity: parseFloat(products[prodIdx].quantity) - qty * conversion, updated_at: now }
      }
    }

    if (params.p_staff_id && item.product_id) {
      const rules = await loadTable('commission_rules')
      const rule = rules.find(r => r.store_id === storeId && r.staff_id === params.p_staff_id && r.is_active === true)
      if (rule && parseFloat(rule.commission_rate) > 0) {
        const lineTotal = qty * (parseFloat(item.unit_price) || 0)
        const earned = Math.round(lineTotal * parseFloat(rule.commission_rate) / 100 * 100) / 100
        const commissions = await loadTable('commissions')
        commissions.push({
          id: uid(),
          store_id: storeId,
          staff_id: params.p_staff_id,
          sale_id: saleId,
          sale_item_id: saleItem.id,
          product_id: item.product_id || null,
          service_id: item.service_id || null,
          commission_type: 'percent',
          commission_value: parseFloat(rule.commission_rate),
          earned_amount: earned,
          status: 'pending',
          created_at: now,
          updated_at: now,
        })
        await saveTable('commissions', commissions)
      }
    }
  }

  if (params.p_table_id) {
    const tables = await loadTable('tables')
    const tIdx = tables.findIndex(t => t.id === params.p_table_id && t.store_id === storeId)
    if (tIdx >= 0) {
      tables[tIdx] = { ...tables[tIdx], status: 'occupied', updated_at: now }
      await saveTable('tables', tables)
    }
  }

  await saveTable('sales', sales)
  await saveTable('sale_items', saleItems)
  await saveTable('products', products)
  await saveTable('batches', batches)

  activityLog.push({
    id: uid(), store_id: storeId, action_type: 'sale_created',
    entity_type: 'sale', entity_id: saleId,
    entity_name: receiptNumber, details: items, amount: total,
    created_at: now, updated_at: now,
  })
  await saveTable('activity_log', activityLog)

  return {
    data: { sale_id: saleId, receipt_number: receiptNumber, total, tax_amount: parseFloat(params.p_tax_amount) || 0, subtotal_ht: subtotal },
    error: null,
  }
}

async function _localVoidSale(client, storeId, params) {
  const sales = await loadTable('sales')
  const saleItemsTable = await loadTable('sale_items')
  const products = await loadTable('products')
  const activityLog = await loadTable('activity_log')

  const saleIdx = sales.findIndex(s => s.id === params.p_sale_id && s.store_id === storeId && s.status === 'completed')
  if (saleIdx < 0) {
    return { data: null, error: { message: 'Sale not found or already voided' } }
  }

  const sale = sales[saleIdx]
  sales[saleIdx] = {
    ...sale,
    status: 'voided',
    voided_at: new Date().toISOString(),
    voided_reason: params.p_reason || null,
    updated_at: new Date().toISOString(),
  }
  await saveTable('sales', sales)

  const relatedItems = saleItemsTable.filter(si => si.sale_id === params.p_sale_id)
  for (const si of relatedItems) {
    if (si.product_id) {
      const prodIdx = products.findIndex(p => p.id === si.product_id && p.store_id === storeId)
      if (prodIdx >= 0) {
        products[prodIdx] = {
          ...products[prodIdx],
          quantity: parseFloat(products[prodIdx].quantity) + parseFloat(si.quantity),
          updated_at: new Date().toISOString(),
        }
      }
    }
  }
  await saveTable('products', products)

  if (sale.table_id) {
    const tables = await loadTable('tables')
    const tableIdx = tables.findIndex(t => t.id === sale.table_id && t.store_id === storeId)
    if (tableIdx >= 0) {
      tables[tableIdx] = { ...tables[tableIdx], status: 'free', updated_at: new Date().toISOString() }
      await saveTable('tables', tables)
    }
  }

  activityLog.push({
    id: uid(),
    store_id: storeId,
    action_type: 'sale_voided',
    entity_type: 'sale',
    entity_id: params.p_sale_id,
    entity_name: sale.receipt_number,
    details: { reason: params.p_reason },
    amount: sale.total_amount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  await saveTable('activity_log', activityLog)

  return { data: true, error: null }
}

async function _localRestoreProductQuantity(client, storeId, params) {
  const products = await loadTable('products')
  const prodIdx = products.findIndex(p => p.id === params.p_product_id)
  if (prodIdx >= 0) {
    products[prodIdx] = {
      ...products[prodIdx],
      quantity: parseFloat(products[prodIdx].quantity) + (parseFloat(params.p_quantity) || 0),
      updated_at: new Date().toISOString(),
    }
    await saveTable('products', products)
  }
  return { data: { success: true }, error: null }
}

async function _localAdvanceStockTransfer(client, storeId, params) {
  const transfers = await loadTable('stock_transfers')
  const idx = transfers.findIndex(t => t.id === params.p_transfer_id && t.store_id === storeId)
  if (idx < 0) {
    return { data: null, error: { message: 'Transfer not found' } }
  }

  const newStatus = params.p_new_status
  const validStatuses = ['in_transit', 'received', 'cancelled']
  if (!validStatuses.includes(newStatus)) {
    return { data: null, error: { message: `Invalid status: ${newStatus}` } }
  }

  transfers[idx] = {
    ...transfers[idx],
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  await saveTable('stock_transfers', transfers)

  return { data: { success: true }, error: null }
}

async function _localGetTrialInfo(client, storeId, params) {
  const sid = params?.p_store_id || storeId
  if (!sid) return { data: { hasTrial: false }, error: null }

  const subs = await loadTable('subscriptions')
  const activeSub = subs.find(s => s.store_id === sid && s.status === 'active')
  if (activeSub) {
    return {
      data: {
        hasTrial: false, hasSubscription: true, subscription: activeSub,
        remainingDays: 36500, isExpired: false,
        usage: { products: 0, sales: 0, suppliers: 0 },
        limits: { products: 999999, sales: 999999, suppliers: 999999 },
      },
      error: null,
    }
  }

  const trials = await loadTable('trials')
  const trial = trials.find(t => t.store_id === sid)
  if (trial) {
    const expiresAt = new Date(trial.expires_at)
    const now = new Date()
    return {
      data: {
        hasTrial: true, startedAt: trial.started_at, expiresAt: trial.expires_at,
        remainingDays: Math.max(0, Math.floor((expiresAt - now) / 86400000)),
        isExpired: now > expiresAt,
        usage: { products: 0, sales: 0, suppliers: 0 },
        limits: {
          products: trial.products_limit || 50,
          sales: trial.sales_limit || 50,
          suppliers: trial.suppliers_limit || 2,
        },
      },
      error: null,
    }
  }

  const created = await _localCreateTrial(client, sid, {})
  return created
}

async function _localCreateTrial(client, storeId, params) {
  const sid = params?.p_store_id || storeId
  if (!sid) return { data: { id: uid(), hasTrial: true }, error: null }

  const trials = await loadTable('trials')
  const existing = trials.find(t => t.store_id === sid)
  if (existing) {
    return {
      data: {
        id: existing.id, hasTrial: true, expires_at: existing.expires_at,
        products_limit: existing.products_limit || 50,
        sales_limit: existing.sales_limit || 50,
        suppliers_limit: existing.suppliers_limit || 2,
      },
      error: null,
    }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 86400000)
  const trial = {
    id: uid(),
    store_id: sid,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    products_limit: 50,
    sales_limit: 50,
    suppliers_limit: 2,
    created_at: now.toISOString(),
  }
  trials.push(trial)
  await saveTable('trials', trials)

  return {
    data: {
      id: trial.id, hasTrial: true,
      expires_at: trial.expires_at,
      products_limit: trial.products_limit,
      sales_limit: trial.sales_limit,
      suppliers_limit: trial.suppliers_limit,
    },
    error: null,
  }
}

export function createLocalModeClient(storeId) {
  return createLocalClient(storeId)
}
