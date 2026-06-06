import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDate } from '../../../utils/format'

export default function InvoiceTemplate({ sale, storeName, onPrint, onClose }) {
  const { t } = useTranslation()

  const subtotal = useMemo(() =>
    (sale?.sale_items || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0),
  [sale])

  const invoiceHtml = useMemo(() => {
    if (!sale) return ''
    return `
      <html dir="rtl">
      <head><meta charset="utf-8"><title>فاتورة</title>
      <style>
        body { font-family: 'Arial', sans-serif; width: 80mm; margin: 0; padding: 5mm; font-size: 12px; }
        .header { text-align: center; margin-bottom: 8px; }
        .header h1 { font-size: 18px; margin: 0 0 4px; }
        .header p { font-size: 10px; margin: 2px 0; color: #666; }
        .divider { border-top: 1px dashed #333; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: start; padding: 4px 2px; border-bottom: 1px solid #333; font-size: 10px; }
        td { padding: 4px 2px; }
        .right { text-align: end; }
        .total-row td { font-weight: bold; font-size: 14px; padding-top: 8px; }
        .footer { text-align: center; font-size: 10px; margin-top: 8px; color: #666; }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>${storeName || 'التاج الأخضر'}</h1>
          <p>فاتورة رقم: ${sale.receipt_number || sale.id?.slice(0, 8) || '—'}</p>
          <p>التاريخ: ${formatDate(sale.created_at)}</p>
          ${sale.customer_name ? `<p>العميل: ${sale.customer_name}</p>` : ''}
        </div>
        <div class="divider"></div>
        <table>
          <tr><th>البيان</th><th class="right">الكمية</th><th class="right">السعر</th><th class="right">المجموع</th></tr>
          ${(sale.sale_items || []).map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td class="right">${item.qty}</td>
              <td class="right">${formatCurrency(item.price || item.unit_price)}</td>
              <td class="right">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </table>
        <div class="divider"></div>
        <table>
          <tr><td><strong>المجموع</strong></td><td class="right"><strong>${formatCurrency(subtotal)}</strong></td></tr>
          ${sale.discount > 0 ? `<tr><td>الخصم</td><td class="right">-${formatCurrency(sale.discount)}</td></tr>` : ''}
          <tr class="total-row"><td>المجموع النهائي</td><td class="right">${formatCurrency(sale.total || subtotal)}</td></tr>
          ${sale.payment_method ? `<tr><td>طريقة الدفع</td><td class="right">${sale.payment_method}</td></tr>` : ''}
        </table>
        <div class="divider"></div>
        <div class="footer">
          <p>شكراً لتعاملكم معنا</p>
          <p style="font-size:8px;">تم بواسطة التاج الأخضر</p>
        </div>
      </body>
      </html>
    `
  }, [sale, storeName, subtotal])

  const handlePrint = () => {
    if (!invoiceHtml) return
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    printWindow.document.write(invoiceHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (!sale) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">🧾</p>
        <p className="text-sm">اختر فاتورة للعرض</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-4 border-b border-dashed border-gray-300 dark:border-gray-600 pb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-50">{storeName || 'التاج الأخضر'}</h2>
          <p className="text-xs text-gray-500 mt-1">فاتورة رقم: {sale.receipt_number || sale.id?.slice(0, 8)}</p>
          <p className="text-xs text-gray-500">{formatDate(sale.created_at)}</p>
          {sale.customer_name && <p className="text-xs text-gray-500 mt-1">العميل: {sale.customer_name}</p>}
        </div>

        <div className="space-y-2 divide-y divide-gray-100 dark:divide-gray-700">
          {(sale.sale_items || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{item.product_name} × {item.qty}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-50">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">المجموع</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">{formatCurrency(subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">الخصم</span>
              <span className="text-red-500 font-semibold">-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold pt-1">
            <span className="text-gray-900 dark:text-gray-50">المجموع النهائي</span>
            <span className="text-green-600">{formatCurrency(sale.total || subtotal)}</span>
          </div>
          {sale.payment_method && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>طريقة الدفع</span>
              <span>{sale.payment_method}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handlePrint}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-transform">
          🖨️ طباعة
        </button>
        {onClose && (
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold active:scale-95 transition-transform">
            إغلاق
          </button>
        )}
      </div>
    </div>
  )
}
