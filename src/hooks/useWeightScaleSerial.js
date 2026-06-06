import { useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'pos-weight-scale-serial'

export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

export function getSerialScaleEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSerialScaleEnabled(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch { /* ignore */ }
}

/** Parse common scale output: "1.250", "W 1.250 kg", "S  0.450kg" */
export function parseScaleWeight(text) {
  const match = String(text).replace(',', '.').match(/(\d+\.\d{2,3}|\d+)/)
  if (!match) return null
  const val = parseFloat(match[1])
  return !Number.isNaN(val) && val > 0 ? val : null
}

/**
 * Web Serial API scale reader (USB serial scales on desktop Chrome/Edge).
 * Falls back gracefully when unsupported or disconnected.
 */
export function useWeightScaleSerial({ enabled, active, port, onWeight }) {
  const readerRef = useRef(null)
  const bufferRef = useRef('')

  const flushLine = useCallback((line) => {
    const weight = parseScaleWeight(line)
    if (weight) onWeight(weight)
  }, [onWeight])

  useEffect(() => {
    if (!enabled || !active || !port?.readable) return undefined

    let cancelled = false
    bufferRef.current = ''

    const readLoop = async () => {
      try {
        readerRef.current = port.readable.getReader()
        const decoder = new TextDecoder()

        while (!cancelled) {
          const { value, done } = await readerRef.current.read()
          if (done) break
          if (!value) continue

          bufferRef.current += decoder.decode(value, { stream: true })
          const parts = bufferRef.current.split(/\r?\n/)
          bufferRef.current = parts.pop() || ''

          for (const line of parts) {
            if (line.trim()) flushLine(line.trim())
          }
        }
      } catch {
        /* port closed or unplugged */
      } finally {
        try {
          readerRef.current?.releaseLock()
        } catch { /* ignore */ }
        readerRef.current = null
      }
    }

    readLoop()

    return () => {
      cancelled = true
      try {
        readerRef.current?.cancel()
      } catch { /* ignore */ }
    }
  }, [enabled, active, port, flushLine])

  return null
}

export async function connectSerialScalePort() {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial not supported')
  }

  const port = await navigator.serial.requestPort()
  await port.open({ baudRate: 9600 })
  return port
}

export async function disconnectSerialScalePort(port) {
  if (!port) return
  try {
    if (port.readable?.locked) {
      await port.readable.getReader().cancel()
    }
    await port.close()
  } catch { /* ignore */ }
}
