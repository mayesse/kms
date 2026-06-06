import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { purchaseRepository } from '../../../repositories/purchaseRepository'
import BottomSheet from '../../../components/BottomSheet'
import EmptyState from '../../../components/EmptyState'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import { formatCurrency } from '../../../utils/format'

export default function SupplierDebts({ isOpen, onClose }) {
  const storeId = useAuthStore(s => s.storeId)

  const { data: debts, isLoading } = useQuery({
    queryKey: ['supplierDebts', storeId],
    queryFn: () => purchaseRepository.getSupplierDebts(storeId),
    enabled: !!storeId && isOpen,
  })

  const totalDebt = (debts || []).reduce((s, d) => s + d.total_debt, 0)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="ديون الموردين" large>
      {isLoading ? <LoadingSkeleton count={4} /> :
       !debts?.length ? <EmptyState icon="✅" title="لا توجد ديون مستحقة" /> : (
        <div className="space-y-4">
          {/* Total debt */}
          <div className="card bg-red-50 dark:bg-red-900/20 text-center">
            <p className="text-xs text-red-600">إجمالي الديون</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
          </div>

          {/* Per supplier */}
          <div className="space-y-2">
            {debts.map(supplier => {
              const paidPercent = supplier.total_purchases > 0
                ? (supplier.total_paid / supplier.total_purchases * 100)
                : 0

              return (
                <div key={supplier.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-50">{supplier.name}</p>
                      {supplier.phone && (
                        <p className="text-xs text-gray-400" dir="ltr">{supplier.phone}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {supplier.purchase_count} عملية شراء
                      </p>
                    </div>
                    <div className="text-end">
                      {supplier.total_debt > 0 ? (
                        <p className="font-bold text-red-600">{formatCurrency(supplier.total_debt)}</p>
                      ) : (
                        <p className="font-bold text-green-600">✅ مسدد</p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>مدفوع: {formatCurrency(supplier.total_paid)}</span>
                      <span>إجمالي: {formatCurrency(supplier.total_purchases)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
