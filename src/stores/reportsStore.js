import { create } from 'zustand'

export const useReportsStore = create((set, get) => ({
  isAuthenticated: false,
  authTimestamp: null,
  activeTab: 'dashboard',
  dateFilter: 'today',
  customFrom: null,
  customTo: null,

  setAuthenticated: () => set({ isAuthenticated: true, authTimestamp: Date.now() }),

  checkAccess: () => {
    const { isAuthenticated, authTimestamp } = get()
    if (!isAuthenticated) return false
    // 15 minute timeout
    if (Date.now() - authTimestamp > 15 * 60 * 1000) {
      set({ isAuthenticated: false, authTimestamp: null })
      return false
    }
    return true
  },

  branchFilter: null,

  setTab: (tab) => set({ activeTab: tab }),
  setDateFilter: (f) => set({ dateFilter: f }),
  setBranchFilter: (branchId) => set({ branchFilter: branchId }),
  setCustomRange: (from, to) => set({ customFrom: from, customTo: to }),
  resetAuth: () => set({ isAuthenticated: false, authTimestamp: null }),
}))
