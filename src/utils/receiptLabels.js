/** Build localized receipt strings for thermal printer (no hardcoded UI text in printer.js). */
export function buildReceiptLabels(t, locale = 'ar-DZ') {
  return {
    defaultStoreName: t('receipt.defaultStoreName'),
    receiptNumber: t('receipt.number'),
    invoiceNum: t('receipt.invoiceNum') + ':',
    date: t('receipt.date'),
    total: t('receipt.total'),
    ttc: t('receipt.ttc'),
    ht: t('receipt.ht'),
    payment: t('receipt.payment'),
    customer: t('receipt.customer'),
    currency: t('receipt.currency'),
    notConnected: t('receipt.notConnected'),
    paymentMethods: {
      cash: t('pos.cash'),
      ccp: t('pos.ccp'),
      credit: t('pos.credit'),
    },
    locale,
  }
}
