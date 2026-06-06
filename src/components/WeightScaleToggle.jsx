import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ScaleIcon, SignalIcon } from '@heroicons/react/24/outline'
import { setScaleListeningEnabled } from '../hooks/useWeightScaleStub'
import { isWebSerialSupported } from '../hooks/useWeightScaleSerial'

export default function WeightScaleToggle({
  listening,
  onToggle,
  serialConnected,
  onSerialConnect,
  onSerialDisconnect,
  compact = false,
}) {
  const { t } = useTranslation()
  const serialSupported = isWebSerialSupported()

  useEffect(() => {
    setScaleListeningEnabled(listening)
  }, [listening])

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : ''}`}>
      <button
        type="button"
        onClick={() => onToggle(!listening)}
        title={t('weightScale.toggleHint')}
        className={`flex items-center gap-1.5 rounded-xl font-semibold transition-all active:scale-95 ${
          compact ? 'h-9 px-2 text-[10px]' : 'h-10 px-3 text-xs'
        } ${
          listening
            ? 'bg-lime-400 text-lime-950 shadow-sm'
            : 'bg-white/15 text-white hover:bg-white/25'
        }`}
      >
        <ScaleIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        <span className="hidden sm:inline">
          {listening ? t('weightScale.on') : t('weightScale.off')}
        </span>
      </button>

      {serialSupported && (
        <button
          type="button"
          onClick={serialConnected ? onSerialDisconnect : onSerialConnect}
          title={serialConnected ? t('weightScale.serialDisconnect') : t('weightScale.serialConnect')}
          className={`flex items-center justify-center rounded-xl transition-all active:scale-95 ${
            compact ? 'h-9 w-9' : 'h-10 w-10'
          } ${
            serialConnected
              ? 'bg-cyan-400 text-cyan-950 shadow-sm'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          <SignalIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </button>
      )}
    </div>
  )
}
