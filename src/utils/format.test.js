import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatPhone, truncateText } from './format'

describe('formatCurrency', () => {
  it('formats numbers with default currency', () => {
    const result = formatCurrency(1500)
    expect(result).toContain('1')
    expect(result).toContain('500')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBeTruthy()
  })

  it('handles decimal values', () => {
    const result = formatCurrency(99.99)
    expect(result).toContain('99')
  })

  it('handles negative values', () => {
    const result = formatCurrency(-50)
    expect(result).toContain('-')
  })

  it('handles string numbers', () => {
    const result = formatCurrency('2500')
    expect(result).toContain('2')
  })
})

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2026-06-04T12:00:00Z')
    expect(result).toBeTruthy()
  })

  it('handles Date object', () => {
    const result = formatDate(new Date('2026-01-15'))
    expect(result).toBeTruthy()
  })

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })
})

describe('formatPhone', () => {
  it('formats Algerian phone number', () => {
    const result = formatPhone('0555123456')
    expect(result).toContain('0555')
  })

  it('returns empty for empty input', () => {
    expect(formatPhone('')).toBe('')
  })
})

describe('truncateText', () => {
  it('truncates long text', () => {
    const result = truncateText('Hello World This Is Long', 10)
    expect(result.length).toBeLessThanOrEqual(13)
  })

  it('does not truncate short text', () => {
    expect(truncateText('Hi', 10)).toBe('Hi')
  })

  it('handles empty string', () => {
    expect(truncateText('', 5)).toBe('')
  })
})
