import { createDemoClient, seedDemoData } from '../../lib/demoDb'

const DEMO_KEYS = ['greencrown_demo_products', 'greencrown_demo_categories', 'greencrown_demo_store_profiles',
  'greencrown_demo_sales', 'greencrown_demo_return_notes', 'greencrown_demo_invoice_sequences',
  'greencrown_demo_customers', 'greencrown_demo_suppliers', 'greencrown_demo_purchases',
  'greencrown_demo_sessions', 'greencrown_demo_holds', 'greencrown_demo']

export function enterDemoMode(businessType) {
  const storeId = crypto.randomUUID ? crypto.randomUUID() : 'demo-' + Date.now()
  seedDemoData(storeId, businessType)
  window.__DEMO_CLIENT__ = createDemoClient(storeId)
  window.__DEMO_MODE__ = true
  window.__DEMO_STORE_ID__ = storeId
}

export function exitDemoMode() {
  DEMO_KEYS.forEach(k => localStorage.removeItem(k))
  delete window.__DEMO_MODE__
  delete window.__DEMO_CLIENT__
  delete window.__DEMO_STORE_ID__
}
