import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function TableMap({ tables = [], onTableClick, selectedTableId }) {
  const { t } = useTranslation()
  const [layout, setLayout] = useState('grid')

  const getStatusColor = (table) => {
    if (table.status === 'occupied') return 'bg-red-500 border-red-600 text-white'
    if (table.status === 'reserved') return 'bg-amber-400 border-amber-500 text-white'
    return 'bg-green-500 border-green-600 text-white'
  }

  const getStatusLabel = (table) => {
    if (table.status === 'occupied') return 'مشغولة'
    if (table.status === 'reserved') return 'محجوزة'
    return 'فارغة'
  }

  const rows = Math.ceil(Math.sqrt(tables.length))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> فارغة</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> مشغولة</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> محجوزة</span>
        </div>
        <button onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
          className="text-xs text-blue-600 font-semibold">
          {layout === 'grid' ? 'عرض كقائمة' : 'عرض كشبكة'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {layout === 'grid' ? (
          <motion.div key="grid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(rows, 4)}, 1fr)` }}>
            {tables.map((table, i) => (
              <motion.button key={table.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onTableClick?.(table)}
                className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  getStatusColor(table)
                } ${selectedTableId === table.id ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}>
                <span className="text-2xl font-black">{table.name.replace('طاولة ', '')}</span>
                <span className="text-[10px] opacity-80">{getStatusLabel(table)}</span>
                {table.capacity && <span className="text-[10px] opacity-60">سعة {table.capacity}</span>}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-2">
            {tables.map(table => (
              <button key={table.id} onClick={() => onTableClick?.(table)}
                className={`w-full px-4 py-3 rounded-xl border-2 flex items-center justify-between transition-all active:scale-95 ${
                  selectedTableId === table.id
                    ? 'ring-4 ring-blue-400 ring-offset-2 border-blue-400'
                    : table.status === 'occupied'
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${table.status === 'occupied' ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="font-bold text-gray-900 dark:text-gray-50">{table.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">سعة {table.capacity || 2}</span>
                  <span className={`text-xs font-semibold ${table.status === 'occupied' ? 'text-red-500' : 'text-green-500'}`}>
                    {getStatusLabel(table)}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
