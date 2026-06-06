import { useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'pos-weight-scale-listening'

export function getScaleListeningEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setScaleListeningEnabled(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch { /* ignore */ }
}

/**
 * Keyboard-wedge scale stub: scale types weight + Enter (e.g. "1.250").
 * Ignores input when user is typing in a field (unless data-scale-capture).
 */
export function useWeightScaleStub({ enabled, active, onWeight }) {
  const bufferRef = useRef('')
  const timerRef = useRef(null)

  const flush = useCallback(() => {
    const raw = bufferRef.current.trim()
    bufferRef.current = ''
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!raw) return
    const val = parseFloat(raw.replace(',', '.'))
    if (!Number.isNaN(val) && val > 0) onWeight(val)
  }, [onWeight])

  useEffect(() => {
    if (!enabled || !active) return undefined

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase?.()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable
      if (isTyping && !target?.dataset?.scaleCapture) return

      if (e.key === 'Enter') {
        e.preventDefault()
        flush()
        return
      }

      if (e.key.length === 1 && /[0-9.,]/.test(e.key)) {
        bufferRef.current += e.key
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          bufferRef.current = ''
          timerRef.current = null
        }, 400)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, active, flush])

  return { flush }
}
