const DEMO_PREFIX = 'greencrown_demo_'

function tbl(name) {
  try { return JSON.parse(localStorage.getItem(DEMO_PREFIX + name)) || [] }
  catch { return [] }
}
function sav(name, data) {
  localStorage.setItem(DEMO_PREFIX + name, JSON.stringify(data))
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
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
    const items = Array.isArray(data) ? data : [data]
    this._insertData = items
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
      }
    }
    return true
  }

  async then(resolve) {
    try {
      let rows = tbl(this._table)
      if (this._isDelete) {
        const before = rows.length
        rows = rows.filter(r => !this._matches(r))
        sav(this._table, rows)
        return resolve({ data: null, count: before - rows.length, error: null, status: 204 })
      }
      if (this._insertData) {
        const now = new Date().toISOString()
        const added = this._insertData.map(d => ({
          ...d,
          id: d.id || uid(),
          created_at: now,
          store_id: d.store_id || window.__DEMO_STORE_ID__,
        }))
        rows.push(...added)
        sav(this._table, rows)
        return resolve({ data: this._single ? added[0] : added, error: null, status: 201 })
      }
      if (this._updateData) {
        rows = rows.map(r => this._matches(r) ? { ...r, ...this._updateData, updated_at: new Date().toISOString() } : r)
        sav(this._table, rows)
        const updated = rows.filter(r => this._matches({ ...r, ...this._updateData }))
        return resolve({ data: this._single ? updated[0] || null : updated, error: null })
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
      if (this._single) return resolve({ data: result[0] || null, error: result.length === 0 ? { code: 'PGRST116', message: 'Row not found' } : null })
      if (this._maybe) return resolve({ data: result[0] || null, error: null })
      return resolve({ data: result, error: null })
    } catch (e) {
      return resolve({ data: null, error: e })
    }
  }
}

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@greencrown.store',
  app_metadata: {},
  user_metadata: { store_name: 'Demo Store', owner_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}
const DEMO_SESSION = {
  access_token: 'demo_token',
  refresh_token: 'demo_refresh',
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  token_type: 'bearer',
  user: DEMO_USER,
}

export function createDemoClient(storeId) {
  window.__DEMO_MODE__ = true
  window.__DEMO_STORE_ID__ = storeId
  DEMO_USER.id = storeId
  return {
    from: (table) => new Q(table),
    rpc: async (fn, params) => {
      if (fn === 'get_next_invoice_number') {
        const seq = tbl('invoice_sequences').find(s => s.store_id === storeId)
        const next = (seq?.last_number || 0) + 1
        const rows = tbl('invoice_sequences').filter(s => s.store_id !== storeId)
        rows.push({ store_id: storeId, last_number: next, year: new Date().getFullYear() })
        sav('invoice_sequences', rows)
        return { data: `FAC-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`, error: null }
      }
      if (fn === 'create_return_note') {
        const rows = tbl('return_notes')
        const note = { id: uid(), ...params, created_at: new Date().toISOString(), store_id: storeId }
        rows.push(note)
        sav('return_notes', rows)
        return { data: note, error: null }
      }
      return { data: null, error: { message: `Unknown RPC: ${fn}` } }
    },
    auth: {
      signInWithPassword: async () => ({ data: { user: DEMO_USER, session: DEMO_SESSION }, error: null }),
      signUp: async () => ({ data: { user: DEMO_USER, session: DEMO_SESSION }, error: null }),
      signOut: async () => { delete window.__DEMO_MODE__; delete window.__DEMO_STORE_ID__; return { error: null } },
      getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
      onAuthStateChange: (cb) => {
        setTimeout(() => cb('SIGNED_IN', DEMO_SESSION), 0)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signInWithOAuth: async () => ({ data: { url: '/app/' }, error: null }),
      setSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
      refreshSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'demo/' }, error: null }),
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
}

export function seedDemoData(storeId, businessType) {
  const now = new Date().toISOString()
  const cats = [
    { id: uid(), name: 'مشروبات', name_en: 'Beverages', store_id: storeId, created_at: now },
    { id: uid(), name: 'وجبات خفيفة', name_en: 'Snacks', store_id: storeId, created_at: now },
    { id: uid(), name: 'ألبان', name_en: 'Dairy', store_id: storeId, created_at: now },
    { id: uid(), name: 'مخبوزات', name_en: 'Bakery', store_id: storeId, created_at: now },
    { id: uid(), name: 'منظفات', name_en: 'Cleaning', store_id: storeId, created_at: now },
    { id: uid(), name: 'عناية شخصية', name_en: 'Personal Care', store_id: storeId, created_at: now },
    { id: uid(), name: 'معلبات', name_en: 'Canned Goods', store_id: storeId, created_at: now },
  ]
  sav('categories', cats)

  const products = [
    { barcode: '544900000001', name: 'Coca-Cola 33cl', name_ar: 'كوكا كولا 33cl', price: 80, purchase_price: 55, stock: 120, category_id: cats[0].id, store_id: storeId },
    { barcode: '544900000002', name: 'Pepsi 33cl', name_ar: 'بيبسي 33cl', price: 75, purchase_price: 50, stock: 95, category_id: cats[0].id, store_id: storeId },
    { barcode: '544900000003', name: 'Oasis Tropical 50cl', name_ar: 'واحات تروبيكال 50cl', price: 50, purchase_price: 30, stock: 60, category_id: cats[0].id, store_id: storeId },
    { barcode: '544900000004', name: 'Sidi Ali 1.5L', name_ar: 'سيدي علي 1.5 لتر', price: 35, purchase_price: 18, stock: 200, category_id: cats[0].id, store_id: storeId },
    { barcode: '544900000005', name: 'Lays Chips 100g', name_ar: 'لايز شيبس 100غ', price: 60, purchase_price: 40, stock: 85, category_id: cats[1].id, store_id: storeId },
    { barcode: '544900000006', name: 'Oreo 154g', name_ar: 'أوريو 154غ', price: 90, purchase_price: 65, stock: 45, category_id: cats[1].id, store_id: storeId },
    { barcode: '544900000007', name: 'Milk Chocolate 100g', name_ar: 'شوكولاتة حليب 100غ', price: 70, purchase_price: 48, stock: 55, category_id: cats[1].id, store_id: storeId },
    { barcode: '544900000008', name: 'Lait Djurdjura 1L', name_ar: 'حليب جرجرة 1 لتر', price: 100, purchase_price: 75, stock: 40, category_id: cats[2].id, store_id: storeId },
    { barcode: '544900000009', name: 'Yogurt Nature 4pk', name_ar: 'زبادي طبيعي 4 حبات', price: 120, purchase_price: 90, stock: 30, category_id: cats[2].id, store_id: storeId },
    { barcode: '544900000010', name: 'Fromage Fondu 200g', name_ar: 'جبن مطبوخ 200غ', price: 150, purchase_price: 110, stock: 25, category_id: cats[2].id, store_id: storeId },
    { barcode: '544900000011', name: 'Pain Baguette', name_ar: 'خبز باغيت', price: 20, purchase_price: 10, stock: 50, category_id: cats[3].id, store_id: storeId },
    { barcode: '544900000012', name: 'Croissant 4pk', name_ar: 'كرواسان 4 حبات', price: 100, purchase_price: 70, stock: 20, category_id: cats[3].id, store_id: storeId },
    { barcode: '544900000013', name: 'Javel Lakeland 1L', name_ar: 'جافيل 1 لتر', price: 80, purchase_price: 55, stock: 35, category_id: cats[4].id, store_id: storeId },
    { barcode: '544900000014', name: 'Liquide Vaisselle 500ml', name_ar: 'سائل جلي 500مل', price: 65, purchase_price: 42, stock: 40, category_id: cats[4].id, store_id: storeId },
    { barcode: '544900000015', name: 'Savon Marseille', name_ar: 'صابون مرسيليا', price: 45, purchase_price: 28, stock: 70, category_id: cats[5].id, store_id: storeId },
    { barcode: '544900000016', name: 'Shampooing Elvive 400ml', name_ar: 'شامبو إلفيف 400مل', price: 200, purchase_price: 150, stock: 22, category_id: cats[5].id, store_id: storeId },
    { barcode: '544900000017', name: 'Haricots Rouges 400g', name_ar: 'فاصوليا حمراء 400غ', price: 60, purchase_price: 38, stock: 48, category_id: cats[6].id, store_id: storeId },
    { barcode: '544900000018', name: 'Concentré Tomate 70g', name_ar: 'مركز طماطم 70غ', price: 30, purchase_price: 18, stock: 90, category_id: cats[6].id, store_id: storeId },
    { barcode: '544900000019', name: 'Thon Saumur 160g', name_ar: 'تون سومور 160غ', price: 110, purchase_price: 80, stock: 35, category_id: cats[6].id, store_id: storeId },
  ].map(p => ({ id: uid(), ...p, created_at: now, updated_at: now, store_id: storeId, stock_type: 'ready', min_threshold: 5, unit: 'pc', weight_based: false, has_variants: false }))
  sav('products', products)

  sav('store_profiles', [{
    id: storeId, business_type: businessType, store_name: 'Demo Store',
    owner_name: 'Demo User', phone: '+213 555 12 34 56', address: 'Alger',
    currency: 'DZD', currency_symbol: 'د.ج', currency_decimals: 0,
    nif: '099123456789012', nis: '123456789012345', rc: '00B1234567', article: '4',
    invoice_series: 'A', created_at: now,
  }])

  sav('sales', [])
  sav('return_notes', [])
  sav('invoice_sequences', [])
  sav('customers', [])
  sav('suppliers', [])
  sav('purchases', [])
  sav('sessions', [])
  sav('holds', [])
}
