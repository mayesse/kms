import { hasFeature, F } from './businessTypes'

/** Product needs weight entry when flagged on product or store type supports weight POS. */
export function productNeedsWeight(product, businessTypeId) {
  if (!product || product.product_units?.length > 0) return false
  if (product.is_weight_based) return true
  return hasFeature(businessTypeId, F.WEIGHT_PRODUCTS)
}
