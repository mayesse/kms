import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowDownTrayIcon, ComputerDesktopIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

export default function DownloadPage() {
  const { t } = useTranslation()

  const downloadLink = (filename) =>
    `https://github.com/seririslam/greencrownkms/releases/latest/download/${filename}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="text-5xl mb-4">👑</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50">
            {t('landing.download.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-base max-w-xl mx-auto">
            {t('landing.download.subtitle')}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            href={downloadLink('Green-Crown-POS-Setup-2.0.0.exe')}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ComputerDesktopIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('landing.download.windowsTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t('landing.download.windowsDesc')}
            </p>
            <span className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-md">
              <ArrowDownTrayIcon className="w-4 h-4" />
              {t('landing.download.downloadBtn')}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Windows 10/11 — 64-bit
            </p>
          </motion.a>

          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            href={downloadLink('GreenCrownPOS.apk')}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DevicePhoneMobileIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('landing.download.androidTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t('landing.download.androidDesc')}
            </p>
            <span className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-md">
              <ArrowDownTrayIcon className="w-4 h-4" />
              {t('landing.download.downloadBtn')}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Android 8.0+ — APK
            </p>
          </motion.a>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 p-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-center"
        >
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('landing.download.pwaNote')}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
