import { describe, it, expect } from 'vitest'
import { calculateTaxFromHt } from './taxCalc'

describe('calculateTaxFromHt', () => {
  it('calculates 19% tax on HT amount', () => {
    const result = calculateTaxFromHt(1000, 19)
    expect(result.subtotalHt).toBe(1000)
    expect(result.taxAmount).toBe(190)
    expect(result.totalTtc).toBe(1190)
  })

  it('calculates 9% tax correctly', () => {
    const result = calculateTaxFromHt(500, 9)
    expect(result.taxAmount).toBe(45)
    expect(result.totalTtc).toBe(545)
  })

  it('returns zero tax for 0% rate', () => {
    const result = calculateTaxFromHt(1000, 0)
    expect(result.taxAmount).toBe(0)
    expect(result.totalTtc).toBe(1000)
  })

  it('returns zero for zero amount', () => {
    const result = calculateTaxFromHt(0, 19)
    expect(result.taxAmount).toBe(0)
    expect(result.totalTtc).toBe(0)
  })

  it('handles string inputs', () => {
    const result = calculateTaxFromHt('200', '19')
    expect(result.taxAmount).toBe(38)
  })

  it('handles decimal values', () => {
    const result = calculateTaxFromHt(99.99, 19)
    expect(result.taxAmount).toBeGreaterThan(0)
    expect(result.totalTtc).toBeGreaterThan(99.99)
  })
})
