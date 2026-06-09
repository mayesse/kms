const DB_NAME = 'greencrown_db'
const DB_VERSION = 1
const STORE_NAME = 'data'
const MIGRATED_KEY = 'gc_idb_migrated'

let _dbPromise = null

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB timeout')), ms))
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('table', 'table', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getDb() {
  if (!_dbPromise) {
    _dbPromise = Promise.race([openDb(), timeout(5000)]).catch(err => {
      _dbPromise = null
      throw err
    })
  }
  return _dbPromise
}

export async function loadTable(table) {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('table')
    const req = index.getAll(table)
    return await Promise.race([
      new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result.map(r => r.data))
        req.onerror = () => reject(req.error)
      }),
      timeout(5000),
    ])
  } catch {
    return []
  }
}

export async function saveTable(table, records) {
  try {
    const db = await getDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('table')
    const keysReq = index.getAllKeys(table)
    keysReq.onsuccess = () => {
      for (const k of keysReq.result) store.delete(k)
      for (const r of records) {
        store.put({ key: `${table}:${r.id}`, table, data: r, id: r.id })
      }
    }
    await Promise.race([
      new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
      timeout(10000),
    ])
  } catch {
    // Silently fail — app continues with in-memory data
  }
}

export async function getMetaValue(table) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const req = store.get(`_meta:${table}`)
  return new Promise(resolve => {
    req.onsuccess = () => resolve(req.result?.data || null)
    req.onerror = () => resolve(null)
  })
}

export async function setMetaValue(table, data) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.put({ key: `_meta:${table}`, table: '_meta', data })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getValue(key) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const req = store.get(`_val:${key}`)
  return new Promise(resolve => {
    req.onsuccess = () => resolve(req.result?.data || null)
    req.onerror = () => resolve(null)
  })
}

export async function setValue(key, data) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.put({ key: `_val:${key}`, table: '_vals', data })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function migrateFromLocalStorage() {
  const migrated = await getValue(MIGRATED_KEY)
  if (migrated) return
  let hasData = false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('gc_local_') && !k.startsWith('gc_local__meta_') && !k.startsWith('gc_local__')) {
      hasData = true
      break
    }
  }
  if (!hasData) {
    await setValue(MIGRATED_KEY, true)
    return
  }
  const tables = new Set()
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('gc_local_') && !k.startsWith('gc_local__meta_') && !k.startsWith('gc_local__')) {
      tables.add(k.replace('gc_local_', ''))
    }
  }
  for (const table of tables) {
    try {
      const data = JSON.parse(localStorage.getItem('gc_local_' + table) || '[]')
      if (data.length > 0) await saveTable(table, data)
    } catch {}
  }
  for (const table of tables) {
    try {
      const metaKey = 'gc_local__meta_' + table
      const meta = JSON.parse(localStorage.getItem(metaKey) || '{}')
      if (Object.keys(meta).length > 0) await setMetaValue(table, meta)
    } catch {}
  }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('gc_local_')) localStorage.removeItem(k)
  }
  await setValue(MIGRATED_KEY, true)
}
