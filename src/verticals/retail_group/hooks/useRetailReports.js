import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export default function useRetailReports(dateRange = 'today') {
  const storeId = useAuthStore(s => s.storeId)

  const getDateFilter = () => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (dateRange) {
      case 'today': return startOfDay.toISOString()
      case 'week': return new Date(now.getTime() - 7 * 86400000).toISOString()
      case 'month': return new Date(now.getTime() - 30 * 86400000).toISOString()
      case 'year': return new Date(now.getTime() - 365 * 86400000).toISOString()
      default: return startOfDay.toISOString()
    }
  }

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['retailSalesReport', storeId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total, created_at, sale_items(product_id, qty, total, products(name, category_id, categories(name)))')
        .eq('store_id', storeId)
        .gte('created_at', getDateFilter())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!storeId,
  })

  const { data: productsData } = useQuery({
    queryKey: ['retailStockReport', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, quantity, selling_price, purchase_price, min_stock_threshold, categories(name)')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!storeId,
  })

  const summary = useMemo(() => {
    if (!salesData) return { totalSales: 0, totalRevenue: 0, itemsSold: 0, avgOrderValue: 0 }
    const totalRevenue = salesData.reduce((sum, s) => sum + parseFloat(s.total || 0), 0)
    const itemsSold = salesData.reduce((sum, s) =>
      sum + (s.sale_items || []).reduce((si, item) => si + (item.qty || 0), 0), 0)
    return {
      totalSales: salesData.length,
      totalRevenue,
      itemsSold,
      avgOrderValue: salesData.length > 0 ? totalRevenue / salesData.length : 0,
    }
  }, [salesData])

  const topProducts = useMemo(() => {
    if (!salesData) return []
    const productMap = {}
    salesData.forEach(sale => {
      ;(sale.sale_items || []).forEach(item => {
        const name = item.products?.name || item.product_name || 'غير معروف'
        productMap[name] = (productMap[name] || 0) + (item.qty || 0)
      })
    })
    return Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, qty]) => ({ name, qty }))
  }, [salesData])

  const stockAlerts = useMemo(() => {
    if (!productsData) return []
    return productsData
      .filter(p => p.quantity <= p.min_stock_threshold)
      .map(p => ({ ...p, deficit: p.min_stock_threshold - p.quantity }))
      .sort((a, b) => b.deficit - a.deficit)
  }, [productsData])

  const profitMargin = useMemo(() => {
    if (!productsData) return 0
    const totalRevenue = productsData.reduce((sum, p) => sum + (p.selling_price || 0) * Math.max(0, p.quantity || 0), 0)
    const totalCost = productsData.reduce((sum, p) => sum + (p.purchase_price || 0) * Math.max(0, p.quantity || 0), 0)
    return totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
  }, [productsData])

  return {
    summary,
    topProducts,
    stockAlerts,
    profitMargin,
    salesData,
    productsData,
    isLoading: salesLoading,
  }
}
