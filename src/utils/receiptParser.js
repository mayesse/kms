/**
 * Parses pasted receipt text into structured purchase items.
 * Supports common formats used in Algerian "bons d'achat":
 *
 * Format 1: tab/space separated
 *   Produit A    10    150.00    1,500.00
 *
 * Format 2: pipe separated
 *   Produit A | 10 | 150.00 | 1,500.00
 *
 * Returns array of { product_name, quantity, unit_price, total }
 */
export function parseReceiptText(text) {
  if (!text || typeof text !== 'string') return []

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  // Heuristic: skip header lines that look like column titles
  const headerKeywords = ['produit', 'product', 'اسم', 'المنتج', 'الكمية', 'qte', 'qty',
    'prix', 'price', 'سعر', 'total', 'المجموع', 'désignation', 'désignation']

  const results = []

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Skip header lines
    if (headerKeywords.some(k => lower.startsWith(k))) continue

    // Skip lines that are just dashes or separators
    if (/^[-=*|_ ]+$/.test(line)) continue

    // Skip pure number lines
    if (/^[\d,. ]+$/.test(line)) continue

    // Try parsing: split by pipe first, then by multiple spaces/tabs
    let parts

    if (line.includes('|')) {
      parts = line.split('|').map(s => s.trim()).filter(Boolean)
    } else {
      parts = line.split(/\t+| {3,}/).map(s => s.trim()).filter(Boolean)
    }

    if (parts.length < 2) continue

    // Try to find numeric parts from the end
    // Expected: [name, qty?, unit_price?, total]
    // Or: [name, unit_price, total] (qty = 1 implied)
    const numericParts = []
    const textParts = []

    for (const p of parts) {
      const cleaned = p.replace(/[,\s]/g, '').replace(/د\.ج|dzd|da|دج/gi, '').trim()
      if (/^[\d.]+$/.test(cleaned) && parseFloat(cleaned) > 0) {
        numericParts.push(parseFloat(cleaned))
      } else {
        textParts.push(p)
      }
    }

    if (textParts.length === 0) continue

    const product_name = textParts.join(' ').trim()
    if (!product_name) continue

    let quantity = 1
    let unit_price = 0
    let total = 0

    if (numericParts.length === 3) {
      [quantity, unit_price, total] = numericParts
    } else if (numericParts.length === 2) {
      // Could be [qty, total] or [unit_price, total]
      // Heuristic: if first number is small integer (< 1000), it's likely qty
      if (numericParts[0] < 1000 && Number.isInteger(numericParts[0])) {
        quantity = numericParts[0]
        total = numericParts[1]
        unit_price = quantity > 0 ? total / quantity : 0
      } else {
        unit_price = numericParts[0]
        total = numericParts[1]
        quantity = unit_price > 0 ? Math.round(total / unit_price) : 1
      }
    } else if (numericParts.length === 1) {
      total = numericParts[0]
      unit_price = total
    }

    results.push({
      product_name,
      quantity: Math.max(1, Math.round(quantity)),
      unit_price: Math.max(0, unit_price),
      total: Math.max(0, total),
    })
  }

  return results
}
