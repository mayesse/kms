import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { usePosStore } from '../../stores/posStore'
import { tableRepository } from '../../repositories/tableRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import Badge from '../../components/Badge'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

function timeSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '<1'
  if (mins < 60) return mins
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return `${hrs}:${String(rem).padStart(2, '0')}`
}

function TimerDisplay({ occupiedAt }) {
  const [label, setLabel] = useState(() => timeSince(occupiedAt))
  useEffect(() => {
    setLabel(timeSince(occupiedAt))
    const id = setInterval(() => setLabel(timeSince(occupiedAt)), 30000)
    return () => clearInterval(id)
  }, [occupiedAt])
  if (!label) return null
  return (
    <span className="text-[10px] font-mono bg-white/30 dark:bg-black/30 rounded px-1 py-0.5">
      {label}
    </span>
  )
}

function TableCard({ table, onStartOrder, onEdit, onDelete, onToggleOccupied, onMergeSelect, mergeMode, selectedForMerge }) {
  const { t } = useTranslation()
  const isOccupied = table.status === 'occupied'
  const isReserved = table.status === 'reserved'
  const isSelected = selectedForMerge === table.id
  const capacity = table.capacity || 2
  const sizeClass = capacity <= 2 ? 'h-24 w-24 text-sm' : capacity <= 4 ? 'h-28 w-28 text-base' : 'h-32 w-32 text-lg'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative flex flex-col items-center justify-center rounded-2xl ${sizeClass} transition-all cursor-pointer select-none ${
        isSelected
          ? 'ring-4 ring-blue-400 scale-110 z-10'
          : mergeMode
            ? 'ring-2 ring-dashed ring-gray-300 dark:ring-gray-600'
            : ''
      } ${
        isOccupied
          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30'
          : isReserved
            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md'
            : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md'
      }`}
      onClick={() => {
        if (mergeMode) { onMergeSelect(table); return }
        if (isOccupied) { onEdit(table); return }
        onStartOrder(table)
      }}
    >
      {/* Merge indicator */}
      {table.merged_with && (
        <div className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
          <ArrowsRightLeftIcon className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      {/* Table number */}
      <p className="font-black leading-none">{table.name.replace(t('tables.namePrefix'), '')}</p>

      {/* Capacity dots */}
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: Math.min(capacity, 5) }).map((_, i) => (
          <div key={i} className={`w-1 h-1 rounded-full ${isOccupied ? 'bg-red-200' : isReserved ? 'bg-amber-200' : 'bg-green-200'}`} />
        ))}
      </div>

      {/* Timer on occupied */}
      {isOccupied && (
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[8px] opacity-70">⏱</span>
          <TimerDisplay occupiedAt={table.occupied_at || table.updated_at} />
        </div>
      )}

      {/* Status label */}
      <span className={`absolute -bottom-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
        isOccupied
          ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
          : isReserved
            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300'
            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      }`}>
        {isOccupied ? t('tables.occupied') : isReserved ? t('tables.reserved') : t('tables.free')}
      </span>
    </motion.div>
  )
}

export default function TablesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const setActiveTable = usePosStore(s => s.setActiveTable)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(null)
  const [editTable, setEditTable] = useState(null)
  const [formName, setFormName] = useState('')
  const [formCapacity, setFormCapacity] = useState('2')
  const [mergeMode, setMergeMode] = useState(false)
  const [selectedMerge, setSelectedMerge] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables', storeId],
    queryFn: () => tableRepository.getAll(storeId),
    enabled: !!storeId,
    refetchInterval: 30000,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tableRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['tables']); toast.success(t('tables.created')); closeForm() },
    onError: () => toast.error(t('tables.createFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tableRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['tables']); toast.success(t('tables.updated')); closeForm() },
    onError: () => toast.error(t('tables.updateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => tableRepository.delete(storeId, id),
    onSuccess: () => { queryClient.invalidateQueries(['tables']); toast.success(t('tables.deleted')); setShowDelete(null) },
    onError: () => toast.error(t('tables.deleteFailed')),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, occupied }) => tableRepository.setOccupied(storeId, id, occupied),
    onSuccess: () => queryClient.invalidateQueries(['tables']),
  })

  const mergeMutation = useMutation({
    mutationFn: ({ sourceId, targetId }) => tableRepository.merge(storeId, sourceId, targetId),
    onSuccess: () => { queryClient.invalidateQueries(['tables']); toast.success(t('tables.mergeSuccess')); setMergeMode(false); setSelectedMerge(null) },
    onError: () => toast.error(t('tables.mergeFailed')),
  })

  const unmergeMutation = useMutation({
    mutationFn: (tableId) => tableRepository.unmerge(storeId, tableId),
    onSuccess: () => { queryClient.invalidateQueries(['tables']); toast.success(t('tables.unmergeSuccess')) },
    onError: () => toast.error(t('tables.unmergeFailed')),
  })

  const filtered = (tables || []).filter(t => {
    if (search && !t.name.includes(search)) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  const closeForm = () => { setShowForm(false); setEditTable(null); setFormName(''); setFormCapacity('2') }

  const openEdit = (table) => {
    setEditTable(table); setFormName(table.name); setFormCapacity(String(table.capacity || 2)); setShowForm(true)
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('tables.nameRequired')); return }
    const payload = { name: formName.trim(), capacity: parseInt(formCapacity) || 2 }
    if (editTable) updateMutation.mutate({ id: editTable.id, data: payload })
    else createMutation.mutate(payload)
  }

  const handleStartOrder = useCallback((table) => {
    setActiveTable(table.id, table.name)
    navigate('/')
  }, [setActiveTable, navigate])

  const handleMergeSelect = useCallback((table) => {
    if (!selectedMerge) { setSelectedMerge(table.id); return }
    if (selectedMerge === table.id) { setSelectedMerge(null); return }
    mergeMutation.mutate({ sourceId: selectedMerge, targetId: table.id })
  }, [selectedMerge, mergeMutation])

  const statusFilters = [
    { value: '', label: t('common.all') },
    { value: 'free', label: t('tables.free') },
    { value: 'occupied', label: t('tables.occupied') },
    { value: 'reserved', label: t('tables.reserved') },
  ]

  const mergedGroupIds = [...new Set((tables || []).filter(t => t.merged_with).map(t => t.merged_with))]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.tables')}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { setMergeMode(!mergeMode); setSelectedMerge(null) }}
              className={`h-10 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 ${
                mergeMode ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
              <ArrowsRightLeftIcon className="h-4 w-4" />
              {t('tables.merge')}
            </button>
            <button onClick={() => setShowForm(true)}
              className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mergeMode && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
              {selectedMerge ? t('tables.mergeSelectSecond') : t('tables.mergeSelectFirst')}
            </p>
            <button onClick={() => { setMergeMode(false); setSelectedMerge(null) }}
              className="text-xs font-semibold text-blue-600 underline">{t('common.cancel')}</button>
          </div>
        )}

        <SearchInput value={search} onChange={setSearch} placeholder={t('tables.search')} />
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.value ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={6} /> : filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState icon="🪑" title={search || statusFilter ? t('common.noResults') : t('tables.empty')} subtitle={t('tables.emptyHint')} />
        </div>
      ) : (
        <main className="p-4">
          {/* Legend */}
          <div className="flex gap-3 mb-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> {t('tables.free')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> {t('tables.occupied')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> {t('tables.reserved')}</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 justify-items-center">
            {filtered.map(table => (
              <div key={table.id} className="flex flex-col items-center gap-1">
                <TableCard
                  table={table}
                  onStartOrder={handleStartOrder}
                  onEdit={openEdit}
                  onDelete={setShowDelete}
                  onToggleOccupied={(id) => toggleMutation.mutate({ id, occupied: table.status !== 'occupied' })}
                  onMergeSelect={handleMergeSelect}
                  mergeMode={mergeMode}
                  selectedForMerge={selectedMerge}
                />
                <p className="text-[10px] text-gray-400 truncate max-w-[80px] text-center">{table.name}</p>
                {table.merged_with && (
                  <button onClick={() => unmergeMutation.mutate(table.merged_with)}
                    className="text-[8px] text-blue-500 underline">{t('tables.unmerge')}</button>
                )}
              </div>
            ))}
          </div>

          {/* Action bar for selected table */}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editTable ? t('tables.edit') : t('tables.add')}>
        <div className="space-y-4">
          <FormInput label={t('nav.tables')} value={formName} onChange={setFormName} placeholder={t('tables.namePlaceholder')} />
          <FormInput label={t('tables.capacity')} value={formCapacity} onChange={setFormCapacity} type="number" placeholder={t('tables.capacityPlaceholder')} dir="ltr" />
          <button onClick={handleSave} className="btn-primary">
            {editTable ? t('common.update') : t('common.add')}
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        onConfirm={() => deleteMutation.mutate(showDelete)}
        title={t('tables.deleteTitle')}
        message={t('tables.deleteConfirm')}
      />
    </motion.div>
  )
}
