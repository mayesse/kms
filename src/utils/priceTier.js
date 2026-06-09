/**
 * Resolve unit price from wholesale price tiers for a given quantity.
 * Picks the tier with the highest min_qty that the cart qty still satisfies.
 */
export function resolveTierPrice(qty, tiers, basePrice) {
  const parsedQty = parseFloat(qty) || 0
  const base = parseFloat(basePrice) || 0
  if (!tiers?.length || parsedQty <= 0) {
    return { unitPrice: base, tierName: null }
  }

  const applicable = tiers
    .filter(t => parsedQty >= parseFloat(t.min_qty || 0))
    .sort((a, b) => parseFloat(b.min_qty || 0) - parseFloat(a.min_qty || 0))

  if (applicable.length === 0) {
    return { unitPrice: base, tierName: null }
  }

  const tier = applicable[0]
  return {
    unitPrice: parseFloat(tier.unit_price),
    tierName: tier.name || `≥${tier.min_qty}`,
  }
}

/** Build a map of productId → tiers[] from flat tier rows */
export function groupTiersByProduct(tiers) {
  const map = {}
  for (const tier of tiers || []) {
    if (!map[tier.product_id]) map[tier.product_id] = []
    map[tier.product_id].push(tier)
  }
  for (const pid of Object.keys(map)) {
    map[pid].sort((a, b) => parseFloat(a.min_qty) - parseFloat(b.min_qty))
  }
  return map
}
