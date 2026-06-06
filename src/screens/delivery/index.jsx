import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'
import { MapPinIcon, TruckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function DeliveryScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('pending')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['delivery_orders', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(*), customers(name, phone)')
        .eq('store_id', storeId)
        .eq('order_type', 'delivery')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 86400000 * 3).toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!data || data.length === 0) return []

      const customerIds = [...new Set(data.map(o => o.customer_id).filter(Boolean))]
      if (customerIds.length > 0) {
        const { data: addresses } = await supabase
          .from('delivery_addresses')
          .select('*')
          .in('customer_id', customerIds)
        if (addresses) {
          const addrMap = {}
          addresses.forEach(a => { addrMap[a.customer_id] = a })
          data.forEach(o => { o.delivery_addresses = addrMap[o.customer_id] || null })
        }
      }
      return data
    },
    enabled: !!storeId,
    refetchInterval: 15000,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      await supabase
        .from('sales')
        .update({ delivery_status: status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('store_id', storeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['delivery_orders'])
      toast.success(t('delivery.statusUpdated'))
    },
  })

  const filtered = (orders || []).filter(o => {
    if (filter === 'all') return true
    const status = o.delivery_status || 'pending'
    return status === filter
  })

  const statusCounts = {
    pending: (orders || []).filter(o => o.delivery_status === 'pending' || !o.delivery_status).length,
    preparing: (orders || []).filter(o => o.delivery_status === 'preparing').length,
    out_for_delivery: (orders || []).filter(o => o.delivery_status === 'out_for_delivery').length,
    delivered: (orders || []).filter(o => o.delivery_status === 'delivered').length,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.delivery')}</h1>
          <TruckIcon className="h-6 w-6 text-gray-400" />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { key: 'pending', label: t('delivery.filterPending'), count: statusCounts.pending },
            { key: 'preparing', label: t('delivery.filterPreparing'), count: statusCounts.preparing },
            { key: 'out_for_delivery', label: t('delivery.filterOutForDelivery'), count: statusCounts.out_for_delivery },
            { key: 'delivered', label: t('delivery.filterDelivered'), count: statusCounts.delivered },
            { key: 'all', label: t('delivery.filterAll') },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === s.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {s.label}{s.count !== undefined ? ` (${s.count})` : ''}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-3">
          {filtered.length === 0 ? (
            <EmptyState icon="🛵" title={filter === 'delivered' ? t('delivery.noDeliveries') : t('delivery.noDeliveryOrders')} />
          ) : (
            filtered.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-50">
                      {order.customer_name || `طلب #${order.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('ar-DZ')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-green-600">{formatCurrency(order.total_amount)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      order.delivery_status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.delivery_status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.delivery_status === 'pending' || !order.delivery_status ? t('delivery.statusPending') :
                       order.delivery_status === 'preparing' ? t('delivery.statusPreparing') :
                       order.delivery_status === 'out_for_delivery' ? t('delivery.statusOutForDelivery') : t('delivery.statusDelivered')}
                    </span>
                  </div>
                </div>

                {order.delivery_addresses && (
                  <div className="flex items-start gap-2 text-xs text-gray-500 mb-2">
                    <MapPinIcon className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {order.delivery_addresses.address_line}
                      {order.delivery_addresses.phone && ` - ${order.delivery_addresses.phone}`}
                    </span>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 mb-2 space-y-0.5">
                  {(order.sale_items || []).slice(0, 5).map((item, j) => (
                    <div key={j} className="flex justify-between text-xs text-gray-500">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {order.delivery_fee > 0 && (
                  <p className="text-xs text-gray-400 mb-2">{t('delivery.deliveryFee')}: {formatCurrency(order.delivery_fee)}</p>
                )}

                {order.delivery_status !== 'delivered' && (
                  <div className="flex gap-2 mt-2">
                    {(!order.delivery_status || order.delivery_status === 'pending') && (
                      <button onClick={() => updateStatus.mutate({ id: order.id, status: 'preparing' })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white active:scale-95 transition-transform">
                        {t('delivery.startPreparing')}
                      </button>
                    )}
                    {order.delivery_status === 'preparing' && (
                      <button onClick={() => updateStatus.mutate({ id: order.id, status: 'out_for_delivery' })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white active:scale-95 transition-transform">
                        <TruckIcon className="h-3.5 w-3.5 inline me-1" />{t('delivery.deliver')}
                      </button>
                    )}
                    {order.delivery_status === 'out_for_delivery' && (
                      <button onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white active:scale-95 transition-transform">
                        <CheckCircleIcon className="h-3.5 w-3.5 inline me-1" />{t('delivery.markDelivered')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </main>
      )}
    </motion.div>
  )
}

