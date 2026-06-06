/** True when batch expiry date is before today (local date). */
export function isBatchExpired(expiryDate) {
  if (!expiryDate) return false
  const today = new Date().toISOString().slice(0, 10)
  const exp = String(expiryDate).slice(0, 10)
  return exp < today
}

export function getBatchExpiryStatus(expiryDate) {
  if (!expiryDate) return 'ok'
  if (isBatchExpired(expiryDate)) return 'expired'
  const today = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 30)
  const exp = String(expiryDate).slice(0, 10)
  if (exp <= cutoff.toISOString().slice(0, 10)) return 'expiring'
  return 'ok'
}
