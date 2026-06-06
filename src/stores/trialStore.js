import { create } from 'zustand'
import { getTrialInfo, createTrial } from '../repositories/trialRepository'

export const useTrialStore = create((set, get) => ({
  trial: null,
  usage: { products: 0, sales: 0, suppliers: 0 },
  limits: { products: 50, sales: 50, suppliers: 2 },
  loading: false,

  loadTrial: async (storeId) => {
    if (!storeId) return
    set({ loading: true })
    try {
      const info = await getTrialInfo(storeId)
      if (info && info.hasTrial) {
        set({
          trial: info,
          usage: info.usage || { products: 0, sales: 0, suppliers: 0 },
          limits: info.limits || { products: 50, sales: 50, suppliers: 2 },
          loading: false,
        })
      } else {
        const created = await createTrial(storeId)
        set({
          trial: created,
          limits: { products: 50, sales: 50, suppliers: 2 },
          loading: false,
        })
      }
    } catch {
      set({ loading: false })
    }
  },

  refreshUsage: async (storeId) => {
    if (!storeId) return
    try {
      const info = await getTrialInfo(storeId)
      if (info && info.hasTrial) {
        set({ usage: info.usage || { products: 0, sales: 0, suppliers: 0 } })
      }
    } catch {}
  },

  remainingDays: () => {
    const t = get().trial
    if (!t || !t.expiresAt) return 0
    return Math.max(0, Math.floor((new Date(t.expiresAt) - new Date()) / 86400000))
  },

  isExpired: () => {
    const t = get().trial
    if (!t || !t.expiresAt) return false
    return new Date() > new Date(t.expiresAt)
  },

  canAddProduct: () => {
    const s = get()
    return s.usage.products < s.limits.products
  },

  canAddSale: () => {
    const s = get()
    return s.usage.sales < s.limits.sales
  },

  canAddSupplier: () => {
    const s = get()
    return s.usage.suppliers < s.limits.suppliers
  },
}))
