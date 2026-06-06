import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { usePosStore } from '../../../stores/posStore'
import { holdRepository } from '../../../repositories/holdRepository'
import { useAuthStore } from '../../../stores/authStore'
import BottomSheet from '../../../components/BottomSheet'
import SearchInput from '../../../components/SearchInput'
import EmptyState from '../../../components/EmptyState'
import { formatCurrency, timeAgo } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function RestoreHoldsSheet({ isOpen, onClose, holds }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const { restoreCart } = usePosStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const filtered = (holds || []).filter(h =>
    !search || (h.customer_name || '').includes(search) || (h.note || '').includes(search)
  )

  const handleRestore = async (hold) => {
    restoreCart(hold.items_snapshot)
    await holdRepository.cancel(storeId, hold.id)
    queryClient.invalidateQueries(['holds'])
    toast.success(t('holds.restoreSuccess'))
    setSearch('')
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('pos.restoreHold')} large>
      {holds.length > 0 && (
        <div className="mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder={t('holds.search')} autoFocus />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title={search ? t('common.noResults') : t('pos.noHolds')} />
      ) : (
        <div className="space-y-2">
          {filtered.map(hold => (
            <button key={hold.id} onClick={() => handleRestore(hold)}
              className="card w-full text-start active:scale-[0.98] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{hold.customer_name}</p>
                  <p className="text-xs text-gray-500">
                    {hold.items_snapshot?.length || 0} {t('holds.items')} • {timeAgo(hold.created_at)}
                  </p>
                  {hold.note && <p className="text-xs text-gray-400 mt-0.5 truncate">📝 {hold.note}</p>}
                </div>
                <p className="text-green-600 font-bold shrink-0 ms-3">{formatCurrency(hold.total_amount)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
