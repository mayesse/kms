import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { usePosStore } from '../../stores/posStore'
import { appointmentRepository } from '../../repositories/appointmentRepository'
import { serviceRepository } from '../../repositories/serviceRepository'
import { staffRepository } from '../../repositories/staffRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import { PlusIcon, ChevronRightIcon, ChevronLeftIcon, TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { formatDateFull } from '../../utils/format'
import { useTranslation } from 'react-i18next'

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generateSlots() {
  const slots = []
  for (let h = 8; h <= 20; h++) {
    slots.push(String(h).padStart(2, '0') + ':00')
  }
  return slots
}

export default function AppointmentsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const navigate = useNavigate()
  const { clearCart, addServiceToCart, setCheckoutDefaults } = usePosStore()
  const queryClient = useQueryClient()

  const STATUS_MAP = {
    scheduled: { label: t('appointments.statusScheduled'), class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    confirmed: { label: t('appointments.statusConfirmed'), class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    completed: { label: t('appointments.statusCompleted'), class: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelled: { label: t('appointments.statusCancelled'), class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  }

  const STATUS_ACTIONS = {
    scheduled: [
      { label: t('appointments.actionConfirm'), next: 'confirmed', class: 'bg-yellow-500 hover:bg-yellow-600' },
      { label: t('appointments.actionCancel'), next: 'cancelled', class: 'bg-red-500 hover:bg-red-600' },
    ],
    confirmed: [
      { label: t('appointments.actionComplete'), next: 'completed', class: 'bg-green-500 hover:bg-green-600' },
      { label: t('appointments.actionCancel'), next: 'cancelled', class: 'bg-red-500 hover:bg-red-600' },
    ],
  }

  const [currentDate, setCurrentDate] = useState(toDateStr(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formServiceId, setFormServiceId] = useState('')
  const [formStaffId, setFormStaffId] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', storeId, currentDate],
    queryFn: () => appointmentRepository.getByDate(storeId, currentDate),
    enabled: !!storeId,
  })

  const { data: services } = useQuery({
    queryKey: ['services', storeId],
    queryFn: () => serviceRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: staff } = useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => staffRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => appointmentRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['appointments', storeId]); toast.success(t('appointments.created')); closeForm() },
    onError: () => toast.error(t('appointments.createFailed')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentRepository.setStatus(storeId, id, status),
    onSuccess: () => { queryClient.invalidateQueries(['appointments', storeId]); toast.success(t('appointments.statusUpdated')) },
    onError: () => toast.error(t('appointments.statusUpdateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => appointmentRepository.delete(storeId, id),
    onSuccess: () => { queryClient.invalidateQueries(['appointments', storeId]); toast.success(t('appointments.deleted')); setShowDelete(null) },
    onError: () => toast.error(t('appointments.deleteFailed')),
  })

  const closeForm = () => {
    setShowForm(false)
    setFormName('')
    setFormPhone('')
    setFormServiceId('')
    setFormStaffId('')
    setFormTime('')
    setFormNotes('')
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('appointments.nameRequired')); return }
    createMutation.mutate({
      customer_name: formName.trim(),
      phone: formPhone.trim(),
      service_id: formServiceId || null,
      staff_id: formStaffId || null,
      appointment_date: currentDate,
      start_time: formTime || null,
      notes: formNotes.trim() || null,
    })
  }

  const goPrevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(toDateStr(d))
  }

  const goNextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(toDateStr(d))
  }

  const isToday = currentDate === toDateStr(new Date())

  const convertToSale = (appt) => {
    if (!appt.services) {
      toast.error(t('appointments.noServiceLinked'))
      return
    }
    clearCart()
    addServiceToCart(appt.services)
    setCheckoutDefaults({
      staffId: appt.staff_id || null,
      customerName: appt.customer_name || '',
      customerPhone: appt.phone || appt.customer_phone || '',
      appointmentId: appt.id,
    })
    toast.success(t('appointments.convertedToSale'))
    navigate('/', { state: { openCheckout: true } })
  }

  const slots = generateSlots()
  const appointmentBySlot = {}
  for (const a of appointments || []) {
    const key = a.start_time ? a.start_time.slice(0, 5) : '00:00'
    if (!appointmentBySlot[key]) appointmentBySlot[key] = []
    appointmentBySlot[key].push(a)
  }

  const serviceOptions = (services || []).map(s => ({ value: s.id, label: `${s.name} — ${s.duration_minutes}د` }))
  const staffOptions = (staff || []).filter(s => s.is_active !== false).map(s => ({ value: s.id, label: s.name }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('appointments.title')}</h1>
          <button onClick={() => setShowForm(true)}
            className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
          <button onClick={goPrevDay} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{formatDateFull(currentDate)}</p>
            {isToday && <span className="text-xs text-green-600 font-semibold">{t('appointments.today')}</span>}
          </div>
          <button onClick={goNextDay} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={6} /> : (
        <main className="p-4 space-y-1">
          {appointments && appointments.length === 0 ? (
            <EmptyState icon="📅" title={t('appointments.emptyTitle')} subtitle={t('appointments.emptySubtitle')} actionLabel={t('appointments.addAppointment')} onAction={() => setShowForm(true)} />
          ) : (
            slots.map((slot) => {
              const slotApps = appointmentBySlot[slot] || []
              return (
                <div key={slot} className="flex gap-3">
                  <div className="w-14 shrink-0 pt-1 text-center">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{slot}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {slotApps.length === 0 ? (
                      <div className="h-8 flex items-center">
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      </div>
                    ) : (
                      <div className="space-y-2 pb-2">
                        {slotApps.map((appt, i) => {
                          const statusInfo = STATUS_MAP[appt.status] || STATUS_MAP.scheduled
                          const actions = STATUS_ACTIONS[appt.status] || []
                          return (
                            <motion.div
                              key={appt.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="card !p-3 border-r-4"
                              style={{ borderRightColor: appt.status === 'cancelled' ? '#ef4444' : appt.status === 'completed' ? '#22c55e' : appt.status === 'confirmed' ? '#eab308' : '#3b82f6' }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900 dark:text-gray-50 text-sm">{appt.customer_name}</p>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusInfo.class}`}>{statusInfo.label}</span>
                                  </div>
                                  {appt.services && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{appt.services.name}</p>
                                  )}
                                  {appt.staff && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{appt.staff.name}</p>
                                  )}
                                  {appt.phone && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" dir="ltr">{appt.phone}</p>
                                  )}
                                  {appt.notes && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{appt.notes}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                  {appt.status !== 'completed' && appt.status !== 'cancelled' && appt.services && (
                                    <button
                                      type="button"
                                      onClick={() => convertToSale(appt)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-90 transition-all flex items-center gap-0.5"
                                    >
                                      <ShoppingCartIcon className="h-3 w-3" />
                                      {t('appointments.convertToSale')}
                                    </button>
                                  )}
                                  {actions.map((act) => (
                                    <button
                                      key={act.next}
                                      onClick={() => statusMutation.mutate({ id: appt.id, status: act.next })}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold text-white active:scale-90 transition-all ${act.class}`}
                                    >
                                      {act.label}
                                    </button>
                                  ))}
                                  {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShowDelete(appt.id) }}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={t('appointments.addAppointment')} large>
        <div className="space-y-4">
          <FormInput label={t('appointments.customerName')} value={formName} onChange={setFormName} placeholder={t('appointments.customerNamePlaceholder')} required />
          <FormInput label={t('appointments.phone')} value={formPhone} onChange={setFormPhone} placeholder="05XX XX XX XX" dir="ltr" />
          <FormSelect
            label={t('appointments.service')}
            value={formServiceId}
            onChange={setFormServiceId}
            options={serviceOptions}
            placeholder={t('appointments.servicePlaceholder')}
          />
          <FormSelect
            label={t('appointments.staff')}
            value={formStaffId}
            onChange={setFormStaffId}
            options={staffOptions}
            placeholder={t('appointments.staffPlaceholder')}
          />
          <FormInput label={t('appointments.date')} value={currentDate} onChange={setCurrentDate} type="date" dir="ltr" />
          <FormInput label={t('appointments.startTime')} value={formTime} onChange={setFormTime} type="time" dir="ltr" />
          <FormInput label={t('appointments.notes')} value={formNotes} onChange={setFormNotes} placeholder={t('appointments.notesPlaceholder')} />
          <button onClick={handleSave} className="btn-primary">{t('appointments.add')}</button>
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={() => deleteMutation.mutate(showDelete)} title={t('appointments.deleteTitle')} message={t('appointments.deleteMessage')} />
    </motion.div>
  )
}
