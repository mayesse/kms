import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { priceTierRepository } from '../../../repositories/priceTierRepository'
import FormInput from '../../../components/FormInput'

export default function PriceTierEditor({ productId, storeId }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [tiers, setTiers] = useState([])
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['priceTiers', storeId, productId],
    queryFn: () => priceTierRepository.getByProduct(storeId, productId),
    enabled: !!storeId && !!productId,
    onSuccess: (loadedTiers) => {
      if (loadedTiers) {
        setTiers(loadedTiers.map(t => ({
          id: t.id,
          name: t.name,
          min_qty: String(t.min_qty),
          unit_price: String(t.unit_price),
        })))
        setHasChanges(false)
      }
    },
  })

  function handleAdd() {
    setTiers([...tiers, { id: null, name: '', min_qty: '', unit_price: '' }])
    setHasChanges(true)
  }

  function handleRemove(index) {
    setTiers(tiers.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  function handleChange(index, field, value) {
    const updated = [...tiers]
    updated[index] = { ...updated[index], [field]: value }
    setTiers(updated)
    setHasChanges(true)
  }

  async function handleSave() {
    const valid = tiers.filter(t => t.name.trim() && t.unit_price)
    if (valid.length === 0 && tiers.length > 0) {
      toast.error(t('inventory.tierNameRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = valid.map(t => ({
        name: t.name.trim(),
        min_qty: parseInt(t.min_qty || 1),
        unit_price: parseFloat(t.unit_price),
      }))
      await priceTierRepository.upsert(storeId, productId, payload)
      queryClient.invalidateQueries({ queryKey: ['priceTiers', storeId, productId] })
      toast.success(t('inventory.tiersSaved'))
      setHasChanges(false)
    } catch (err) {
      toast.error(err.message || t('inventory.tiersSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!productId) {
    return (
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">{t('inventory.priceTiersTitle')}</h3>
        <p className="text-sm text-gray-500">{t('inventory.priceTiersSaveHint')}</p>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('inventory.priceTiersTitle')}</h3>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-semibold active:scale-95 transition-transform"
          >
            {saving ? t('inventory.saving') : t('inventory.saveTiers')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className="flex items-end gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 min-w-0">
                  <FormInput
                    label={t('inventory.tierName')}
                    value={tier.name}
                    onChange={(v) => handleChange(index, 'name', v)}
                    placeholder={t('inventory.tierNamePlaceholder')}
                  />
                </div>
                <div className="w-20 shrink-0">
                  <FormInput
                    label={t('inventory.tierMinQty')}
                  value={tier.min_qty}
                  onChange={(v) => handleChange(index, 'min_qty', v)}
                  type="number"
                  dir="ltr"
                />
              </div>
              <div className="w-24 shrink-0">
                  <FormInput
                    label={t('inventory.tierUnitPrice')}
                  value={tier.unit_price}
                  onChange={(v) => handleChange(index, 'unit_price', v)}
                  type="number"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => handleRemove(index)}
                className="h-10 px-2 text-red-500 hover:text-red-700 shrink-0 mb-0.5"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            {t('inventory.addTier')}
          </button>
        </div>
      )}
    </div>
  )
}
