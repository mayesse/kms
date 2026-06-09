import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useCreditPaymentsStore } from '../../stores/creditPaymentsStore'
import { sessionRepository } from '../../repositories/sessionRepository'
import { saleRepository } from '../../repositories/saleRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import Card from '../../components/Card'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import Badge from '../../components/Badge'
import { formatCurrency, formatDate } from '../../utils/format'
import { useTranslation } from 'react-i18next'

export default function SessionsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const payments = useCreditPaymentsStore(s => s.payments)
  const queryClient = useQueryClient()
  const [showClose, setShowClose] = useState(false)
  const [step, setStep] = useState(1)
  const [countedCash, setCountedCash] = useState('')
  const [note, setNote] = useState('')

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', storeId],
    queryFn: () => sessionRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: activeSession } = useQuery({
    queryKey: ['activeSession', storeId],
    queryFn: () => sessionRepository.getActive(storeId),
    enabled: !!storeId,
  })

  const { data: todaySummary } = useQuery({
    queryKey: ['todaySummary', storeId],
    queryFn: () => {
      const today = new Date().toISOString().slice(0, 10)
      return saleRepository.getSummary(storeId, `${today}T00:00:00`, `${today}T23:59:59`)
    },
    enabled: !!storeId && showClose,
  })

  const handleClose = async () => {
    try {
      await sessionRepository.close(storeId, activeSession.id, parseFloat(countedCash || 0), note)
      setStep(4)
      queryClient.invalidateQueries(['sessions'])
      queryClient.invalidateQueries(['activeSession'])
      toast.success(t('sessions.sessionClosed'))
    } catch { toast.error(t('toast.saveFailed')) }
  }

  const s = todaySummary || {}
  const today = new Date().toISOString().slice(0, 10)
  const collectedCreditToday = payments
    .filter(p => p.paid_at?.slice(0, 10) === today)
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const expectedCashTotal = (s.cash_total || 0) + collectedCreditToday

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('sessions.title')}</h1>
          {activeSession && (
            <button onClick={() => { setShowClose(true); setStep(1) }} className="btn-ghost text-amber-600 font-semibold text-sm">
              {t('sessions.closeDay')}
            </button>
          )}
        </div>
      </header>

      <main className="p-4 space-y-2">
        {isLoading ? <LoadingSkeleton count={5} /> :
         sessions?.length === 0 ? <EmptyState icon="📅" title={t('sessions.noSessions')} /> :
         sessions.map((sess, i) => (
           <motion.div key={sess.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
             <Card>
               <div className="flex items-center justify-between">
                 <div>
                   <p className="font-semibold text-gray-900 dark:text-gray-50">{formatDate(sess.session_date)}</p>
                    <Badge variant={sess.status === 'open' ? 'success' : 'neutral'}>{sess.status === 'open' ? t('sessions.openBadge') : t('sessions.closedBadge')}</Badge>
                 </div>
                 {sess.closing_cash_counted != null && (
                   <div className="text-end">
                      <p className="text-sm text-gray-500">{t('sessions.countedLabel')}: {formatCurrency(sess.closing_cash_counted)}</p>
                     {sess.cash_discrepancy != 0 && (
                       <p className={`text-xs font-bold ${sess.cash_discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {t('sessions.diffLabel')}: {formatCurrency(sess.cash_discrepancy)}
                       </p>
                     )}
                   </div>
                 )}
               </div>
             </Card>
           </motion.div>
         ))
        }
      </main>

      {/* Close session flow */}
      <BottomSheet isOpen={showClose} onClose={() => setShowClose(false)} title={t('sessions.closeDay')} large>
        <div className="space-y-4">
          {step === 1 && (
            <>
              <h3 className="font-semibold">{t('sessions.summary')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.totalSales')}</p><p className="font-bold text-green-600">{formatCurrency(s.total_revenue || 0)}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.cashSales')}</p><p className="font-bold">{formatCurrency(s.cash_total || 0)}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.creditCollected')}</p><p className="font-bold text-emerald-600">{formatCurrency(collectedCreditToday)}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.ccpSales')}</p><p className="font-bold">{formatCurrency(s.ccp_total || 0)}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.creditSales')}</p><p className="font-bold">{formatCurrency(s.credit_total || 0)}</p></div>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary">{t('sessions.next')}</button>
            </>
          )}
          {step === 2 && (
            <>
              <FormInput label={t('sessions.countedCash')} value={countedCash} onChange={setCountedCash} type="number" dir="ltr" autoFocus />
              <button onClick={() => setStep(3)} className="btn-primary">{t('sessions.next')}</button>
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.expectedCash')}</p><p className="font-bold">{formatCurrency(expectedCashTotal)}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">{t('sessions.countedCash')}</p><p className="font-bold">{formatCurrency(parseFloat(countedCash || 0))}</p></div>
              </div>
              <div className={`card text-center ${(parseFloat(countedCash || 0) - expectedCashTotal) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <p className="text-sm text-gray-500">{t('sessions.discrepancy')}</p>
                <p className="text-2xl font-bold">{formatCurrency(parseFloat(countedCash || 0) - expectedCashTotal)}</p>
              </div>
              <FormInput label={t('sessions.noteLabel')} value={note} onChange={setNote} />
              <button onClick={handleClose} className="btn-primary">{t('sessions.confirm')}</button>
            </>
          )}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-bold text-green-600">{t('sessions.sessionClosedSuccess')}</p>
              <button onClick={() => setShowClose(false)} className="btn-ghost mt-4">{t('pos.close')}</button>
            </div>
          )}
        </div>
      </BottomSheet>
    </motion.div>
  )
}

