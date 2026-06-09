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
import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const SPECIALTIES = ['French', 'English', 'Arabic', 'Spanish', 'Math']

export default function TeachersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formSpecialty, setFormSpecialty] = useState('')
  const [formSalaryType, setFormSalaryType] = useState('hourly')
  const [formRate, setFormRate] = useState('')

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['academy_teachers', storeId],
    queryFn: () => academyRepository.getTeachers(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => academyRepository.createTeacher(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['academy_teachers', storeId])
      toast.success(t('academy.teacherCreated'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName(''); setFormPhone(''); setFormSpecialty(''); setFormSalaryType('hourly'); setFormRate('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName, phone: formPhone || null, specialty: formSpecialty || null,
      salary_type: formSalaryType, rate: parseFloat(formRate) || 0,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.teachers')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('academy.newTeacher')}
        </button>
      </div>

      {!teachers?.length ? (
        <EmptyState title={t('academy.emptyTeachers')} subtitle={t('academy.emptyTeachersHint')} />
      ) : (
        <div className="space-y-3">
          {teachers.map(teacher => (
            <div key={teacher.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{teacher.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {teacher.specialty && t(`academy.specialty${teacher.specialty}`)}
                    {teacher.phone && ` • ${teacher.phone}`}
                    {teacher.rate > 0 && ` • ${teacher.rate} DZD/${t(`academy.salaryType${teacher.salary_type.charAt(0).toUpperCase() + teacher.salary_type.slice(1)}`)}`}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  teacher.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>{teacher.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.newTeacher')}</h2>
            <FormInput label={t('academy.teacherName')} value={formName} onChange={setFormName} required />
            <FormInput label={t('common.phone')} value={formPhone} onChange={setFormPhone} type="tel" />
            <FormSelect label={t('academy.specialty')} value={formSpecialty} onChange={setFormSpecialty}
              options={[{ value: '', label: '—' }, ...SPECIALTIES.map(s => ({ value: s, label: t(`academy.specialty${s}`) }))]} />
            <FormSelect label={t('common.type')} value={formSalaryType} onChange={setFormSalaryType} options={[
              { value: 'hourly', label: t('academy.salaryTypeHourly') },
              { value: 'session', label: t('academy.salaryTypeSession') },
              { value: 'monthly', label: t('academy.salaryTypeMonthly') },
            ]} />
            <FormInput label={t('academy.rate')} value={formRate} onChange={setFormRate} type="number" />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
