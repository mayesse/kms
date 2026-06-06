/**
 * Calculate promotion discount amount for a cart.
 * cart items: { product_id, unit_price, qty, category_id? }
 */
export function calculatePromotionDiscount(cart, promotion, productCategoryMap = {}) {
  if (!promotion || !cart?.length) return 0

  const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0)
  if (subtotal < parseFloat(promotion.min_cart_total || 0)) return 0

  const type = promotion.promo_type
  const value = parseFloat(promotion.discount_value || 0)

  if (type === 'percent_off' && promotion.target_product_id) {
    const item = cart.find(i => i.product_id === promotion.target_product_id)
    if (!item) return 0
    return Math.round(item.qty * item.unit_price * value / 100 * 100) / 100
  }

  if (type === 'percent_off_category' && promotion.target_category_id) {
    const catTotal = cart
      .filter(i => productCategoryMap[i.product_id] === promotion.target_category_id)
      .reduce((s, i) => s + i.qty * i.unit_price, 0)
    return Math.round(catTotal * value / 100 * 100) / 100
  }

  if (type === 'bogo' && promotion.target_product_id) {
    const item = cart.find(i => i.product_id === promotion.target_product_id)
    if (!item) return 0
    const buyQty = parseFloat(promotion.bogo_buy_qty || 2)
    const getQty = parseFloat(promotion.bogo_get_qty || 1)
    const sets = Math.floor(item.qty / (buyQty + getQty))
    if (sets <= 0) return 0
    return Math.round(sets * getQty * item.unit_price * 100) / 100
  }

  return 0
}
