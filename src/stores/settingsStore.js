import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { setCurrencyConfig } from '../utils/format'

function applyCurrency(currency, symbol, decimals) {
  setCurrencyConfig({ currency, symbol, decimals })
}

export const useSettingsStore = create((set) => ({
  currency: 'DZD',
  currencySymbol: 'د.ج',
  currencyDecimals: 2,
  isLoading: false,

  load: async (storeId) => {
    if (!storeId) return
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('store_profiles')
        .select('currency, currency_symbol, currency_decimals')
        .eq('id', storeId)
        .single()
      if (!error && data) {
        const c = data.currency || 'DZD'
        const s = data.currency_symbol || 'د.ج'
        const d = data.currency_decimals ?? 2
        set({ currency: c, currencySymbol: s, currencyDecimals: d })
        applyCurrency(c, s, d)
      }
    } catch { /* ignore */ }
    set({ isLoading: false })
  },

  updateCurrency: async (storeId, { currency, currencySymbol, currencyDecimals }) => {
    const { error } = await supabase
      .from('store_profiles')
      .update({ currency, currency_symbol: currencySymbol, currency_decimals: currencyDecimals })
      .eq('id', storeId)
    if (error) throw error
    set({ currency, currencySymbol, currencyDecimals })
    applyCurrency(currency, currencySymbol, currencyDecimals)
  },
}))
