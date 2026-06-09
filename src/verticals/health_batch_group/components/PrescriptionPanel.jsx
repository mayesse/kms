import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function PrescriptionPanel({ onAddMedication }) {
  const { t } = useTranslation()
  const [medications, setMedications] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', duration: '', notes: '' })

  const addMedication = () => {
    if (!newMed.name.trim()) return
    const entry = { ...newMed, id: Date.now().toString(), name: newMed.name.trim() }
    setMedications(prev => [...prev, entry])
    onAddMedication?.(entry)
    setNewMed({ name: '', dosage: '', frequency: '', duration: '', notes: '' })
    setShowAdd(false)
  }

  const removeMedication = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">الوصفة الطبية</h3>
        <button onClick={() => setShowAdd(true)}
          className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center active:scale-90 transition-transform">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
            <input value={newMed.name} onChange={e => setNewMed(p => ({ ...p, name: e.target.value }))}
              placeholder="اسم الدواء" dir="rtl"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
            <div className="flex gap-2">
              <input value={newMed.dosage} onChange={e => setNewMed(p => ({ ...p, dosage: e.target.value }))}
                placeholder="الجرعة (مجم)" dir="ltr"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
              <input value={newMed.frequency} onChange={e => setNewMed(p => ({ ...p, frequency: e.target.value }))}
                placeholder="مرات/يوم" dir="ltr"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
            </div>
            <input value={newMed.duration} onChange={e => setNewMed(p => ({ ...p, duration: e.target.value }))}
              placeholder="المدة (أيام)" dir="ltr"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
            <input value={newMed.notes} onChange={e => setNewMed(p => ({ ...p, notes: e.target.value }))}
              placeholder="ملاحظات" dir="rtl"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
            <button onClick={addMedication}
              className="w-full py-2 rounded-xl bg-green-600 text-white text-sm font-semibold active:scale-95 transition-transform">
              إضافة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        {medications.map(med => (
          <div key={med.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{med.name}</p>
              <p className="text-xs text-gray-500">{med.dosage && `${med.dosage} مجم`} {med.frequency && `- ${med.frequency} مرات/يوم`} {med.duration && `- ${med.duration} أيام`}</p>
            </div>
            <button onClick={() => removeMedication(med.id)} className="text-gray-400 hover:text-red-500 p-1">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
