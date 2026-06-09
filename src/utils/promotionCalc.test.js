import { describe, it, expect } from 'vitest'
import { calculatePromotionDiscount } from './promotionCalc'

describe('calculatePromotionDiscount', () => {
  it('returns 0 for no promotion', () => {
    expect(calculatePromotionDiscount([{ product_id: 'p1', unit_price: 100, qty: 1 }], null)).toBe(0)
  })

  it('returns 0 for empty cart', () => {
    const promo = { promo_type: 'percent_off', discount_value: 10 }
    expect(calculatePromotionDiscount([], promo)).toBe(0)
  })

  it('calculates percent_off for target product', () => {
    const cart = [{ product_id: 'p1', unit_price: 100, qty: 2 }]
    const promo = { promo_type: 'percent_off', discount_value: 10, target_product_id: 'p1' }
    expect(calculatePromotionDiscount(cart, promo)).toBe(20)
  })

  it('returns 0 when target product not in cart', () => {
    const cart = [{ product_id: 'p2', unit_price: 100, qty: 1 }]
    const promo = { promo_type: 'percent_off', discount_value: 10, target_product_id: 'p1' }
    expect(calculatePromotionDiscount(cart, promo)).toBe(0)
  })

  it('calculates BOGO discount', () => {
    const cart = [{ product_id: 'p1', unit_price: 50, qty: 3 }]
    const promo = { promo_type: 'bogo', target_product_id: 'p1', bogo_buy_qty: 2, bogo_get_qty: 1 }
    expect(calculatePromotionDiscount(cart, promo)).toBe(50)
  })

  it('returns 0 when BOGO qty too low', () => {
    const cart = [{ product_id: 'p1', unit_price: 50, qty: 1 }]
    const promo = { promo_type: 'bogo', target_product_id: 'p1', bogo_buy_qty: 2, bogo_get_qty: 1 }
    expect(calculatePromotionDiscount(cart, promo)).toBe(0)
  })

  it('respects min_cart_total', () => {
    const cart = [{ product_id: 'p1', unit_price: 50, qty: 1 }]
    const promo = { promo_type: 'percent_off', discount_value: 10, target_product_id: 'p1', min_cart_total: '100' }
    expect(calculatePromotionDiscount(cart, promo)).toBe(0)
  })

  it('calculates percent_off_category for category products', () => {
    const cart = [
      { product_id: 'p1', unit_price: 100, qty: 2 },
      { product_id: 'p2', unit_price: 50, qty: 1 },
    ]
    const catMap = { p1: 'cat1', p2: 'cat2' }
    const promo = { promo_type: 'percent_off_category', discount_value: 10, target_category_id: 'cat1' }
    expect(calculatePromotionDiscount(cart, promo, catMap)).toBe(20)
  })
})
