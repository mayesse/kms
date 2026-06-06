import { useSettingsStore } from '../stores/settingsStore'
import { formatCurrency as formatCurrencyUtil } from '../utils/format'

export function useCurrency() {
  const currency = useSettingsStore(s => s.currency)
  const currencySymbol = useSettingsStore(s => s.currencySymbol)
  const currencyDecimals = useSettingsStore(s => s.currencyDecimals)

  const formatCurrency = (amount) =>
    formatCurrencyUtil(amount, {
      currency,
      decimals: currencyDecimals,
      symbol: currencySymbol,
    })

  return { formatCurrency, currency, currencySymbol, currencyDecimals }
}
