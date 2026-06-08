import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { settingsRepository } from '../../repositories/settingsRepository'
import { BUSINESS_TYPES, getBusinessType, getExtraModuleRoutes } from '../../utils/businessTypes'
import { businessTypeChangeRequestRepository } from '../../repositories/businessTypeChangeRequestRepository'
import FormInput from '../../components/FormInput'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { formatCurrency } from '../../utils/format'
import DeviceModulesSection from './DeviceModulesSection'
import HfsqlSection from './HfsqlSection'
import WelcomeTour from '../../components/WelcomeTour'
import { useTranslation } from 'react-i18next'
import {
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CubeIcon,
  ShoppingCartIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  ChevronLeftIcon,
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  AdjustmentsHorizontalIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'

/* eslint-disable react-hooks/set-state-in-effect */

const SETTINGS_SECTIONS = [
  {
    id: 'store', icon: BuildingStorefrontIcon,
    iconColor: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    titleKey: 'settings.storeTitle', subtitleKey: 'settings.storeSubtitle',
  },
  {
    id: 'receipts', icon: DocumentTextIcon,
    iconColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    titleKey: 'settings.receiptsTitle', subtitleKey: 'settings.receiptsSubtitle',
  },
  {
    id: 'inventory', icon: CubeIcon,
    iconColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    titleKey: 'settings.inventoryTitle', subtitleKey: 'settings.inventorySubtitle',
  },
  {
    id: 'sales', icon: ShoppingCartIcon,
    iconColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    titleKey: 'settings.salesTitle', subtitleKey: 'settings.salesSubtitle',
  },
  {
    id: 'security', icon: ShieldCheckIcon,
    iconColor: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    titleKey: 'settings.securityTitle', subtitleKey: 'settings.securitySubtitle',
  },
  {
    id: 'currency', icon: CurrencyDollarIcon,
    iconColor: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    titleKey: 'settings.currencyTitle', subtitleKey: 'settings.currencySubtitle',
  },
  {
    id: 'appearance', icon: MoonIcon,
    iconColor: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    titleKey: 'settings.appearanceTitle', subtitleKey: 'settings.appearanceSubtitle',
  },
  {
    id: 'backup', icon: CloudArrowUpIcon,
    iconColor: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    titleKey: 'settings.backupTitle', subtitleKey: 'settings.backupSubtitle',
  },
  {
    id: 'device', icon: AdjustmentsHorizontalIcon,
    iconColor: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    titleKey: 'settings.deviceTitle', subtitleKey: 'settings.deviceSubtitle',
  },
  {
    id: 'fiscal', icon: DocumentTextIcon,
    iconColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    titleKey: 'settings.fiscalTitle', subtitleKey: 'settings.fiscalSubtitle',
  },
  {
    id: 'database', icon: ServerStackIcon,
    iconColor: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
    titleKey: 'settings.databaseTitle', subtitleKey: 'settings.databaseSubtitle',
  },
]

export default function SettingsScreen() {
  const { t } = useTranslation()
  const { storeId, session, logout, businessType } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogout, setShowLogout] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [showBusinessType, setShowBusinessType] = useState(false)
  const [requestedType, setRequestedType] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // Form states
  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [receiptHeader, setReceiptHeader] = useState('')
  const [receiptFooter, setReceiptFooter] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'))
  const { currency, currencySymbol, currencyDecimals, updateCurrency, load: loadCurrency } = useSettingsStore()
  const [currencyCode, setCurrencyCode] = useState('')
  const [currencySym, setCurrencySym] = useState('')
  const [currencyDec, setCurrencyDec] = useState('')

  // Inventory settings
  const [defaultLowStock, setDefaultLowStock] = useState('5')
  const [lowStockAlerts, setLowStockAlerts] = useState(true)
  const [expiryAlertDays, setExpiryAlertDays] = useState('30')
  const [autoStockDeduction, setAutoStockDeduction] = useState(true)
  const [defaultMarkup, setDefaultMarkup] = useState('30')

  // Sales settings
  const [defaultPayment, setDefaultPayment] = useState('cash')
  const [receiptAutoPrint, setReceiptAutoPrint] = useState(false)
  const [holdExpiryHours, setHoldExpiryHours] = useState('24')
  const [priceTierEnabled, setPriceTierEnabled] = useState(false)

  // Fiscal fields
  const [nif, setNif] = useState('')
  const [nis, setNis] = useState('')
  const [rc, setRc] = useState('')
  const [article, setArticle] = useState('')
  const [invoiceSeries, setInvoiceSeries] = useState('A')

  // Backup states
  const [backupData, setBackupData] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => { loadCurrency(storeId) }, [storeId, loadCurrency])
  useEffect(() => {
    setCurrencyCode(currency)
    setCurrencySym(currencySymbol)
    setCurrencyDec(String(currencyDecimals))
  }, [currency, currencySymbol, currencyDecimals])

  const { data: profile, isLoading } = useQuery({
    queryKey: ['settings', storeId],
    queryFn: () => settingsRepository.get(storeId),
    enabled: !!storeId,
  })

  useEffect(() => {
    if (profile) {
      setStoreName(profile.store_name || '')
      setPhone(profile.phone || '')
      setAddress(profile.address || '')
      setReceiptHeader(profile.receipt_header || '')
      setReceiptFooter(profile.receipt_footer || '')
      setDefaultLowStock(String(profile.default_low_stock_threshold ?? 5))
      setLowStockAlerts(profile.low_stock_alerts ?? true)
      setExpiryAlertDays(String(profile.expiry_alert_days ?? 30))
      setAutoStockDeduction(profile.auto_stock_deduction ?? true)
      setDefaultMarkup(String(profile.default_purchase_markup ?? 30))
      setDefaultPayment(profile.default_payment_method || 'cash')
      setReceiptAutoPrint(profile.receipt_auto_print ?? false)
      setHoldExpiryHours(String(profile.hold_expiry_hours ?? 24))
      setPriceTierEnabled(profile.price_tier_enabled ?? false)
      setNif(profile.nif || '')
      setNis(profile.nis || '')
      setRc(profile.rc || '')
      setArticle(profile.article || '')
      setInvoiceSeries(profile.invoice_series || 'A')
    }
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: (data) => settingsRepository.update(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['settings']); toast.success(t('toast.settingsSaved')) },
    onError: () => toast.error(t('toast.saveFailed')),
  })

  const handleSaveStore = () => saveMutation.mutate({ store_name: storeName, phone, address })
  const handleSaveReceipts = () => saveMutation.mutate({ receipt_header: receiptHeader, receipt_footer: receiptFooter })

  const handleSaveInventory = () => saveMutation.mutate({
    default_low_stock_threshold: parseInt(defaultLowStock) || 5,
    low_stock_alerts: lowStockAlerts,
    expiry_alert_days: parseInt(expiryAlertDays) || 30,
    auto_stock_deduction: autoStockDeduction,
    default_purchase_markup: parseFloat(defaultMarkup) || 30,
  })

  const handleSaveFiscal = () => saveMutation.mutate({
    nif, nis, rc, article,
    invoice_series: invoiceSeries,
  })

  const handleSaveSales = () => saveMutation.mutate({
    default_payment_method: defaultPayment,
    receipt_auto_print: receiptAutoPrint,
    hold_expiry_hours: parseInt(holdExpiryHours) || 24,
    price_tier_enabled: priceTierEnabled,
  })

  const handleSaveCurrency = async () => {
    try {
      await updateCurrency(storeId, { currency: currencyCode, currencySymbol: currencySym, currencyDecimals: parseInt(currencyDec) || 2 })
      toast.success(t('toast.settingsSaved'))
      setActiveSection(null)
    } catch { toast.error(t('toast.saveFailed')) }
  }

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {       toast.error(t('settings.passwordsNotMatch')); return }
    if (profile?.reports_password) {
      const valid = await settingsRepository.verifyReportsPassword(storeId, currentPw)
      if (!valid) { toast.error(t('reports.passwordWrong')); return }
    }
    await settingsRepository.setReportsPassword(storeId, newPw)
    toast.success(t('toast.settingsSaved'))
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setActiveSection(null)
  }

  const toggleDarkMode = () => {
    const isDark = !darkMode
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('darkMode', isDark ? 'true' : 'false')
  }

  const { data: latestRequest, refetch: refetchRequest } = useQuery({
    queryKey: ['bt_change_request', storeId],
    queryFn: () => businessTypeChangeRequestRepository.getLatest(storeId),
    enabled: !!storeId,
  })

  const openBusinessTypeSheet = () => {
    setRequestedType('')
    setRequestNote('')
    setShowBusinessType(true)
  }

  const handleSubmitChangeRequest = async () => {
    if (!requestedType || requestedType === businessType) {
      toast.error(t('settings.businessTypePickDifferent'))
      return
    }
    setSubmittingRequest(true)
    try {
      await businessTypeChangeRequestRepository.create(storeId, {
        currentType: businessType,
        requestedType,
        note: requestNote,
      })
      toast.success(t('settings.businessTypeRequestSent'))
      refetchRequest()
      setShowBusinessType(false)
    } catch (err) {
      if (err.message === 'PENDING_REQUEST_EXISTS') {
        toast.error(t('settings.businessTypePendingExists'))
      } else {
        toast.error(err.message || t('common.error'))
      }
    } finally {
      setSubmittingRequest(false)
    }
  }

  const requestStatusLabel = {
    pending: t('settings.businessTypeStatusPending'),
    approved: t('settings.businessTypeStatusApproved'),
    rejected: t('settings.businessTypeStatusRejected'),
  }

  if (isLoading) return <div className="p-4"><LoadingSkeleton count={8} /></div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const from = location?.state?.from
                if (from === '/app/reports') navigate('/app/reports', { replace: true })
                else navigate(-1)
              }}
              className="h-10 w-10 grid place-items-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-transform"
              aria-label={t('common.back')}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('settings.title')}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.title')}</p>
          </div>
          </div>
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-semibold active:scale-95 transition-transform"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            {t('auth.logout')}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-2">
        {/* Settings sections */}
        {SETTINGS_SECTIONS.map((section, i) => (
          <motion.button
            key={section.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setActiveSection(section.id)}
            className="w-full card flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${section.iconColor}`}>
              <section.icon className="h-6 w-6" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 text-start">
              <p className="font-bold text-sm text-gray-900 dark:text-gray-50">{t(section.titleKey)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t(section.subtitleKey)}</p>
            </div>

            {/* Arrow */}
            <ChevronLeftIcon className="h-5 w-5 text-gray-400 shrink-0" />
          </motion.button>
        ))}

        {/* Business-type module shortcuts (mobile) */}
        {getExtraModuleRoutes(businessType).length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2 px-1">{t('nav.tools')}</p>
            <div className="grid grid-cols-2 gap-2">
              {getExtraModuleRoutes(businessType).map(item => (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(item.path)}
                  className="card p-3 text-start active:scale-[0.98] transition-transform"
                >
                  <p className="font-bold text-sm text-gray-900 dark:text-gray-50">{t(item.labelKey)}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Business type — read-only; request change via admin */}
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          onClick={openBusinessTypeSheet}
          className="w-full card flex items-center gap-4 active:scale-[0.98] transition-transform"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-50">{t('settings.businessType')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {getBusinessType(businessType)?.label || t('settings.businessTypeUnset')}
            </p>
            {latestRequest?.status === 'pending' && (
              <p className="text-[10px] text-amber-600 mt-0.5">{t('settings.businessTypeStatusPending')}</p>
            )}
          </div>
          <ChevronLeftIcon className="h-5 w-5 text-gray-400 shrink-0" />
        </motion.button>

        {/* Show tutorial */}
        <button onClick={() => setShowTour(true)}
          className="w-full card flex items-center gap-4 active:scale-[0.98] transition-transform">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            🎓
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="font-bold text-sm text-gray-900 dark:text-gray-50">{t('settings.showTour')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.tourButtonDesc')}</p>
          </div>
          <ChevronLeftIcon className="h-5 w-5 text-gray-400 shrink-0" />
        </button>

        <WelcomeTour force={showTour} onDone={() => setShowTour(false)} />

        {/* App info */}
        <div className="flex items-center gap-3 pt-4 pb-2 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            👑
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 dark:text-gray-50">KMS POS</p>
            <p className="text-xs text-gray-400">{t('settings.appSubtitle')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{t('settings.appRights')}</p>
          </div>
        </div>
      </main>

      {/* ─── Store Settings Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'store'} onClose={() => setActiveSection(null)} title={t('settings.storeTitle')} large>
        <div className="space-y-4">
          <FormInput label={t('settings.storeName')} value={storeName} onChange={setStoreName} />
          <FormInput label={t('settings.phone')} value={phone} onChange={setPhone} type="tel" dir="ltr" />
          <FormInput label={t('settings.address')} value={address} onChange={setAddress} />
          <button onClick={() => { handleSaveStore(); setActiveSection(null) }} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      {/* ─── Receipts Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'receipts'} onClose={() => setActiveSection(null)} title={t('settings.receiptsTitle')} large>
        <div className="space-y-4">
          <FormInput label={t('settings.receiptHeader')} value={receiptHeader} onChange={setReceiptHeader} />
          <FormInput label={t('settings.receiptFooter')} value={receiptFooter} onChange={setReceiptFooter} />
          {/* Live preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center space-y-1 text-sm border border-dashed border-gray-300 dark:border-gray-600">
            <p className="font-bold text-lg">{storeName || t('settings.receiptPreviewStore')}</p>
            {receiptHeader && <p className="text-gray-500">{receiptHeader}</p>}
            <p className="text-gray-400">— — — — —</p>
            <p className="text-xs text-gray-400">{t('settings.receiptPreviewProducts')}</p>
            <p className="text-gray-400">— — — — —</p>
            <p className="font-bold text-green-600">{t('settings.receiptPreviewTotal', { amount: formatCurrency(0) })}</p>
            {receiptFooter && <p className="text-gray-500 text-xs mt-2">{receiptFooter}</p>}
          </div>
          <button onClick={() => { handleSaveReceipts(); setActiveSection(null) }} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      {/* ─── Security Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'security'} onClose={() => setActiveSection(null)} title={t('settings.securityTitle')} large>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.changeReportsPassword')}</p>
          {profile?.reports_password && (
            <FormInput label={t('settings.currentPassword')} value={currentPw} onChange={setCurrentPw} type="password" dir="ltr" />
          )}
          <FormInput label={t('settings.newPassword')} value={newPw} onChange={setNewPw} type="password" dir="ltr" />
          <FormInput label={t('settings.confirmPassword')} value={confirmPw} onChange={setConfirmPw} type="password" dir="ltr" />
          <button onClick={handleChangePassword} className="btn-primary">{t('common.save')}</button>
        </div>
      </BottomSheet>

      {/* ─── Currency Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'currency'} onClose={() => setActiveSection(null)} title={t('settings.currency')}>
        <div className="space-y-4">
          <FormInput label={t('settings.currencyLabel')} value={currencyCode} onChange={setCurrencyCode} placeholder="DZD" dir="ltr" />
          <FormInput label={t('settings.currencySymbol')} value={currencySym} onChange={setCurrencySym} placeholder="د.ج" dir="ltr" />
          <FormInput label={t('settings.currencyDecimals')} value={currencyDec} onChange={setCurrencyDec} placeholder="2" type="number" dir="ltr" />
          <p className="text-xs text-gray-400">{t('settings.currencyHelp')}</p>
          <button onClick={handleSaveCurrency} className="btn-primary">{t('common.save')}</button>
        </div>
      </BottomSheet>

      {/* ─── Appearance Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'appearance'} onClose={() => setActiveSection(null)} title={t('settings.appearanceTitle')}>
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <MoonIcon className="h-5 w-5 text-indigo-500" /> : <SunIcon className="h-5 w-5 text-amber-500" />}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.darkMode')}</span>
              </div>
              <button onClick={toggleDarkMode}
                className={`relative w-12 h-7 rounded-full transition-colors ${darkMode ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'start-0.5' : 'end-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="card p-4">
            <LanguageSwitcher />
          </div>
        </div>
      </BottomSheet>

      {/* ─── Inventory Settings ─── */}
      <BottomSheet isOpen={activeSection === 'inventory'} onClose={() => setActiveSection(null)} title={t('settings.inventoryTitle')} large>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('settings.inventoryGeneral')}</p>
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.defaultLowStock')}</span>
                  <input type="number" value={defaultLowStock} onChange={e => setDefaultLowStock(e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center" dir="ltr" />
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.lowStockAlerts')}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t('settings.lowStockAlertsHint')}</p>
                  </div>
                  <button onClick={() => setLowStockAlerts(!lowStockAlerts)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${lowStockAlerts ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${lowStockAlerts ? 'start-[22px]' : 'start-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.expiryAlertDays')}</span>
                  <input type="number" value={expiryAlertDays} onChange={e => setExpiryAlertDays(e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center" dir="ltr" />
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.autoStockDeduction')}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t('settings.autoStockDeductionHint')}</p>
                  </div>
                  <button onClick={() => setAutoStockDeduction(!autoStockDeduction)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${autoStockDeduction ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${autoStockDeduction ? 'start-[22px]' : 'start-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.defaultMarkup')}</span>
                  <input type="number" value={defaultMarkup} onChange={e => setDefaultMarkup(e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center" dir="ltr" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => { handleSaveInventory(); setActiveSection(null) }} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      {/* ─── Fiscal Section ─── */}
      <BottomSheet isOpen={activeSection === 'fiscal'} onClose={() => setActiveSection(null)} title={t('settings.fiscalTitle')} large>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">{t('settings.fiscalHint')}</p>
          <FormInput label="NIF" value={nif} onChange={setNif} dir="ltr" placeholder="000000000000000" />
          <FormInput label="NIS" value={nis} onChange={setNis} dir="ltr" placeholder="000000000000000" />
          <FormInput label="RC" value={rc} onChange={setRc} dir="ltr" placeholder="000000000000000" />
          <FormInput label={t('settings.article')} value={article} onChange={setArticle} dir="ltr" placeholder="0000/A-00" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.invoiceSeries')}
            </label>
            <select value={invoiceSeries} onChange={(e) => setInvoiceSeries(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm text-gray-900 dark:text-gray-100">
              <option value="A">{t('settings.seriesA')}</option>
              <option value="B">{t('settings.seriesB')}</option>
              <option value="C">{t('settings.seriesC')}</option>
            </select>
          </div>
          <button onClick={() => { handleSaveFiscal(); setActiveSection(null) }} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      {/* ─── Sales Settings ─── */}
      <BottomSheet isOpen={activeSection === 'sales'} onClose={() => setActiveSection(null)} title={t('settings.salesTitle')} large>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('settings.salesSettings')}</p>
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.defaultPaymentMethod')}</span>
                  <select value={defaultPayment} onChange={e => setDefaultPayment(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
                    <option value="cash">{t('settings.paymentCash')}</option>
                    <option value="card">{t('settings.paymentCard')}</option>
                    <option value="credit">{t('settings.paymentCredit')}</option>
                    <option value="cheque">{t('settings.paymentCheque')}</option>
                    <option value="transfer">{t('settings.paymentTransfer')}</option>
                  </select>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.receiptAutoPrint')}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t('settings.receiptAutoPrintHint')}</p>
                  </div>
                  <button onClick={() => setReceiptAutoPrint(!receiptAutoPrint)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${receiptAutoPrint ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${receiptAutoPrint ? 'start-[22px]' : 'start-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.holdExpiryHours')}</span>
                  <input type="number" value={holdExpiryHours} onChange={e => setHoldExpiryHours(e.target.value)}
                    className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center" dir="ltr" />
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.priceTiers')}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t('settings.priceTiersHint')}</p>
                  </div>
                  <button onClick={() => setPriceTierEnabled(!priceTierEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${priceTierEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${priceTierEnabled ? 'start-[22px]' : 'start-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => { handleSaveSales(); setActiveSection(null) }} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      {/* ─── Backup & Restore ─── */}
      <BottomSheet isOpen={activeSection === 'backup'} onClose={() => setActiveSection(null)} title={t('settings.backupTitle')} large>
        <div className="space-y-5">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{t('settings.exportTitle')}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t('settings.exportDesc')}</p>
              </div>
              <button onClick={async () => {
                setIsExporting(true)
                try {
                  const { supabase } = await import('../../lib/supabase')
                  const tables = ['products', 'categories', 'suppliers', 'customers', 'sales', 'purchases', 'batches', 'appointments', 'work_orders']
                  const exportObj = {}
                  for (const table of tables) {
                    const { data } = await supabase.from(table).select('*').eq('store_id', storeId)
                    if (data) exportObj[table] = data
                  }
                  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                    toast.success(t('settings.exportSuccess'))
                  } catch { toast.error(t('settings.exportFailed')) }
                finally { setIsExporting(false) }
              }} disabled={isExporting}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform">
                {isExporting ? t('settings.exporting') : t('settings.exportBtn')}
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{t('settings.importTitle')}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t('settings.importDesc')}</p>
              </div>
              <label className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold cursor-pointer active:scale-95 transition-transform">
                {t('settings.importBtn')}
                <input type="file" accept=".json" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const text = await file.text()
                    const data = JSON.parse(text)
                    const { supabase } = await import('../../lib/supabase')
                    let imported = 0
                    for (const [table, rows] of Object.entries(data)) {
                      if (!Array.isArray(rows)) continue
                      for (const row of rows) {
                        const { error } = await supabase.from(table).upsert(
                          { ...row, store_id: storeId, updated_at: new Date().toISOString() },
                          { onConflict: 'id' }
                        )
                        if (!error) imported++
                      }
                    }
                    toast.success(t('settings.importSuccess', { count: imported }))
                    queryClient.invalidateQueries()
                  } catch { toast.error(t('settings.importError')) }
                  e.target.value = ''
                }} className="hidden" />
              </label>
            </div>
          </div>

          <div className="card p-4 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600">{t('settings.clearLocalData')}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t('settings.clearLocalDataDesc')}</p>
              </div>
              <button onClick={() => {
                localStorage.clear()
                toast.success(t('settings.clearSuccess'))
                setTimeout(() => window.location.reload(), 1000)
              }}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-transform">
                {t('settings.clearBtn')}
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* ─── Device Modules Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'device'} onClose={() => setActiveSection(null)} title={t('settings.deviceModules')} large>
        <DeviceModulesSection />
      </BottomSheet>

      {/* ─── Database (HFSQL) Sheet ─── */}
      <BottomSheet isOpen={activeSection === 'database'} onClose={() => setActiveSection(null)} title={t('settings.databaseTitle')} large>
        <HfsqlSection />
      </BottomSheet>

      {/* ─── Business Type Sheet (read-only + request) ─── */}
      <BottomSheet isOpen={showBusinessType} onClose={() => setShowBusinessType(false)} title={t('settings.businessType')} large>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">{t('settings.businessTypeCurrent')}</p>
            <p className="font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <span className="text-xl">{getBusinessType(businessType)?.icon}</span>
              {getBusinessType(businessType)?.label || t('settings.businessTypeUnset')}
            </p>
            <p className="text-xs text-gray-400 mt-2">{t('settings.businessTypeReadOnlyHint')}</p>
          </div>

          {latestRequest && (
            <div className={`p-3 rounded-xl text-sm ${
              latestRequest.status === 'pending' ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20' :
              latestRequest.status === 'approved' ? 'bg-green-50 text-green-800 dark:bg-green-900/20' :
              'bg-red-50 text-red-800 dark:bg-red-900/20'
            }`}>
              <p className="font-semibold">{requestStatusLabel[latestRequest.status]}</p>
              <p className="text-xs mt-1">
                {t('settings.businessTypeRequested')}: {getBusinessType(latestRequest.requested_type)?.label}
              </p>
              {latestRequest.note && <p className="text-xs mt-1 opacity-80">{latestRequest.note}</p>}
            </div>
          )}

          {latestRequest?.status !== 'pending' && (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.businessTypeRequestTitle')}</p>
              <select
                value={requestedType}
                onChange={(e) => setRequestedType(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm"
              >
                <option value="">{t('settings.businessTypeSelect')}</option>
                {BUSINESS_TYPES.filter(bt => bt.id !== businessType).map(bt => (
                  <option key={bt.id} value={bt.id}>{bt.icon} {bt.label}</option>
                ))}
              </select>
              <FormInput label={t('settings.businessTypeNote')} value={requestNote} onChange={setRequestNote} />
              <button
                onClick={handleSubmitChangeRequest}
                disabled={!requestedType || submittingRequest}
                className="btn-primary"
              >
                {submittingRequest ? t('common.loading') : t('settings.businessTypeSubmitRequest')}
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={showLogout} onClose={() => setShowLogout(false)} onConfirm={logout}
        title={t('auth.logout')} message={t('auth.logoutConfirm')} confirmLabel={t('auth.logout')} />
    </motion.div>
  )
}

