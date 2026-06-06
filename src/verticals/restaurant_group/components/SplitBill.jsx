import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../../utils/format'

export default function SplitBill({ items = [], total = 0, onSplit }) {
  const { t } = useTranslation()
  const [splitMode, setSplitMode] = useState('equal')
  const [numPeople, setNumPeople] = useState(2)
  const [customSplits, setCustomSplits] = useState({})

  const equalShare = useMemo(() => {
    if (numPeople <= 0) return 0
    return Math.round((total / numPeople) * 100) / 100
  }, [total, numPeople])

  const itemAssignments = useMemo(() => {
    const assignments = {}
    items.forEach((item, i) => {
      const personIndex = i % numPeople
      const key = `person_${personIndex}`
      assignments[key] = [...(assignments[key] || []), item]
    })
    return assignments
  }, [items, numPeople])

  const personTotals = useMemo(() => {
    if (splitMode === 'equal') {
      return Array.from({ length: numPeople }, (_, i) => ({
        person: i + 1,
        amount: equalShare,
      }))
    }
    const totals = {}
    Object.entries(itemAssignments).forEach(([key, assignedItems]) => {
      totals[key] = assignedItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0)
    })
    return Object.entries(totals).map(([key, amount], i) => ({
      person: i + 1,
      amount: Math.round(amount * 100) / 100,
    }))
  }, [splitMode, equalShare, numPeople, itemAssignments])

  const sumOfSplits = useMemo(() =>
    personTotals.reduce((sum, p) => sum + p.amount, 0),
  [personTotals])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSplitMode('equal')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            splitMode === 'equal' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
          بالتساوي
        </button>
        <button onClick={() => setSplitMode('byItem')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            splitMode === 'byItem' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
          حسب الأصناف
        </button>
      </div>

      {splitMode === 'equal' && (
        <div className="flex items-center gap-3">
          <button onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
            className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold active:scale-90">-</button>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-50 w-12 text-center">{numPeople}</span>
          <button onClick={() => setNumPeople(Math.min(20, numPeople + 1))}
            className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold active:scale-90">+</button>
          <span className="text-sm text-gray-500">شخص</span>
        </div>
      )}

      <div className="space-y-2">
        {personTotals.map((p, i) => (
          <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-900 dark:text-gray-50">الشخص {p.person}</span>
            <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
        <span className="text-gray-500">المجموع: {formatCurrency(total)}</span>
        <span className={sumOfSplits !== total ? 'text-amber-600 font-semibold' : 'text-green-600 font-semibold'}>
          {sumOfSplits !== total ? `فارق ${formatCurrency(Math.abs(total - sumOfSplits))}` : '✓ متطابق'}
        </span>
      </div>

      <button onClick={() => onSplit?.({ mode: splitMode, numPeople, personTotals })}
        className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm active:scale-95 transition-transform">
        تأكيد التقسيم
      </button>
    </motion.div>
  )
}
