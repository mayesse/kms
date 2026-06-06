import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import BottomSheet from './BottomSheet'
import { useTranslation } from 'react-i18next'

const SCANNER_STYLE_OVERRIDES = `
  #barcode-reader {
    border: none !important;
  }
  #barcode-reader video,
  #barcode-reader canvas {
    object-fit: cover !important;
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    top: 0 !important;
    inset-inline-start: 0 !important;
  }
`

function normalizeCameraError(error) {
  const name = error?.name || ''

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Please allow camera access to scan barcodes.'
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No back camera was found on this device.'
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is already in use by another app or browser tab.'
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'This camera does not support the requested HD scanning settings.'
  }

  return 'Unable to start the camera. Please check camera permissions and try again.'
}

function formatKeyFromBarcodeFormat(format) {
  switch (format) {
    case BarcodeFormat.EAN_13:
      return 'ean_13'
    case BarcodeFormat.EAN_8:
      return 'ean_8'
    case BarcodeFormat.UPC_A:
      return 'upc_a'
    case BarcodeFormat.CODE_128:
      return 'code_128'
    case BarcodeFormat.CODE_39:
      return 'code_39'
    default:
      return ''
  }
}

function normalizeDetectedCode(code, format) {
  const value = String(code || '').trim()
  const normalizedFormat = String(format || '').toLowerCase()

  if (!value) return ''

  if ((normalizedFormat === 'ean_13' || normalizedFormat === 'ean-13') && /^\d{13}$/.test(value)) {
    return value
  }

  /* UPC-A is often stored as EAN-13 with a leading 0 */
  if ((normalizedFormat === 'upc_a' || normalizedFormat === 'upc-a') && /^\d{12}$/.test(value)) {
    return `0${value}`
  }

  if ((normalizedFormat === 'ean_8' || normalizedFormat === 'ean-8') && /^\d{8}$/.test(value)) {
    return value
  }

  /* Accept CODE_128 and CODE_39 as-is (alphanumeric barcodes) */
  if (normalizedFormat === 'code_128' || normalizedFormat === 'code_39' ||
      normalizedFormat === 'code-128' || normalizedFormat === 'code-39') {
    return value.length >= 4 ? value : ''
  }

  return ''
}

function stopMediaStream(stream) {
  stream?.getTracks?.().forEach(track => track.stop())
}

/**
 * Creates a ZXing reader optimized for SPEED over accuracy.
 * - Removed TRY_HARDER (was causing 3-10s delays)
 * - Added more barcode formats
 * - Minimal time between decode attempts
 */
function createZxingReader() {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
  ])
  // NOTE: TRY_HARDER intentionally removed — it caused 3-10x slower scans
  // by running multiple passes over the image. Speed > edge-case accuracy.

  const reader = new BrowserMultiFormatReader(hints, 0)
  reader.timeBetweenDecodingAttempts = 0
  return reader
}

/**
 * Camera constraints optimized for barcode scanning:
 * - High resolution for better detection at distance
 * - Continuous autofocus for instant focus lock
 * - Environment-facing camera
 */
const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { min: 640, ideal: 1920 },
    height: { min: 480, ideal: 1080 },
    // Request continuous autofocus if available (critical for speed)
    focusMode: { ideal: 'continuous' },
  },
}

export default function BarcodeScanner({ isOpen, onClose, onScan }) {
  const { t } = useTranslation()
  const scannerRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onScanRef = useRef(onScan)
  const mountedRef = useRef(true)
  const detectedRef = useRef(false)
  const initializingRef = useRef(false)
  const runningRef = useRef(false)
  const audioContextRef = useRef(null)
  const startTokenRef = useRef(0)
  const nativeLoopRef = useRef(null)
  const nativeStreamRef = useRef(null)
  const scanModeRef = useRef('idle')
  const zxingReaderRef = useRef(null)
  const scannedCodesRef = useRef([])
  const zxingLoopRef = useRef(null)

  const [scanStatus, setScanStatus] = useState('idle')
  const [scanError, setScanError] = useState(null)
  const [scanEngine, setScanEngine] = useState('')
  const [scannedCodes, setScannedCodes] = useState([])

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const playBeep = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = audioContextRef.current || new AudioContextClass()
    audioContextRef.current = audioContext

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 1200
    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.14)
  }, [])

  const acceptScan = useCallback((code) => {
    if (!runningRef.current || detectedRef.current || !code) return

    // Ignore same barcode scanned within 2 seconds
    const now = Date.now()
    const prev = scannedCodesRef.current
    if (prev.length > 0) {
      const last = prev[prev.length - 1]
      if (last.code === code && now - last.timestamp < 2000) return
    }

    detectedRef.current = true
    playBeep()

    const entry = { code, timestamp: now, id: `${now}-${Math.random()}` }
    scannedCodesRef.current = [...scannedCodesRef.current, entry]
    setScannedCodes(prev => [...prev, entry])

    // After cooldown, allow the next barcode to be scanned
    setTimeout(() => {
      if (mountedRef.current) detectedRef.current = false
    }, 600) // Reduced from 800ms for faster multi-scan
  }, [playBeep])

  const stopAndClear = useCallback(async () => {
    if (nativeLoopRef.current) {
      window.clearInterval(nativeLoopRef.current)
      nativeLoopRef.current = null
    }

    if (zxingLoopRef.current) {
      window.cancelAnimationFrame(zxingLoopRef.current)
      zxingLoopRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.pause?.()
      videoRef.current.srcObject = null
    }

    stopMediaStream(nativeStreamRef.current)
    nativeStreamRef.current = null

    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset()
      } catch {
        //
      }
      zxingReaderRef.current = null
    }

    runningRef.current = false
    initializingRef.current = false
    scanModeRef.current = 'idle'
    setScanEngine('')

    if (scannerRef.current) {
      scannerRef.current.innerHTML = ''
    }
  }, [])

  const resetScanner = useCallback(async () => {
    await stopAndClear()
    detectedRef.current = false
    scannedCodesRef.current = []
    if (mountedRef.current) {
      setScannedCodes([])
      setScanError(null)
      setScanStatus('idle')
    }
  }, [stopAndClear])

  /**
   * Apply autofocus constraints to the video track if supported.
   * This is the #1 factor for instant scanning — without continuous
   * autofocus the camera takes 2-5 seconds to focus on the barcode.
   */
  const applyAutoFocus = useCallback((stream) => {
    try {
      const track = stream.getVideoTracks()[0]
      if (!track) return

      const capabilities = track.getCapabilities?.()
      if (capabilities?.focusMode?.includes?.('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
      }

      // Also try to enable torch for low-light conditions
      if (capabilities?.torch) {
        // Don't enable by default — just log it's available
        // Can be toggled by user in future
      }
    } catch {
      // Constraints not supported — that's fine
    }
  }, [])

  const startNativeScanner = useCallback(async (token) => {
    const BarcodeDetectorClass = window.BarcodeDetector
    if (!BarcodeDetectorClass) return false

    const supportedFormats = typeof BarcodeDetectorClass.getSupportedFormats === 'function'
      ? await BarcodeDetectorClass.getSupportedFormats()
      : ['ean_13']

    const wantedFormats = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39']
    const formats = wantedFormats.filter(format => supportedFormats.includes(format))
    if (formats.length === 0) return false

    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)

    if (!mountedRef.current || !isOpen || startTokenRef.current !== token) {
      stopMediaStream(stream)
      return true
    }

    // Apply continuous autofocus
    applyAutoFocus(stream)

    const video = document.createElement('video')
    video.setAttribute('playsinline', 'true')
    video.setAttribute('muted', 'true')
    video.autoplay = true
    video.muted = true
    video.srcObject = stream

    scannerRef.current.innerHTML = ''
    scannerRef.current.appendChild(video)
    videoRef.current = video
    nativeStreamRef.current = stream

    await video.play()

    const detector = new BarcodeDetectorClass({ formats })
    scanModeRef.current = 'native'
    runningRef.current = true
    setScanEngine('Native')
    setScanStatus('running')

    // Poll at 60ms (≈16fps) for near-instant detection
    nativeLoopRef.current = window.setInterval(async () => {
      if (!runningRef.current || detectedRef.current || scanModeRef.current !== 'native') return
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return

      try {
        const detections = await detector.detect(video)
        for (const detection of detections) {
          const code = normalizeDetectedCode(detection.rawValue, detection.format)
          if (code) {
            acceptScan(code)
            return
          }
        }
      } catch {
        //
      }
    }, 60) // Reduced from 100ms → 60ms for faster scanning

    return true
  }, [acceptScan, isOpen, applyAutoFocus])

  /**
   * ZXing fallback with manual frame-grabbing via canvas.
   * Instead of using decodeFromConstraints (which has internal delays),
   * we grab frames from the video ourselves and decode them directly.
   * This gives us full control over the scan loop timing.
   */
  const startZxingScanner = useCallback(
    async (token) => {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)

      if (!mountedRef.current || !isOpen || startTokenRef.current !== token) {
        stopMediaStream(stream)
        return
      }

      // Apply continuous autofocus
      applyAutoFocus(stream)

      const video = document.createElement('video')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('muted', 'true')
      video.muted = true
      video.autoplay = true
      video.className = 'absolute inset-0 w-full h-full object-cover'
      video.srcObject = stream

      scannerRef.current.innerHTML = ''
      scannerRef.current.appendChild(video)
      videoRef.current = video
      nativeStreamRef.current = stream

      await video.play()

      const reader = createZxingReader()
      zxingReaderRef.current = reader

      // Create an offscreen canvas for frame grabbing
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      canvasRef.current = canvas

      scanModeRef.current = 'zxing'
      runningRef.current = true
      initializingRef.current = false
      setScanEngine('ZXing')
      setScanStatus('running')

      let lastDecodeTime = 0
      const MIN_DECODE_INTERVAL = 30 // Decode every 30ms max

      /**
       * Manual scan loop using requestAnimationFrame.
       * Grabs the current video frame, draws it to a canvas,
       * and feeds it to ZXing for decoding. This bypasses
       * ZXing's internal timing and gives us ~30fps scan rate.
       */
      const scanLoop = (timestamp) => {
        if (!runningRef.current || !mountedRef.current || scanModeRef.current !== 'zxing') return
        if (startTokenRef.current !== token) return

        zxingLoopRef.current = requestAnimationFrame(scanLoop)

        if (detectedRef.current) return
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
        if (timestamp - lastDecodeTime < MIN_DECODE_INTERVAL) return

        lastDecodeTime = timestamp

        const vw = video.videoWidth
        const vh = video.videoHeight
        if (!vw || !vh) return

        // Scan the full frame for maximum detection area
        canvas.width = vw
        canvas.height = vh
        ctx.drawImage(video, 0, 0, vw, vh)

        try {
          // Use ZXing's low-level API to decode directly from canvas pixels
          const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas)
          const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
          const result = reader.decodeBitmap(binaryBitmap)
          if (result) {
            const code = normalizeDetectedCode(
              result.getText(),
              formatKeyFromBarcodeFormat(result.getBarcodeFormat()),
            )
            if (code) {
              acceptScan(code)
            }
          }
        } catch {
          // No barcode found in this frame — that's normal, try next frame
        }
      }

      zxingLoopRef.current = requestAnimationFrame(scanLoop)
    },
    [acceptScan, isOpen, applyAutoFocus],
  )

  const startScanner = useCallback(async () => {
    if (runningRef.current || initializingRef.current) return

    setScanError(null)
    setScanStatus('starting')
    setScanEngine('')
    detectedRef.current = false
    initializingRef.current = true

    const token = startTokenRef.current + 1
    startTokenRef.current = token

    await new Promise(resolve => setTimeout(resolve, 150)) // Reduced from 200ms

    if (!mountedRef.current || !isOpen || !scannerRef.current || startTokenRef.current !== token) {
      initializingRef.current = false
      return
    }

    await stopAndClear()

    if (!mountedRef.current || !isOpen || !scannerRef.current) return

    startTokenRef.current = token
    initializingRef.current = true

    try {
      const nativeStarted = await startNativeScanner(token)
      if (nativeStarted) {
        initializingRef.current = false
        return
      }
    } catch (error) {
      stopMediaStream(nativeStreamRef.current)
      nativeStreamRef.current = null
      console.warn('Native scanner unavailable, falling back to ZXing:', error)
    }

    try {
      await startZxingScanner(token)
    } catch (error) {
      console.error('ZXing scanner start error:', error)
      initializingRef.current = false
      runningRef.current = false
      scanModeRef.current = 'idle'
      setScanStatus('error')
      setScanError({ message: normalizeCameraError(error), original: error })
    }
  }, [isOpen, startNativeScanner, startZxingScanner, stopAndClear])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void stopAndClear()
      audioContextRef.current?.close?.()
      audioContextRef.current = null
    }
  }, [stopAndClear])

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => void resetScanner())
      return
    }

    queueMicrotask(() => {
      if (!mountedRef.current || !isOpen) return
      void startScanner()
    })

    return () => {
      void stopAndClear()
    }
  }, [isOpen, resetScanner, startScanner, stopAndClear])

  useEffect(() => {
    if (!isOpen) return

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        void stopAndClear()
      } else {
        void startScanner()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stopAndClear)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', stopAndClear)
    }
  }, [isOpen, startScanner, stopAndClear])

  const handleValidate = useCallback(() => {
    const codes = scannedCodesRef.current.map(s => s.code)
    if (codes.length === 0) return
    void resetScanner()
    onScanRef.current?.(codes)
    onClose()
  }, [resetScanner, onClose])

  const removeScannedCode = useCallback((id) => {
    scannedCodesRef.current = scannedCodesRef.current.filter(s => s.id !== id)
    setScannedCodes(prev => prev.filter(s => s.id !== id))
  }, [])

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        void resetScanner()
        onClose()
      }}
      title={t('pos.scanBarcode')}
      large
    >
      <style>{SCANNER_STYLE_OVERRIDES}</style>

      <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black aspect-[4/3] shadow-inner">
        <div
          id="barcode-reader"
          ref={scannerRef}
          className="absolute inset-0 w-full h-full"
          style={{ overflow: 'hidden' }}
        />

        {/* Full-frame scanning overlay — no restrictive box */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Subtle corner brackets to guide (but not restrict) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[280px] h-[160px] sm:w-[320px] sm:h-[190px]">
              <div className="absolute -top-[3px] -start-[3px] w-8 h-8 border-t-[3px] border-s-[3px] border-green-400 rounded-ss-xl" />
              <div className="absolute -top-[3px] -end-[3px] w-8 h-8 border-t-[3px] border-e-[3px] border-green-400 rounded-se-xl" />
              <div className="absolute -bottom-[3px] -start-[3px] w-8 h-8 border-b-[3px] border-s-[3px] border-green-400 rounded-es-xl" />
              <div className="absolute -bottom-[3px] -end-[3px] w-8 h-8 border-b-[3px] border-e-[3px] border-green-400 rounded-ee-xl" />

              {/* Pulsing green scan line instead of slow red sweep */}
              {scanStatus === 'running' && (
                <motion.div
                  initial={{ top: '10%', opacity: 0 }}
                  animate={{
                    top: ['10%', '90%', '10%'],
                    opacity: [0.5, 1, 1, 0.5],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute start-2 end-2 h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_12px_4px_rgba(74,222,128,0.6)]"
                />
              )}
            </div>
          </div>

          {/* "Auto-detect" badge */}
          {scanStatus === 'running' && (
            <div className="absolute top-2 start-2 z-20 rounded-full bg-green-500/80 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {t('pos.autoScan')}
            </div>
          )}
        </div>

        {/* Scanned count badge */}
        {scannedCodes.length > 0 && (
          <div className="absolute top-2 end-2 z-20 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            {scannedCodes.length} ✓
          </div>
        )}

        {scanEngine && scanStatus === 'running' && (
          <div className="absolute bottom-2 start-2 z-20 rounded-md bg-black/55 px-2 py-1 text-[10px] font-semibold text-white/75">
            {scanEngine}
          </div>
        )}

        {scanStatus === 'starting' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/80 font-medium">{t('pos.scanHoldStill')}</p>
            </div>
          </div>
        )}

        {scanStatus === 'error' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white/10 backdrop-blur px-4 py-4 text-center">
              <p className="text-sm font-semibold text-white">{t('common.error')}</p>
              <p className="mt-1 text-xs text-white/80" dir="ltr">
                {String(scanError?.message || 'Camera error')}
              </p>
              <button
                onClick={() => void startScanner()}
                className="mt-3 w-full rounded-xl bg-green-600 py-2 text-sm font-bold text-white active:scale-95 transition-transform"
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">{t('pos.scanMultipleHint')}</p>

      {/* Scanned codes list */}
      <div className="mt-3">
        {scannedCodes.length === 0 ? (
          <div className="flex items-center justify-center py-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="text-sm text-gray-400">{t('pos.noScansYet')}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              {t('pos.scannedCount', { count: scannedCodes.length })}
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <AnimatePresence initial={false}>
                {scannedCodes.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 rounded-lg px-3 py-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="flex-1 text-sm font-mono text-gray-700 dark:text-gray-200 truncate">
                      {s.code}
                    </span>
                    <button
                      onClick={() => removeScannedCode(s.id)}
                      className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Validate button */}
      <button
        onClick={handleValidate}
        disabled={scannedCodes.length === 0}
        className="mt-4 w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
      >
        {scannedCodes.length > 0
          ? `${t('pos.validateScans')} (${scannedCodes.length})`
          : t('pos.validateScans')}
      </button>
    </BottomSheet>
  )
}
