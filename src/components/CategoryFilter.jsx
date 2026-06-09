import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { categoryRepository } from '../repositories/categoryRepository'
import { useTranslation } from 'react-i18next'
import {
  Squares2X2Icon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'
import { Squares2X2Icon as Squares2X2Solid } from '@heroicons/react/24/solid'

// Map of category name patterns to emoji icons
const CATEGORY_ICONS = {
  'سجائر': '🚬', 'تبغ': '🚬', 'cigarettes': '🚬', 'tobacco': '🚬',
  'مشروبات': '🥤', 'عصائر': '🧃', 'drinks': '🥤', 'beverages': '🥤',
  'سناكات': '🍪', 'حلويات': '🍬', 'snacks': '🍪', 'sweets': '🍬',
  'ألبان': '🥛', 'حليب': '🥛', 'dairy': '🥛', 'milk': '🥛',
  'خضروات': '🥬', 'فواكه': '🍎', 'vegetables': '🥬', 'fruits': '🍎',
  'لحوم': '🥩', 'دجاج': '🍗', 'meat': '🥩', 'chicken': '🍗',
  'خبز': '🍞', 'مخبوزات': '🥖', 'bread': '🍞', 'bakery': '🥖',
  'منظفات': '🧹', 'تنظيف': '🧴', 'cleaning': '🧹',
  'أدوية': '💊', 'صحة': '🏥', 'pharmacy': '💊', 'health': '🏥',
  'قرطاسية': '📝', 'مكتبية': '✏️', 'stationery': '📝',
  'إلكترونيات': '📱', 'electronics': '📱',
  'زيوت': '🫒', 'oil': '🫒',
  'أرز': '🍚', 'حبوب': '🌾', 'rice': '🍚', 'grains': '🌾',
  'بهارات': '🧂', 'توابل': '🌶️', 'spices': '🧂',
  'معلبات': '🥫', 'canned': '🥫',
  'شوكولاتة': '🍫', 'chocolate': '🍫',
  'بسكويت': '🍪', 'biscuits': '🍪',
  'شيبس': '🥔', 'chips': '🥔',
  'قهوة': '☕', 'شاي': '🫖', 'coffee': '☕', 'tea': '🫖',
  'ماء': '💧', 'water': '💧',
}

function getCategoryIcon(name) {
  const lower = (name || '').toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '📦' // default
}

export default function CategoryFilter({ value, onChange, showAll = true }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)

  const { data: categories } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const cats = categories || []

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {/* All button */}
      {showAll && (
        <button
          onClick={() => onChange(null)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
            !value
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {!value ? (
            <Squares2X2Solid className="h-4 w-4" />
          ) : (
            <Squares2X2Icon className="h-4 w-4" />
          )}
          <span>{t('common.all')}</span>
        </button>
      )}

      {/* Category chips */}
      {cats.map(cat => {
        const isActive = value === cat.id
        const icon = getCategoryIcon(cat.name)
        return (
          <button
            key={cat.id}
            onClick={() => onChange(isActive ? null : cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              isActive
                ? 'text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            style={isActive ? { backgroundColor: cat.color || '#16a34a' } : undefined}
          >
            <span className="text-base">{icon}</span>
            <span>{cat.name}</span>
          </button>
        )
      })}

      {/* More button (visual hint) */}
      {cats.length > 4 && (
        <div className="shrink-0 flex items-center px-2 text-gray-400">
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}
