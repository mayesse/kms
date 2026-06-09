import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import BottomSheet from './BottomSheet'

const STORAGE_KEY = 'welcome_tour_done'

const STEPS = [
  {
    icon: '👋',
    titleKey: 'welcomeTour.step0Title',
    descKey: 'welcomeTour.step0Desc',
  },
  {
    icon: '🛒',
    titleKey: 'welcomeTour.step1Title',
    descKey: 'welcomeTour.step1Desc',
  },
  {
    icon: '💳',
    titleKey: 'welcomeTour.step2Title',
    descKey: 'welcomeTour.step2Desc',
  },
  {
    icon: '🧭',
    titleKey: 'welcomeTour.step3Title',
    descKey: 'welcomeTour.step3Desc',
  },
]

export default function WelcomeTour({ force = false, onDone }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const done = localStorage.getItem(STORAGE_KEY) === 'true'

  useEffect(() => {
    if (force || !done) setOpen(true)
  }, [force, done])

  const isLast = step === STEPS.length - 1

  function handleNext() {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setOpen(false)
      onDone?.()
    } else {
      setStep(s => s + 1)
    }
  }

  function handleSkip() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
    onDone?.()
  }

  const s = STEPS[step]

  return (
    <BottomSheet isOpen={open} onClose={handleSkip} title="">
      <div className="flex flex-col items-center text-center py-4 space-y-4">
        <span className="text-6xl">{s.icon}</span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
          {t(s.titleKey)}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
          {t(s.descKey)}
        </p>

        {/* Dots */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-green-600' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
            />
          ))}
        </div>

        <div className="w-full flex gap-2 pt-2">
          <button onClick={handleSkip} className="btn-ghost flex-1 text-sm">
            {t('welcomeTour.skip')}
          </button>
          <button onClick={handleNext}
            className="flex-1 h-11 rounded-xl font-semibold text-white bg-green-600 active:scale-95 transition-all text-sm">
            {isLast ? t('welcomeTour.start') : t('welcomeTour.next')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
