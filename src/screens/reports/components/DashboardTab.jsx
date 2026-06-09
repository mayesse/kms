import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '../../../stores/authStore'
import { useReportsStore } from '../../../stores/reportsStore'
import { saleRepository } from '../../../repositories/saleRepository'
import { branchRepository } from '../../../repositories/branchRepository'
import { hasModule } from '../../../utils/businessTypes'
import FilterChips from '../../../components/FilterChips'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

const PAYMENT_COLORS = ['#16a34a', '#3b82f6', '#f59e0b']

function getDateRange(filter) {
  const now = new Date()
  const pad = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const today = pad(now)

  if (filter === 'today') {
    return { from: `${today}T00:00:00`, to: `${today}T23:59:59` }
  }
  if (filter === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    return { from: `${pad(d)}T00:00:00`, to: `${today}T23:59:59` }
  }
  // month
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: `${pad(d)}T00:00:00`, to: `${today}T23:59:59` }
}

export default function DashboardTab() {
  const storeId = useAuthStore(s => s.storeId)
  const businessType = useAuthStore(s => s.businessType)
  const { dateFilter, setDateFilter, branchFilter, setBranchFilter } = useReportsStore()
  const { t } = useTranslation()
  const { from, to } = getDateRange(dateFilter)
  const showBranchFilter = hasModule(businessType, 'branches')

  const { data: branches } = useQuery({
    queryKey: ['branches', storeId],
    queryFn: () => branchRepository.getAll(storeId),
    enabled: !!storeId && showBranchFilter,
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', storeId, from, to, branchFilter],
    queryFn: () => saleRepository.getSummary(storeId, from, to, branchFilter || null),
    enabled: !!storeId,
  })

  const { data: topProducts } = useQuery({
    queryKey: ['topProducts', storeId, from, to, branchFilter],
    queryFn: () => saleRepository.getTopProducts(storeId, from, to, 5, branchFilter || null),
    enabled: !!storeId,
  })

  const { data: categoryPerf } = useQuery({
    queryKey: ['categoryPerformance', storeId, from, to, branchFilter],
    queryFn: () => saleRepository.getCategoryPerformance(storeId, from, to, branchFilter || null),
    enabled: !!storeId,
  })

  const { data: collectedCredits } = useQuery({
    queryKey: ['collectedCreditSales', storeId, from, to],
    queryFn: () => saleRepository.getCollectedCreditSales(storeId, from, to),
    enabled: !!storeId && dateFilter === 'today',
  })

  const filters = [
    { value: 'today', label: t('reports.today') },
    { value: 'week', label: t('reports.thisWeek') },
    { value: 'month', label: t('reports.thisMonth') },
  ]

  if (isLoading) return <LoadingSkeleton count={4} height="h-24" />

  const s = summary || {}

  const collectedToday = dateFilter === 'today'
    ? (collectedCredits || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    : 0

  const paymentData = [
    { name: t('pos.cash'), value: s.cash_total || 0 },
    { name: 'CCP', value: s.ccp_total || 0 },
  ].filter(d => d.value > 0)

  // Prepare category chart data
  const catChartData = (categoryPerf || []).map(c => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    fullName: c.name,
    revenue: Math.round(c.revenue),
    profit: Math.round(c.profit),
    color: c.color,
  }))

  const totalCatRevenue = (categoryPerf || []).reduce((s, c) => s + c.revenue, 0)

  return (
    <div className="space-y-4">
      <FilterChips options={filters} value={dateFilter} onChange={setDateFilter} />

      {showBranchFilter && (branches || []).length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{t('reports.branchFilter')}</p>
          <select
            value={branchFilter || ''}
            onChange={(e) => setBranchFilter(e.target.value || null)}
            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
          >
            <option value="">{t('reports.allBranches')}</option>
            {(branches || []).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPI Grid — Revenue is actual received money (no credit) */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('reports.actualRevenue'), value: formatCurrency(s.total_revenue || 0), color: 'text-green-600' },
          { label: t('reports.grossProfit'), value: formatCurrency(s.total_profit || 0), color: 'text-blue-600' },
          { label: t('reports.transactionCount'), value: s.sale_count || 0, color: 'text-purple-600' },
          { label: t('reports.avgBasket'), value: formatCurrency(s.avg_basket || 0), color: 'text-amber-600' },
        ].map((kpi, i) => (
          <div key={i} className="card text-center">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Credit KPIs — shown separately */}
      {(s.credit_total > 0 || collectedToday > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {s.credit_total > 0 && (
            <div className="card text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">{t('reports.todayCredit')}</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(s.credit_total)}</p>
              <p className="text-[10px] text-amber-500 mt-0.5">{s.credit_count || 0} {t('reports.transactions')}</p>
            </div>
          )}
          {collectedToday > 0 && (
            <div className="card text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">{t('reports.todayCollected')}</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(collectedToday)}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Pie Chart */}
      {paymentData.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold mb-3">{t('reports.paymentMethods')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {paymentData.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Category Performance ─── */}
      {categoryPerf?.length > 0 && (
        <>
          <div className="card">
            <p className="text-sm font-semibold mb-3">{t('reports.revenueProfit')}</p>
            <ResponsiveContainer width="100%" height={Math.max(180, categoryPerf.length * 40)}>
              <BarChart data={catChartData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                <YAxis type="category" dataKey="name" width={70} fontSize={11} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  formatter={(v, name) => [formatCurrency(v), name === 'revenue' ? t('reports.revenueLabel') : t('reports.profitLabel')]}
                  labelFormatter={(label) => {
                    const cat = catChartData.find(c => c.name === label)
                    return cat?.fullName || label
                  }}
                />
                <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]} name={t('reports.revenueLabel')} />
                <Bar dataKey="profit" fill="#3b82f6" radius={[0, 4, 4, 0]} name={t('reports.profitLabel')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category detail cards */}
          <div className="card">
            <p className="text-sm font-semibold mb-3">{t('reports.categoryDetails')}</p>
            <div className="space-y-3">
              {categoryPerf.map((cat, i) => {
                const revenuePercent = totalCatRevenue > 0 ? (cat.revenue / totalCatRevenue * 100) : 0
                const margin = cat.revenue > 0 ? (cat.profit / cat.revenue * 100) : 0

                return (
                  <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-50">{cat.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{t('reports.percentOfRevenue', { percent: revenuePercent.toFixed(1) })}</span>
                    </div>

                    {/* Progress bar showing share of total revenue */}
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${revenuePercent}%`, backgroundColor: cat.color }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-gray-400">{t('reports.revenueLabel')}</p>
                        <p className="text-xs font-bold text-green-600">{formatCurrency(cat.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">{t('reports.profitLabel')}</p>
                        <p className="text-xs font-bold text-blue-600">{formatCurrency(cat.profit)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">{t('reports.qtyLabel')}</p>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{cat.qty}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">{t('reports.profitMargin')}</p>
                        <p className={`text-xs font-bold ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                          {margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Top Products */}
      {topProducts?.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold mb-3">{t('reports.topProducts')}</p>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span className="flex-1 truncate">{p.product_name}</span>
                <span className="text-gray-500">{p.total_qty}</span>
                <span className="font-semibold text-green-600">{formatCurrency(p.total_revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
