import { createClient } from '@supabase/supabase-js'
import { createDemoClient } from './demoDb'
import { createLocalModeClient } from './adapters/LocalStorageAdapter'
import { getStorageMode, isElectron, STORAGE_MODES } from './adapters/storageConfig'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const _real = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

let _localClient = null
let _hfsqlClient = null

function getHfsqlClient() {
  if (!isElectron()) return null
  if (_hfsqlClient) return _hfsqlClient
  const config = getStorageConfig()
  if (config.mode !== STORAGE_MODES.HFSQL) return null
  if (!window.gc?.hfsql) return null
  _hfsqlClient = createHfsqlIpcClient(config.connection)
  return _hfsqlClient
}

class HfsqlQuery {
  constructor(table) {
    this._table = table
    this._action = null
    this._fields = null
    this._insertData = null
    this._updateData = null
    this._isDelete = false
    this._filters = []
    this._orderField = null
    this._orderAsc = true
    this._limit = null
    this._range = null
    this._single = false
    this._maybe = false
  }
  select(fields) { this._action = 'select'; this._fields = fields; return this }
  insert(data) { this._action = 'insert'; this._insertData = Array.isArray(data) ? data : [data]; return this }
  update(data) { this._action = 'update'; this._updateData = data; return this }
  delete() { this._action = 'delete'; this._isDelete = true; return this }
  eq(f, v) { this._filters.push({ op: 'eq', f, v }); return this }
  neq(f, v) { this._filters.push({ op: 'neq', f, v }); return this }
  in(f, v) { this._filters.push({ op: 'in', f, v }); return this }
  is(f, v) { this._filters.push({ op: 'is', f, v }); return this }
  gte(f, v) { this._filters.push({ op: 'gte', f, v }); return this }
  lte(f, v) { this._filters.push({ op: 'lte', f, v }); return this }
  order(f, o) { this._orderField = f; this._orderAsc = o?.ascending !== false; return this }
  limit(n) { this._limit = n; return this }
  range(a, b) { this._range = [a, b]; return this }
  single() { this._single = true; return this }
  maybeSingle() { this._maybe = true; return this }
  textSearch(f, q) { this._filters.push({ op: 'textSearch', f, q }); return this }
  ilike(f, v) { this._filters.push({ op: 'ilike', f: f.replace('.', '_').replace('.', '_'), v: v.replace(/%/g, '') }); return this }
  or(filters) {
    // Supabase or() format: "field1.ilike.%val%,field2.eq.val"
    const parts = filters.split(',').map(p => {
      const m = p.match(/^(\w+)\.(\w+)\.(.*)$/)
      if (!m) return null
      let val = m[3].replace(/^%/, '').replace(/%$/, '')
      return { field: m[1], op: m[2], val }
    }).filter(Boolean)
    this._filters.push({ op: 'or', parts }); return this
  }
  then(resolve) {
    const msg = { action: this._action, table: this._table, fields: this._fields, filters: this._filters }
    if (this._action === 'select') {
      msg.orderField = this._orderField; msg.orderAsc = this._orderAsc
      msg.limit = this._limit; msg.range = this._range
      msg.single = this._single; msg.maybe = this._maybe
    }
    if (this._action === 'insert') msg.data = this._insertData
    if (this._action === 'update') msg.data = this._updateData
    window.gc.hfsql.query(msg).then(resolve)
  }
}

function createHfsqlIpcClient() {
  const gc = window.gc
  return {
    from: (table) => new HfsqlQuery(table),
    rpc: (fn, params) => gc.hfsql.rpc(fn, params),
    auth: gc.hfsql.auth,
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }), list: async () => ({ data: [], error: null }), remove: async () => ({}) }) },
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
  }
}

function bind(val, ctx) {
  return typeof val === 'function' ? val.bind(ctx) : val
}

const handler = {
  get(_, prop) {
    if (window.__DEMO_MODE__ && window.__DEMO_CLIENT__) {
      return bind(window.__DEMO_CLIENT__[prop], window.__DEMO_CLIENT__)
    }
    const mode = getStorageMode()
    if (mode === STORAGE_MODES.LOCAL) {
      if (!_localClient) {
        _localClient = createLocalModeClient()
      }
      return bind(_localClient[prop], _localClient)
    }
    if (mode === STORAGE_MODES.HFSQL) {
      const hfsql = getHfsqlClient()
      if (hfsql) return bind(hfsql[prop], hfsql)
    }
    return bind(_real[prop], _real)
  }
}

export const supabase = new Proxy(_real, handler)
