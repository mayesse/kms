import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const DEFAULT_COLORS = [
  { name: 'أحمر', hex: '#EF4444' },
  { name: 'أزرق', hex: '#3B82F6' },
  { name: 'أخضر', hex: '#22C55E' },
  { name: 'أسود', hex: '#000000' },
  { name: 'أبيض', hex: '#FFFFFF' },
  { name: 'رمادي', hex: '#6B7280' },
]

export default function VariantGrid({
  variants = [],
  sizes = DEFAULT_SIZES,
  colors = DEFAULT_COLORS,
  onVariantSelect,
  selectedSku = null,
}) {
  const { t } = useTranslation()

  const variantMap = {}
  variants.forEach(v => {
    const key = `${v.size}|${v.color}`
    variantMap[key] = v
  })

  return (
    <div className="overflow-x-auto" dir="ltr">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold border border-gray-200 dark:border-gray-700 sticky start-0">
              المقاس \ اللون
            </th>
            {colors.map(color => (
              <th key={color.hex} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{color.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizes.map(size => (
            <tr key={size}>
              <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 sticky start-0">
                {size}
              </td>
              {colors.map(color => {
                const key = `${size}|${color.name}`
                const variant = variantMap[key]
                const isSelected = selectedSku === variant?.sku
                return (
                  <td key={color.hex} className="border border-gray-200 dark:border-gray-700 p-0.5">
                    <button
                      onClick={() => onVariantSelect?.(variant || { size, color: color.name, sku: `${size}-${color.name}` })}
                      className={`w-full h-12 rounded flex items-center justify-center text-xs font-semibold transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-green-600 text-white shadow-md ring-2 ring-green-400 ring-offset-1'
                          : variant
                            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={!variant}
                    >
                      {isSelected ? '✓' : variant?.sku ? variant.sku.split('-')[1] || '—' : '—'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
