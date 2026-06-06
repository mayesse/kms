// Web Bluetooth thermal printer utilities
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'

let cachedDevice = null
let cachedCharacteristic = null

export async function connectPrinter() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [PRINTER_SERVICE_UUID] }],
    })

    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
    const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID)

    cachedDevice = device
    cachedCharacteristic = characteristic

    return { success: true, deviceName: device.name }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export function isPrinterConnected() {
  return cachedDevice?.gatt?.connected || false
}

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

const CMD = {
  INIT: [ESC, 0x40],
  CENTER: [ESC, 0x61, 0x01],
  LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_SIZE: [GS, 0x21, 0x11],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x00],
  FEED: [ESC, 0x64, 0x03],
}

function textToBytes(text) {
  return new TextEncoder().encode(text)
}

function buildLine(left, right, width = 32) {
  const space = width - left.length - right.length
  return left + ' '.repeat(Math.max(1, space)) + right
}

export async function printReceipt(saleData, storeProfile, labels) {
  if (!cachedCharacteristic) {
    throw new Error(labels?.notConnected || 'Printer not connected')
  }

  const L = labels || {}
  const locale = L.locale || 'ar-DZ'
  const lines = []

  lines.push(CMD.INIT)

  lines.push(CMD.CENTER, CMD.BOLD_ON, CMD.DOUBLE_SIZE)
  lines.push(textToBytes(storeProfile?.store_name || L.defaultStoreName || ''), [LF])
  lines.push(CMD.NORMAL_SIZE, CMD.BOLD_OFF)

  if (storeProfile?.receipt_header) {
    lines.push(textToBytes(storeProfile.receipt_header), [LF])
  }

  lines.push(textToBytes('-'.repeat(32)), [LF])

  lines.push(CMD.LEFT)
  lines.push(textToBytes(`${L.receiptNumber || '#'}: ${saleData.receipt_number}`), [LF])
  if (saleData.invoice_number) {
    lines.push(textToBytes(`${L.invoiceNum || 'FAC'}: ${saleData.invoice_number}`), [LF])
  }
  lines.push(textToBytes(`${L.date || ''}: ${new Date(saleData.created_at).toLocaleString(locale)}`), [LF])

  /* Fiscal info */
  const profile = storeProfile || {}
  if (profile.nif || profile.nis || profile.rc) {
    const parts = []
    if (profile.nif) parts.push(`NIF:${profile.nif}`)
    if (profile.nis) parts.push(`NIS:${profile.nis}`)
    if (profile.rc) parts.push(`RC:${profile.rc}`)
    lines.push(textToBytes(parts.join(' ')), [LF])
  }

  lines.push(textToBytes('-'.repeat(32)), [LF])

  for (const item of saleData.items || []) {
    lines.push(textToBytes(item.product_name), [LF])
    const detail = buildLine(
      `  ${item.quantity} × ${item.unit_price}`,
      `${(item.quantity * item.unit_price).toFixed(2)}`
    )
    lines.push(textToBytes(detail), [LF])
  }

  lines.push(textToBytes('='.repeat(32)), [LF])
  if (saleData.subtotal_ht != null && saleData.tax_amount > 0) {
    lines.push(textToBytes(buildLine(`${L.ht || 'HT'}:`, `${Number(saleData.subtotal_ht).toFixed(2)}`)), [LF])
    const taxLabel = saleData.tax_label || 'TVA'
    lines.push(textToBytes(buildLine(`${taxLabel}:`, `${Number(saleData.tax_amount).toFixed(2)}`)), [LF])
    lines.push(textToBytes('-'.repeat(32)), [LF])
  }
  lines.push(CMD.BOLD_ON, CMD.DOUBLE_SIZE)
  const currency = L.currency || ''
  lines.push(textToBytes(buildLine(`${L.ttc || L.total || 'Total'}:`, `${saleData.total_amount} ${currency}`.trim())), [LF])
  lines.push(CMD.NORMAL_SIZE, CMD.BOLD_OFF)

  const methods = L.paymentMethods || {}
  const payLabel = methods[saleData.payment_method] || saleData.payment_method
  lines.push(textToBytes(`${L.payment || ''}: ${payLabel}`), [LF])

  if (saleData.customer_name) {
    lines.push(textToBytes(`${L.customer || ''}: ${saleData.customer_name}`), [LF])
  }

  if (storeProfile?.receipt_footer) {
    lines.push(textToBytes('-'.repeat(32)), [LF])
    lines.push(CMD.CENTER)
    lines.push(textToBytes(storeProfile.receipt_footer), [LF])
  }

  lines.push(CMD.FEED, CMD.CUT)

  const allBytes = lines.flat()
  const data = new Uint8Array(allBytes)
  const chunkSize = 100

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    await cachedCharacteristic.writeValue(chunk)
    await new Promise(r => setTimeout(r, 50))
  }
}
