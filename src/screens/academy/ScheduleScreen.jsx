import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { academyRepository } from '../../repositories/academyRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import { PlusIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ScheduleScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(toDateStr(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [formCourseId, setFormCourseId] = useState('')
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formDate, setFormDate] = useState(toDateStr(new Date()))
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('10:00')
  const [formRoom, setFormRoom] = useState('')
  const [formTopic, setFormTopic] = useState('')

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['academy_sessions', storeId, currentDate],
    queryFn: () => academyRepository.getSessions(storeId, currentDate, currentDate),
    enabled: !!storeId,
  })

  const { data: courses } = useQuery({
    queryKey: ['academy_courses', storeId],
    queryFn: () => academyRepository.getCourses(storeId),
    enabled: !!storeId,
  })

  const { data: teachers } = useQuery({
    queryKey: ['academy_teachers', storeId],
    queryFn: () => academyRepository.getTeachers(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => academyRepository.createSession(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['academy_sessions', storeId])
      toast.success(t('academy.sessionCreated'))
      setShowForm(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!formCourseId) { toast.error(t('common.required')); return }
    createMutation.mutate({
      course_id: formCourseId, teacher_id: formTeacherId || null,
      date: formDate, start_time: formStart, end_time: formEnd,
      room: formRoom || null, topic: formTopic || null,
    })
  }

  function prevDay() {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(toDateStr(d))
  }

  function nextDay() {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(toDateStr(d))
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{currentDate}</span>
          <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('academy.newSession')}
        </button>
      </div>

      {!sessions?.length ? (
        <EmptyState title={t('academy.emptySchedule')} subtitle={t('academy.emptyScheduleHint')} />
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">
                    {s.academy_courses?.name || '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                    {s.academy_teachers?.name && ` • ${s.academy_teachers.name}`}
                    {s.room && ` • ${s.room}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.topic && <span className="text-[11px] text-gray-400">{s.topic}</span>}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    s.status === 'completed' ? 'bg-green-100 text-green-700' :
                    s.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{s.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.newSession')}</h2>
            <FormSelect label={t('academy.courseName')} value={formCourseId} onChange={setFormCourseId} required
              options={[{ value: '', label: '—' }, ...(courses || []).map(c => ({ value: c.id, label: c.name }))]} />
            <FormSelect label={t('academy.teacherName')} value={formTeacherId} onChange={setFormTeacherId}
              options={[{ value: '', label: '—' }, ...(teachers || []).map(t => ({ value: t.id, label: t.name }))]} />
            <FormInput label={t('common.date')} value={formDate} onChange={setFormDate} type="date" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('common.start')} value={formStart} onChange={setFormStart} type="time" />
              <FormInput label={t('common.end')} value={formEnd} onChange={setFormEnd} type="time" />
            </div>
            <FormInput label={t('academy.room')} value={formRoom} onChange={setFormRoom} />
            <FormInput label={t('academy.topic')} value={formTopic} onChange={setFormTopic} />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
