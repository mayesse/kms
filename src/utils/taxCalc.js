/** Prices in cart are HT; tax is added on top (TVA). */
export function calculateTaxFromHt(subtotalHt, ratePercent) {
  const ht = parseFloat(subtotalHt) || 0
  const rate = parseFloat(ratePercent) || 0
  if (ht <= 0 || rate <= 0) {
    return { subtotalHt: ht, taxAmount: 0, totalTtc: ht }
  }
  const taxAmount = Math.round(ht * rate / 100 * 100) / 100
  return {
    subtotalHt: ht,
    taxAmount,
    totalTtc: Math.round((ht + taxAmount) * 100) / 100,
  }
}
