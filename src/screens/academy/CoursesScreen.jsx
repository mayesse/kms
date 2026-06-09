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

export default function CoursesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formLanguage, setFormLanguage] = useState('')
  const [formLevel, setFormLevel] = useState('')
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formClassType, setFormClassType] = useState('group')

  const { data: courses, isLoading } = useQuery({
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
    mutationFn: (data) => academyRepository.createCourse(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['academy_courses', storeId])
      toast.success(t('academy.courseCreated'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName(''); setFormLanguage(''); setFormLevel(''); setFormTeacherId(''); setFormPrice(''); setFormClassType('group')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName, language: formLanguage || null, level: formLevel || null,
      teacher_id: formTeacherId || null, price: parseFloat(formPrice) || 0,
      class_type: formClassType,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.courses')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('academy.newCourse')}
        </button>
      </div>

      {!courses?.length ? (
        <EmptyState title={t('academy.emptyCourses')} subtitle={t('academy.emptyCoursesHint')} />
      ) : (
        <div className="space-y-3">
          {courses.map(course => (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{course.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {course.language && `${course.language}`}
                    {course.level && ` • ${t(`academy.level${course.level}`)}`}
                    {course.academy_teachers?.name && ` • ${course.academy_teachers.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-green-600">{parseFloat(course.price).toLocaleString()} DZD</p>
                  <span className="text-[11px] text-gray-400">{t(`academy.classType${course.class_type.charAt(0).toUpperCase() + course.class_type.slice(1)}`)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.newCourse')}</h2>
            <FormInput label={t('academy.courseName')} value={formName} onChange={setFormName} required />
            <FormInput label={`${t('academy.specialty')} (${t('common.language')})`} value={formLanguage} onChange={setFormLanguage} />
            <FormInput label={t('academy.level')} value={formLevel} onChange={setFormLevel} />
            <FormSelect label={t('academy.teacherName')} value={formTeacherId} onChange={setFormTeacherId}
              options={[{ value: '', label: '—' }, ...(teachers || []).map(t => ({ value: t.id, label: t.name }))]} />
            <FormInput label={t('common.price')} value={formPrice} onChange={setFormPrice} type="number" />
            <FormSelect label={t('common.type')} value={formClassType} onChange={setFormClassType} options={[
              { value: 'individual', label: t('academy.classTypeIndividual') },
              { value: 'group', label: t('academy.classTypeGroup') },
              { value: 'online', label: t('academy.classTypeOnline') },
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
