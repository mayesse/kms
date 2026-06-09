import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../utils/format'

export default function KitchenTicket({ order, onClose }) {
  const { t } = useTranslation()

  const handlePrint = () => {
    if (!order) return
    const ticket = `
      <html dir="rtl">
      <head><meta charset="utf-8"><title>فاتورة المطبخ</title>
      <style>
        body { font-family: Arial; width: 80mm; margin: 0; padding: 4mm; font-size: 12px; }
        h2 { text-align: center; font-size: 16px; margin-bottom: 4px; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .item { display: flex; justify-content: space-between; padding: 2px 0; }
        .footer { text-align: center; font-size: 10px; margin-top: 4px; }
      </style>
      </head>
      <body>
        <h2>فاتورة مطبخ</h2>
        <p style="text-align:center;">${order.tables?.name || `طلب #${order.id?.slice(0, 8)}`}</p>
        <p style="text-align:center;font-size:10px;">${new Date().toLocaleString('ar-DZ')}</p>
        <div class="divider"></div>
        ${(order.sale_items || []).map(item => `
          <div class="item">
            <span>${item.product_name} × ${item.qty}</span>
            ${item.note ? `<br><span style="font-size:10px;color:#666;">📝 ${item.note}</span>` : ''}
          </div>
        `).join('')}
        ${order.note ? `<div class="divider"></div><p style="font-size:10px;">📝 ${order.note}</p>` : ''}
        <div class="divider"></div>
        <p class="footer">شكراً لكم</p>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank', 'width=300,height=400')
    printWindow.document.write(ticket)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (!order) return null

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
            {order.tables?.name || `طلب #${order.id?.slice(0, 8)}`}
          </span>
          <span className="text-xs text-gray-500">
            {order.order_type === 'dine_in' ? 'داخلي' : order.order_type === 'takeaway' ? 'سفري' : 'توصيل'}
          </span>
        </div>
        <div className="space-y-2">
          {(order.sale_items || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-gray-200 dark:border-gray-700 pb-1">
              <span className="text-gray-700 dark:text-gray-300">{item.product_name} × {item.qty}</span>
              {item.note && <span className="text-xs text-amber-600">📝 {item.note}</span>}
            </div>
          ))}
        </div>
        {order.note && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">📝 {order.note}</p>
        )}
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
