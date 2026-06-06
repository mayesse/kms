import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function KitchenScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  


  const { data: orders, isLoading } = useQuery({
    queryKey: ['kitchen_orders', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*), tables(name)')
        .eq('store_id', storeId)
        .in('order_type', ['dine_in', 'takeaway', 'delivery'])
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 86400000 * 2).toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!storeId,
    refetchInterval: 15000,
  })

  const markReady = useMutation({
    mutationFn: async (saleId) => {
      await supabase
        .from('sales')
        .update({ kitchen_status: 'ready', updated_at: new Date().toISOString() })
        .eq('id', saleId)
        .eq('store_id', storeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['kitchen_orders'])
      toast.success(t('kitchen.orderReady'))
    },
  })

  const pending = (orders || []).filter(o => o.kitchen_status !== 'ready')
  const ready = (orders || []).filter(o => o.kitchen_status === 'ready')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.kitchen')}</h1>
          <div className="flex gap-3 text-sm">
            <span className="text-amber-600 font-semibold">{t('kitchen.pendingOrders', { count: pending.length })}</span>
            <span className="text-green-600 font-semibold">{t('kitchen.readyOrders', { count: ready.length })}</span>
          </div>
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-4">
          {pending.length === 0 && ready.length === 0 ? (
            <EmptyState icon="🍳" title={t('kitchen.noOrders')} subtitle={t('kitchen.noOrdersHint')} />
          ) : (
            <>
              {pending.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" /> {t('kitchen.inPreparation', { count: pending.length })}
                  </h2>
                  <div className="grid gap-3">
                    {pending.map((order) => (
                      <div key={order.id} className="card border-amber-200 dark:border-amber-800 border-2">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-50">
                              {order.tables?.name || `طلب #${order.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {order.order_type === 'dine_in' ? t('kitchen.dineIn') : order.order_type === 'takeaway' ? t('kitchen.takeaway') : t('kitchen.delivery')}
                              {order.customer_name ? ` - ${order.customer_name}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => markReady.mutate(order.id)}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold active:scale-95 transition-transform flex items-center gap-1"
                          >
                            <CheckCircleIcon className="h-4 w-4" /> {t('kitchen.markReady')}
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 space-y-1">
                          {(order.sale_items || []).map((item, j) => (
                            <div key={j} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{item.product_name} × {item.qty}</span>
                              {item.note && <span className="text-xs text-gray-400 ms-2">📝 {item.note}</span>}
                            </div>
                          ))}
                        </div>
                        {order.note && (
                          <p className="text-xs text-amber-600 mt-2">📝 {order.note}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-2">
                          {new Date(order.created_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ready.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-green-600 mb-2 flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" /> {t('kitchen.readyLabel', { count: ready.length })}
                  </h2>
                  <div className="grid gap-3 opacity-70">
                    {ready.map((order) => (
                      <div key={order.id} className="card border-green-200 dark:border-green-800 border">
                        <p className="font-bold text-gray-900 dark:text-gray-50">
                          {order.tables?.name || `طلب #${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-green-600 mt-1">{t('kitchen.readyAt', { time: new Date(order.updated_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      )}
    </motion.div>
  )
}

