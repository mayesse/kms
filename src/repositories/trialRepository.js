import { supabase } from '../lib/supabase'

export async function createTrial(storeId) {
  const { data, error } = await supabase.rpc('create_trial', { p_store_id: storeId })
  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('trials')
      .insert({ store_id: storeId })
      .select()
      .single()
    if (fallbackError) throw fallbackError
    return fallback
  }
  return data
}

export async function checkTrialLimit(storeId, resourceType) {
  const { data: trial, error } = await supabase
    .from('trials')
    .select('*')
    .eq('store_id', storeId)
    .single()
  if (error || !trial) return
  if (new Date() > new Date(trial.expires_at)) {
    throw new Error('Trial period has expired. Please upgrade to continue.')
  }
  let count = 0
  const table = resourceType === 'products' ? 'products'
    : resourceType === 'sales' ? 'sales'
    : resourceType === 'suppliers' ? 'suppliers' : null
  if (table) {
    const { count: c } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('store_id', storeId)
    count = c || 0
  }
  const limitKey = resourceType === 'products' ? 'products_limit'
    : resourceType === 'sales' ? 'sales_limit'
    : 'suppliers_limit'
  const limit = trial[limitKey]
  if (count >= limit) {
    throw new Error(`Trial limit reached for ${resourceType} (${count}/${limit}). Please upgrade to add more.`)
  }
}

export async function getTrialInfo(storeId) {
  const { data, error } = await supabase.rpc('get_trial_info', { p_store_id: storeId })
  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('trials')
      .select('*')
      .eq('store_id', storeId)
      .single()
    if (fallbackError || !fallback) return { hasTrial: false }
    return {
      hasTrial: true,
      startedAt: fallback.started_at,
      expiresAt: fallback.expires_at,
      remainingDays: Math.max(0, Math.floor((new Date(fallback.expires_at) - new Date()) / 86400000)),
      isExpired: new Date() > new Date(fallback.expires_at),
      usage: { products: 0, sales: 0, suppliers: 0 },
      limits: {
        products: fallback.products_limit,
        sales: fallback.sales_limit,
        suppliers: fallback.suppliers_limit,
      },
    }
  }
  return data
}
