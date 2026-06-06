import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export default function useB2BReports(dateRange = 'month') {
  const storeId = useAuthStore(s => s.storeId)

  const getDateFilter = () => {
    const now = new Date()
    switch (dateRange) {
      case 'week': return new Date(now.getTime() - 7 * 86400000).toISOString()
      case 'month': return new Date(now.getTime() - 30 * 86400000).toISOString()
      case 'quarter': return new Date(now.getTime() - 90 * 86400000).toISOString()
      case 'year': return new Date(now.getTime() - 365 * 86400000).toISOString()
      default: return new Date(now.getTime() - 30 * 86400000).toISOString()
    }
  }

  const { data: wholesaleSales } = useQuery({
    queryKey: ['b2bWholesaleSales', storeId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total, customer_name, created_at, sale_items(product_id, qty, total)')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!storeId,
  })

  const { data: supplierDebts } = useQuery({
    queryKey: ['b2bSupplierDebts', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('total, paid_amount, payment_status, suppliers(name)')
        .eq('store_id', storeId)
        .eq('payment_status', 'unpaid')
      if (error) throw error
      return data || []
    },
    enabled: !!storeId,
  })

  const summary = useMemo(() => {
    if (!wholesaleSales) return { totalSales: 0, totalRevenue: 0, avgOrderValue: 0 }
    const revenue = wholesaleSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0)
    return {
      totalSales: wholesaleSales.length,
      totalRevenue: revenue,
      avgOrderValue: wholesaleSales.length > 0 ? revenue / wholesaleSales.length : 0,
    }
  }, [wholesaleSales])

  const totalSupplierDebt = useMemo(() =>
    (supplierDebts || []).reduce((sum, p) => sum + (parseFloat(p.total || 0) - parseFloat(p.paid_amount || 0)), 0),
  [supplierDebts])

  const topCustomers = useMemo(() => {
    if (!wholesaleSales) return []
    const customerMap = {}
    wholesaleSales.forEach(sale => {
      const name = sale.customer_name || 'عميل نقدي'
      customerMap[name] = (customerMap[name] || 0) + parseFloat(sale.total || 0)
    })
    return Object.entries(customerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }))
  }, [wholesaleSales])

  return { summary, totalSupplierDebt, topCustomers, wholesaleSales, supplierDebts }
}
