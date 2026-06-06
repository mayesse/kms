import { useRef, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { useTranslation } from 'react-i18next'
import BottomSheet from './BottomSheet'
import { formatCurrency, formatDate, formatTime } from '../utils/format'
import { printReceipt, connectPrinter, isPrinterConnected } from '../utils/printer'
import { buildReceiptLabels } from '../utils/receiptLabels'
import { PrinterIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function InvoiceView({ isOpen, onClose, saleData, storeProfile, wasPrinted }) {
  const { t } = useTranslation()
  const receiptRef = useRef(null)

  const buildPrintPayload = useCallback((sale) => ({
    receipt_number: sale.receipt_number,
    created_at: sale.created_at,
    total_amount: sale.total_amount,
    payment_method: sale.payment_method,
    customer_name: sale.customer_name || null,
    subtotal_ht: sale.subtotal_ht ?? null,
    tax_amount: sale.tax_amount || 0,
    tax_label: sale.tax_rates?.name || 'TVA',
    items: (sale.sale_items || []).map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
  }), [])

  const handlePrint = useCallback(async () => {
    if (!saleData) return
    try {
      if (!isPrinterConnected()) {
        toast(t('pos.printerConnecting'), { icon: '🖨️' })
        const conn = await connectPrinter()
        if (!conn.success) {
          toast.error(t('pos.printerError') + (conn.error || ''))
          return
        }
      }
      toast(t('pos.printerPrinting'), { icon: '🖨️' })
      const labels = buildReceiptLabels(t)
      await printReceipt(buildPrintPayload(saleData), storeProfile || {}, labels)
      toast.success(t('pos.printSuccess'))
    } catch {
      toast.error(t('invoice.printFailed'))
    }
  }, [saleData, storeProfile, t, buildPrintPayload])

  const handleDownloadPdf = useCallback(async () => {
    if (!receiptRef.current || !saleData) return
    try {
      toast(t('invoice.generatingPdf'), { icon: '📄' })
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      pdf.save(`${saleData.receipt_number || 'invoice'}.pdf`)
      toast.success(t('invoice.pdfDownloaded'))
    } catch {
      toast.error(t('invoice.pdfFailed'))
    }
  }, [saleData, t])

  if (!saleData) return null

  const items = saleData.sale_items || []
  const total = parseFloat(saleData.total_amount || 0)
  const subtotalHt = saleData.subtotal_ht != null ? parseFloat(saleData.subtotal_ht) : null
  const taxAmount = saleData.tax_amount != null ? parseFloat(saleData.tax_amount) : null
  const showTva = subtotalHt != null && taxAmount > 0
  const taxName = saleData.tax_rates?.name || 'TVA'

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('invoice.title')} large>
      {/* Receipt content */}
      <div ref={receiptRef} className="bg-white p-4 rounded-xl font-mono text-xs leading-relaxed space-y-1" dir="rtl">
        <div className="text-center pb-2 border-b border-gray-300 border-dashed">
          <p className="text-base font-bold">{storeProfile?.store_name || t('receipt.defaultStoreName')}</p>
          {storeProfile?.receipt_header && (
            <p className="text-[10px] text-gray-500 mt-0.5">{storeProfile.receipt_header}</p>
          )}
        </div>

        <div className="flex justify-between text-[10px] text-gray-600 py-1">
          <span>{t('receipt.number')}: {saleData.receipt_number}</span>
          <span>{formatDate(saleData.created_at)} {formatTime(saleData.created_at)}</span>
        </div>

        {saleData.invoice_number && (
          <div className="flex justify-between text-[10px] text-gray-700 font-semibold py-0.5">
            <span>{t('invoice.invoiceNum')}: {saleData.invoice_number}</span>
            {saleData.invoice_series && <span>{t('invoice.series')} {saleData.invoice_series}</span>}
          </div>
        )}

        {/* Fiscal info */}
        {storeProfile?.nif && (
          <div className="text-[9px] text-gray-400 space-y-0.5 pt-0.5">
            {storeProfile.nif && <span>NIF: {storeProfile.nif} </span>}
            {storeProfile.nis && <span>NIS: {storeProfile.nis} </span>}
            {storeProfile.rc && <span>RC: {storeProfile.rc} </span>}
            {storeProfile.article && <span>{t('settings.article')}: {storeProfile.article}</span>}
          </div>
        )}

        <div className="border-t border-gray-300 border-dashed" />

        {items.map((item, i) => (
          <div key={i}>
            <p className="font-semibold">{item.product_name}</p>
            <div className="flex justify-between text-gray-600 pe-2">
              <span>{item.quantity} × {formatCurrency(parseFloat(item.unit_price))}</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(item.quantity * parseFloat(item.unit_price))}
              </span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-400 border-dashed pt-1" />

        {showTva && (
          <>
            <div className="flex justify-between text-gray-600">
              <span>{t('tax.subtotalHt')}</span>
              <span>{formatCurrency(subtotalHt)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('tax.tvaLine', { name: taxName, rate: saleData.tax_rates?.rate || '' })}</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="border-t border-gray-300 border-dashed" />
          </>
        )}

        <div className="flex justify-between text-sm font-bold pt-0.5">
          <span>{showTva ? t('receipt.ttc') : t('receipt.total')}</span>
          <span className="text-green-700">{formatCurrency(total)}</span>
        </div>

        <div className="flex justify-between text-[10px] text-gray-500 pt-0.5">
          <span>{t('receipt.payment')}</span>
          <span>{t(`pos.${saleData.payment_method}`)}</span>
        </div>

        {saleData.customer_name && (
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{t('receipt.customer')}</span>
            <span>{saleData.customer_name}</span>
          </div>
        )}

        {saleData.tables?.name && (
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{t('reports.tableLabel')}</span>
            <span>{saleData.tables.name}</span>
          </div>
        )}

        {storeProfile?.receipt_footer && (
          <>
            <div className="border-t border-gray-300 border-dashed pt-1" />
            <p className="text-center text-[10px] text-gray-400">{storeProfile.receipt_footer}</p>
          </>
        )}

        <div className="text-center text-[8px] text-gray-300 pt-1">
          {t('invoice.generatedAt')} {formatTime(new Date())}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button onClick={handleDownloadPdf}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-bold active:scale-95 transition-transform shadow-md">
          <DocumentArrowDownIcon className="h-5 w-5" />
          {t('invoice.downloadPdf')}
        </button>
        {wasPrinted ? (
          <div className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-semibold">
            <PrinterIcon className="h-5 w-5" />
            {t('invoice.printed')}
          </div>
        ) : (
          <button onClick={handlePrint}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border-2 border-green-600 text-green-700 dark:text-green-300 text-sm font-bold active:scale-95 transition-transform">
            <PrinterIcon className="h-5 w-5" />
            {t('invoice.print')}
          </button>
        )}
      </div>
      <button onClick={onClose}
        className="w-full mt-2 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold active:scale-95 transition-transform">
        {t('pos.close')}
      </button>
    </BottomSheet>
  )
}
