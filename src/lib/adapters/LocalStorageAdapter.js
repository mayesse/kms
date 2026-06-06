const STORE_PREFIX = 'gc_local_'

function tbl(name) {
  try { return JSON.parse(localStorage.getItem(STORE_PREFIX + name)) || [] }
  catch { return [] }
}
function sav(name, data) {
  localStorage.setItem(STORE_PREFIX + name, JSON.stringify(data))
}

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

  async _exec() {
    let rows = tbl(this._table)
    if (this._isDelete) {
      const before = rows.length
      rows = rows.filter(r => !this._matches(r))
      sav(this._table, rows)
      const storeId = this._storeId
      if (storeId) {
        const meta = getMeta(this._table)
        setMeta(this._table, { ...meta, count: (meta.count || 0) - (before - rows.length) })
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
      }))
      rows.push(...added)
      sav(this._table, rows)
      if (storeId) {
        const meta = getMeta(this._table)
        setMeta(this._table, { ...meta, count: (meta.count || 0) + added.length })
      }
      return { data: this._single ? added[0] : added, error: null, status: 201 }
    }
    if (this._updateData) {
      rows = rows.map(r => this._matches(r) ? { ...r, ...this._updateData, updated_at: new Date().toISOString() } : r)
      sav(this._table, rows)
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

  then(resolve, reject) {
    this._exec().then(resolve, reject)
  }
}

function getMeta(table) {
  try { return JSON.parse(localStorage.getItem(STORE_PREFIX + '_meta_' + table)) || {} }
  catch { return {} }
}
function setMeta(table, data) {
  localStorage.setItem(STORE_PREFIX + '_meta_' + table, JSON.stringify(data))
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
      if (fn === 'get_trial_info') {
        return { data: { hasTrial: false }, error: null }
      }
      if (fn === 'create_trial') {
        return { data: { id: uid(), hasTrial: true }, error: null }
      }
      return { data: null, error: { message: `Unknown RPC: ${fn}` } }
    },
    auth: {
      signInWithPassword: async ({ email }) => {
        const users = tbl('auth_users')
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
        return { data: { user: session.user, session }, error: null }
      },
      signUp: async ({ email, password, options }) => {
        const users = tbl('auth_users')
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
        sav('auth_users', users)
        sav('store_profiles', [{
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
        return { data: { user: session.user, session }, error: null }
      },
      signOut: async () => ({ error: null }),
      getSession: async () => {
        const raw = localStorage.getItem(STORE_PREFIX + '_session')
        if (raw) return { data: { session: JSON.parse(raw) }, error: null }
        return { data: { session: null }, error: null }
      },
      onAuthStateChange: (cb) => {
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signInWithOAuth: async () => ({ data: { url: '/app/' }, error: null }),
      setSession: async (session) => {
        localStorage.setItem(STORE_PREFIX + '_session', JSON.stringify(session))
        return { data: { session }, error: null }
      },
      refreshSession: async () => {
        const raw = localStorage.getItem(STORE_PREFIX + '_session')
        if (raw) return { data: { session: JSON.parse(raw) }, error: null }
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
    localStorage.setItem(STORE_PREFIX + '_session', JSON.stringify(session))
    return { data: { session }, error: null }
  }

  client.auth.getSession = async () => {
    const raw = localStorage.getItem(STORE_PREFIX + '_session')
    if (raw) return { data: { session: JSON.parse(raw) }, error: null }
    return { data: { session: null }, error: null }
  }

  return client
}

export function createLocalModeClient(storeId) {
  return createLocalClient(storeId)
}
