import { useTranslation } from 'react-i18next'
import SearchInput from '../../../components/SearchInput'

export default function CarPartsSearchPanel({
  variant = 'car',
  searchMode,
  onSearchModeChange,
  search,
  onSearchChange,
  carOem,
  onCarOemChange,
  carMake,
  onCarMakeChange,
  carModel,
  onCarModelChange,
  searchInputRef,
}) {
  const { t } = useTranslation()
  const ns = variant === 'repair' ? 'partsLookup' : 'carParts'

  return (
    <div className="space-y-2">
      {variant === 'repair' && (
        <p className="text-[10px] text-green-100/90 px-1">{t('partsLookup.repairHint')}</p>
      )}
      <div className="flex gap-1 p-0.5 rounded-lg bg-white/10">
        <button
          type="button"
          onClick={() => onSearchModeChange('normal')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            searchMode === 'normal' ? 'bg-white text-green-700' : 'text-green-100'
          }`}
        >
          {t(`${ns}.searchNormal`)}
        </button>
        <button
          type="button"
          onClick={() => onSearchModeChange('oem')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            searchMode === 'oem' ? 'bg-white text-green-700' : 'text-green-100'
          }`}
        >
          {t(`${ns}.searchParts`)}
        </button>
      </div>

      {searchMode === 'normal' ? (
        <SearchInput
          ref={searchInputRef}
          value={search}
          onChange={onSearchChange}
          placeholder={t('pos.search')}
          className="!bg-white/95"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <input
              ref={searchInputRef}
              value={carOem}
              onChange={(e) => onCarOemChange(e.target.value)}
              placeholder={t(`${ns}.refPlaceholder`)}
              className="w-full h-11 px-3 rounded-xl bg-white/95 text-gray-900 text-sm border-0 shadow-sm"
              dir="ltr"
            />
          </div>
          <input
            value={carMake}
            onChange={(e) => onCarMakeChange(e.target.value)}
            placeholder={t(`${ns}.brand`)}
            className="h-10 px-3 rounded-xl bg-white/90 text-gray-900 text-xs"
          />
          <input
            value={carModel}
            onChange={(e) => onCarModelChange(e.target.value)}
            placeholder={t(`${ns}.deviceModel`)}
            className="h-10 px-3 rounded-xl bg-white/90 text-gray-900 text-xs"
          />
        </div>
      )}
    </div>
  )
}
