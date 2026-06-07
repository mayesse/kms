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
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function StudentsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [levelFilter, setLevelFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAge, setFormAge] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formParent, setFormParent] = useState('')
  const [formLevel, setFormLevel] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['academy_students', storeId, levelFilter],
    queryFn: () => academyRepository.getStudents(storeId, { level: levelFilter || undefined }),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => academyRepository.createStudent(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['academy_students', storeId])
      toast.success(t('academy.studentCreated'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName(''); setFormAge(''); setFormPhone(''); setFormParent(''); setFormLevel('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName, age: formAge ? parseInt(formAge) : null,
      phone: formPhone || null, parent_contact: formParent || null,
      level: formLevel || null,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5">
            <option value="">{t('common.all')}</option>
            {LEVELS.map(l => <option key={l} value={l}>{t(`academy.level${l}`)}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('academy.newStudent')}
        </button>
      </div>

      {!students?.length ? (
        <EmptyState title={t('academy.emptyStudents')} subtitle={t('academy.emptyStudentsHint')} />
      ) : (
        <div className="space-y-3">
          {students.map(s => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{s.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.age && `${t('academy.age')}: ${s.age}`}
                    {s.level && ` • ${t(`academy.level${s.level}`)}`}
                    {s.phone && ` • ${s.phone}`}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  s.status === 'active' ? 'bg-green-100 text-green-700' :
                  s.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                  s.status === 'graduated' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.newStudent')}</h2>
            <FormInput label={t('academy.studentName')} value={formName} onChange={setFormName} required />
            <FormInput label={t('academy.age')} value={formAge} onChange={setFormAge} type="number" />
            <FormInput label={t('common.phone')} value={formPhone} onChange={setFormPhone} type="tel" />
            <FormInput label={t('academy.parentContact')} value={formParent} onChange={setFormParent} />
            <FormSelect label={t('academy.level')} value={formLevel} onChange={setFormLevel} options={[
              { value: '', label: '—' },
              ...LEVELS.map(l => ({ value: l, label: t(`academy.level${l}`) })),
            ]} />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
