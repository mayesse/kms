import { getValue, setValue } from '../lib/adapters/db'

let _cachedId = null

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
}

export async function getMachineId() {
  if (_cachedId) return _cachedId
  try {
    _cachedId = await Promise.race([getValue('machine_id'), timeout(3000)])
  } catch {
    _cachedId = localStorage.getItem('gc_machine_id')
  }
  return _cachedId
}

export async function ensureMachineId() {
  let id = await getMachineId()
  if (!id) {
    id = crypto.randomUUID()
    try {
      await Promise.race([setValue('machine_id', id), timeout(3000)])
    } catch {
      localStorage.setItem('gc_machine_id', id)
    }
    _cachedId = id
  }
  return id
}

export async function resetMachineId() {
  _cachedId = null
  localStorage.removeItem('gc_machine_id')
}
