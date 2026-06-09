// Global currency config — updated by settingsStore on app init
let _currency = 'DZD'
let _decimals = 2
let _symbol = null

export function setCurrencyConfig({ currency, decimals, symbol }) {
  if (currency !== undefined) _currency = currency
  if (decimals !== undefined) _decimals = decimals
  if (symbol !== undefined) _symbol = symbol
}

// Number formatting — defaults to DZD, override via settings or setCurrencyConfig
export const formatCurrency = (amount, opts = {}) => {
  const currency = opts.currency ?? _currency
  const decimals = opts.decimals ?? _decimals
  const symbol = opts.symbol ?? _symbol
  if (symbol) {
    const formatted = new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount || 0)
    return `${formatted} ${symbol}`
  }
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount || 0)
}

// Quantity: 1 234
export const formatQty = (qty) =>
  new Intl.NumberFormat('ar-DZ').format(qty || 0)

// Percentage: 12,5%
export const formatPercent = (value) =>
  new Intl.NumberFormat('ar-DZ', {
    style: 'percent',
    minimumFractionDigits: 1,
  }).format((value || 0) / 100)

// Short date: 07/04/2024
export const formatDate = (date) => {
  try {
    if (!date) return '—'
    const d = new Date(date)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ar-DZ').format(d)
  } catch { return '—' }
}

// Full date: الاثنين 07 أبريل 2024
export const formatDateFull = (date) =>
  new Intl.DateTimeFormat('ar-DZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))

// Time: 14:32
export const formatTime = (date) => {
  try {
    if (!date) return '—'
    const d = new Date(date)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ar-DZ', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch { return '—' }
}

// Time ago (relative)
export const timeAgo = (date) => {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  return `منذ ${diffDays} يوم`
}
