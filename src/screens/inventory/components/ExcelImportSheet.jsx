import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { read, utils } from 'xlsx'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import BottomSheet from '../../../components/BottomSheet'
import { ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

// Auto-detect column mapping from header names
const COLUMN_ALIASES = {
  name: ['name', 'product', 'الاسم', 'اسم المنتج', 'المنتج', 'product name', 'item', 'article', 'désignation'],
  barcode: ['barcode', 'code', 'الباركود', 'كود', 'ean', 'upc', 'code barre', 'code-barres'],
  selling_price: ['selling_price', 'price', 'sell', 'سعر البيع', 'السعر', 'sale price', 'retail', 'prix de vente', 'prix vente', 'pv'],
  purchase_price: ['purchase_price', 'cost', 'buy', 'سعر الشراء', 'التكلفة', 'cost price', 'prix achat', 'pa'],
  quantity: ['quantity', 'stock', 'qty', 'الكمية', 'المخزون', 'كمية', 'quantité'],
  category: ['category', 'الفئة', 'التصنيف', 'catégorie'],
}

function detectColumnMapping(headers) {
  const mapping = {}
  const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim())

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = normalizedHeaders.findIndex(h => aliases.includes(h))
    if (index !== -1) {
      mapping[field] = index
    }
  }
  return mapping
}

function parseRow(row, mapping) {
  const get = (field) => {
    if (mapping[field] === undefined) return ''
    return String(row[mapping[field]] ?? '').trim()
  }

  const name = get('name')
  if (!name) return null

  return {
    name,
    barcode: get('barcode') || null,
    selling_price: parseFloat(get('selling_price')) || 0,
    purchase_price: parseFloat(get('purchase_price')) || 0,
    quantity: parseInt(get('quantity')) || 0,
    category_name: get('category') || null,
  }
}

export default function ExcelImportSheet({ isOpen, onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [parsedRows, setParsedRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { added, skipped, errors }

  const resetState = useCallback(() => {
    setParsedRows([])
    setHeaders([])
    setMapping({})
    setFileName('')
    setImporting(false)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportResult(null)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = utils.sheet_to_json(firstSheet, { header: 1 })

      if (jsonData.length < 2) {
        toast.error(t('inventory.importFileEmpty'))
        return
      }

      const headerRow = jsonData[0].map(h => String(h || ''))
      const detectedMapping = detectColumnMapping(headerRow)

      if (!detectedMapping.name) {
        // Try to find name in the first column that has text
        const firstTextCol = headerRow.findIndex(h => h && h.length > 0)
        if (firstTextCol !== -1) detectedMapping.name = firstTextCol
      }

      setHeaders(headerRow)
      setMapping(detectedMapping)

      const rows = jsonData.slice(1)
        .map(row => parseRow(row, detectedMapping))
        .filter(Boolean)

      setParsedRows(rows)

      if (rows.length === 0) {
        toast.error(t('inventory.importNoProducts'))
      }
    } catch (err) {
      console.error('Excel parse error:', err)
      toast.error(t('inventory.importFailedRead'))
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (parsedRows.length === 0 || !storeId) return
    setImporting(true)

    let added = 0
    let skipped = 0
    const errors = []

    for (const row of parsedRows) {
      try {
        // Skip if barcode already exists
        if (row.barcode) {
          const existing = await productRepository.getByBarcode(storeId, row.barcode)
          if (existing) {
            skipped++
            continue
          }
        }

        await productRepository.create(storeId, {
          name: row.name,
          barcode: row.barcode,
          selling_price: row.selling_price,
          purchase_price: row.purchase_price,
          quantity: row.quantity,
          min_stock_threshold: 5,
          base_unit: 'قطعة',
          stock_type: 'ready',
        })
        added++
      } catch (err) {
        errors.push(row.name)
        console.error(`Import error for ${row.name}:`, err)
      }
    }

    setImportResult({ added, skipped, errors })
    setImporting(false)
    queryClient.invalidateQueries(['products'])
    queryClient.invalidateQueries(['stockValue'])

    if (added > 0) {
      toast.success(t('inventory.importSuccess', { count: added }))
    }
  }, [parsedRows, storeId, queryClient])

  const mappedFields = Object.entries(mapping)
    .filter(([, idx]) => idx !== undefined)
    .map(([field, idx]) => `${field}: "${headers[idx]}"`)

  return (
    <BottomSheet isOpen={isOpen} onClose={() => { resetState(); onClose() }} title={'📥 ' + t('inventory.importTitle')} large>
      <div className="space-y-4">

        {/* File picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl
                     flex flex-col items-center justify-center gap-2 cursor-pointer
                     hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-[0.98]"
        >
          <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {fileName || t('inventory.importPickFile')}
          </p>
          {fileName && <p className="text-xs text-green-500 font-semibold">{fileName}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Column mapping info */}
        {parsedRows.length > 0 && !importResult && (
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('inventory.importColumnsDetected')}</p>
              <div className="flex flex-wrap gap-1.5">
                {mappedFields.length > 0 ? mappedFields.map(f => (
                  <span key={f} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-[11px] rounded-md font-mono">{f}</span>
                )) : (
                  <span className="text-xs text-red-500">{t('inventory.importNoColumns')}</span>
                )}
              </div>
            </div>

            {/* Preview */}
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {t('inventory.importPreview', { count: parsedRows.length })}
            </p>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-2 text-start font-semibold text-gray-500">#</th>
                    <th className="py-2 px-2 text-start font-semibold text-gray-500">{t('inventory.productName')}</th>
                    <th className="py-2 px-2 text-center font-semibold text-gray-500">{t('inventory.barcode')}</th>
                    <th className="py-2 px-2 text-center font-semibold text-gray-500">{t('inventory.purchasePrice')}</th>
                    <th className="py-2 px-2 text-center font-semibold text-gray-500">{t('inventory.sellingPrice')}</th>
                    <th className="py-2 px-2 text-center font-semibold text-gray-500">{t('inventory.quantity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                      <td className="py-1.5 px-2 font-medium text-gray-800 dark:text-gray-100 truncate max-w-[120px]">{row.name}</td>
                      <td className="py-1.5 px-2 text-center font-mono text-gray-500" dir="ltr">{row.barcode || '—'}</td>
                      <td className="py-1.5 px-2 text-center text-gray-500" dir="ltr">{row.purchase_price || '—'}</td>
                      <td className="py-1.5 px-2 text-center text-green-600 font-semibold" dir="ltr">{row.selling_price || '—'}</td>
                      <td className="py-1.5 px-2 text-center text-gray-500">{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 50 && (
                <p className="text-center text-[10px] text-gray-400 py-1">+ {t('inventory.importMore', { count: parsedRows.length - 50 })}</p>
              )}
            </div>

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('inventory.importInProgress')}
                </>
              ) : (
                t('inventory.importBtn', { count: parsedRows.length })
              )}
            </button>
          </div>
        )}

        {/* Import result */}
        <AnimatePresence>
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="font-bold text-sm">{t('inventory.importCompleted')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">{importResult.added}</p>
                    <p className="text-[10px] text-gray-500">{t('inventory.importAdded')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-500">{importResult.skipped}</p>
                    <p className="text-[10px] text-gray-500">{t('inventory.importSkipped')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-500">{importResult.errors.length}</p>
                    <p className="text-[10px] text-gray-500">{t('inventory.importErrors')}</p>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-600">
                    <XCircleIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold">{t('inventory.importFailedProducts')}</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto">
                    {importResult.errors.map((name, i) => (
                      <p key={i} className="text-xs text-red-500">{name}</p>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { resetState(); onClose() }}
                className="w-full py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm active:scale-95 transition-transform"
              >
                {t('pos.close')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  )
}
