import ar from '../i18n/ar'

const M = {
  POS: 'pos',
  INV: 'inventory',
  PUR: 'purchases',
  CUS: 'customers',
  DEBT: 'debts',
  HOLD: 'holds',
  REP: 'reports',
  SES: 'sessions',
  SET: 'settings',
  TABLES: 'tables',
  KITCHEN: 'kitchen',
  DELIVERY: 'delivery',
  STAFF: 'staff',
  PROMO: 'promotions',
  BATCHES: 'batches',
  APPT: 'appointments',
  WORK_ORDERS: 'work_orders',
  BRANCH: 'branches',
  TVA: 'tva',
  SERVICES: 'services',
  MODIFIERS: 'modifiers',
}

/** POS layout mode — drives default tab and checkout flow grouping */
export const POS_MODE = {
  RETAIL: 'retail',
  RESTAURANT: 'restaurant',
  SERVICE: 'service',
}

const POS_MODE_MAP = {
  restaurant: POS_MODE.RESTAURANT,
  cafe: POS_MODE.RESTAURANT,
  fastfood: POS_MODE.RESTAURANT,
  bakery: POS_MODE.RESTAURANT,
  service: POS_MODE.SERVICE,
  salon: POS_MODE.SERVICE,
  repair_shop: POS_MODE.SERVICE,
}

export const ALL_MODULES = Object.values(M)

/** Feature flags — drive POS/checkout behavior beyond nav visibility */
export const F = {
  ORDER_TYPES: 'orderTypes',
  TABLE_SERVICE: 'tableService',
  KITCHEN: 'kitchen',
  WEIGHT_PRODUCTS: 'weightProducts',
  BATCH_TRACKING: 'batchTracking',
  CAR_PARTS_FIELDS: 'carPartsFields',
  CASH_ONLY: 'cashOnly',
  VARIANTS: 'variants',
  SERVICES_POS: 'servicesPos',
  STAFF_AT_CHECKOUT: 'staffAtCheckout',
  PRICE_TIERS: 'priceTiers',
  BRANCH_SELECTOR: 'branchSelector',
  TVA_CHECKOUT: 'tvaCheckout',
  OFFLINE_QUEUE: 'offlineQueue',
  EXPIRY_ALERTS: 'expiryAlerts',
  OEM_SEARCH: 'oemSearch',
  WORK_ORDERS: 'workOrders',
  PARTS_LOOKUP: 'partsLookup',
  WEIGHT_SCALE: 'weightScale',
  NO_CCP: 'noCcp',
  SERVICE_CHARGE: 'serviceCharge',
  DELIVERY_FEE: 'deliveryFee',
  MODIFIERS: 'modifiers',
}

const RETAIL_FEATURES = []
const RETAIL_MODULES = [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.HOLD, M.REP, M.SES, M.SET]

/** Extra nav items not in bottom bar — reachable via desktop nav / settings */
export const EXTRA_MODULE_ROUTES = [
  { module: M.STAFF, path: '/app/staff', labelKey: 'nav.staff' },
  { module: M.BATCHES, path: '/app/batches', labelKey: 'nav.batches' },
  { module: M.SERVICES, path: '/app/services', labelKey: 'nav.services' },
  { module: M.MODIFIERS, path: '/app/modifiers', labelKey: 'nav.modifiers' },
  { module: M.TVA, path: '/app/tax-rates', labelKey: 'nav.taxRates' },
  { module: M.APPT, path: '/app/appointments', labelKey: 'nav.appointments' },
  { module: M.WORK_ORDERS, path: '/app/work-orders', labelKey: 'nav.workOrders' },
  { module: M.BRANCH, path: '/app/transfers', labelKey: 'nav.transfers' },
  { module: M.PROMO, path: '/app/promotions', labelKey: 'nav.promotions' },
  { module: M.STAFF, path: '/app/commissions', labelKey: 'nav.commissions' },
]

export const BUSINESS_TYPES = [
  // === RETAIL ===
  {
    id: 'general',
    icon: '🏪',
    label: ar.businessTypes.general,
    description: ar.businessTypes.generalDesc,
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    borderLight: 'border-green-200 dark:border-green-800',
    modules: RETAIL_MODULES,
    features: RETAIL_FEATURES,
  },
  {
    id: 'groceries',
    icon: '🛒',
    label: ar.businessTypes.groceries,
    description: ar.businessTypes.groceriesDesc,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    borderLight: 'border-amber-200 dark:border-amber-800',
    modules: [...RETAIL_MODULES, M.BATCHES],
    features: [...RETAIL_FEATURES, F.WEIGHT_PRODUCTS, F.BATCH_TRACKING],
  },
  {
    id: 'supermarket',
    icon: '🏬',
    label: ar.businessTypes.supermarket,
    description: ar.businessTypes.supermarketDesc,
    color: 'from-red-500 to-red-700',
    bgLight: 'bg-red-50 dark:bg-red-900/20',
    borderLight: 'border-red-200 dark:border-red-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.HOLD, M.REP, M.SES, M.SET, M.STAFF, M.PROMO, M.BATCHES],
    features: [F.BATCH_TRACKING, F.PRICE_TIERS],
  },
  // === FOOD & BEVERAGE ===
  {
    id: 'restaurant',
    icon: '🍽️',
    label: ar.businessTypes.restaurant,
    description: ar.businessTypes.restaurantDesc,
    color: 'from-orange-500 to-red-600',
    bgLight: 'bg-orange-50 dark:bg-orange-900/20',
    borderLight: 'border-orange-200 dark:border-orange-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.REP, M.SES, M.SET, M.TABLES, M.KITCHEN, M.DELIVERY, M.STAFF, M.MODIFIERS],
    features: [F.ORDER_TYPES, F.TABLE_SERVICE, F.KITCHEN, F.MODIFIERS, F.SERVICE_CHARGE, F.DELIVERY_FEE],
  },
  {
    id: 'cafe',
    icon: '☕',
    label: ar.businessTypes.cafe,
    description: ar.businessTypes.cafeDesc,
    color: 'from-amber-600 to-yellow-700',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    borderLight: 'border-amber-200 dark:border-amber-800',
    modules: [M.POS, M.INV, M.PUR, M.REP, M.SES, M.SET, M.TABLES, M.STAFF, M.MODIFIERS],
    features: [F.ORDER_TYPES, F.TABLE_SERVICE, F.MODIFIERS],
  },
  {
    id: 'fastfood',
    icon: '🍔',
    label: ar.businessTypes.fastfood,
    description: ar.businessTypes.fastfoodDesc,
    color: 'from-yellow-500 to-orange-600',
    bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderLight: 'border-yellow-200 dark:border-yellow-800',
    modules: [M.POS, M.INV, M.PUR, M.REP, M.SES, M.SET, M.TABLES, M.KITCHEN, M.DELIVERY, M.STAFF, M.MODIFIERS],
    features: [F.ORDER_TYPES, F.TABLE_SERVICE, F.KITCHEN, F.MODIFIERS, F.SERVICE_CHARGE, F.DELIVERY_FEE],
  },
  {
    id: 'bakery',
    icon: '🥖',
    label: ar.businessTypes.bakery,
    description: ar.businessTypes.bakeryDesc,
    color: 'from-amber-400 to-yellow-600',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    borderLight: 'border-amber-200 dark:border-amber-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.REP, M.SES, M.SET, M.TABLES],
    features: [F.ORDER_TYPES, F.TABLE_SERVICE],
  },
  // === SPECIALTY RETAIL ===
  {
    id: 'car_parts',
    icon: '🚗',
    label: ar.businessTypes.car_parts,
    description: ar.businessTypes.car_partsDesc,
    color: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    borderLight: 'border-blue-200 dark:border-blue-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.REP, M.SES, M.SET],
    features: [F.CAR_PARTS_FIELDS, F.OEM_SEARCH, F.PARTS_LOOKUP],
  },
  {
    id: 'clothing',
    icon: '👕',
    label: ar.businessTypes.clothing,
    description: ar.businessTypes.clothingDesc,
    color: 'from-pink-500 to-rose-600',
    bgLight: 'bg-pink-50 dark:bg-pink-900/20',
    borderLight: 'border-pink-200 dark:border-pink-800',
    modules: RETAIL_MODULES,
    features: [F.VARIANTS],
  },
  {
    id: 'electronics',
    icon: '📱',
    label: ar.businessTypes.electronics,
    description: ar.businessTypes.electronicsDesc,
    color: 'from-cyan-500 to-blue-600',
    bgLight: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderLight: 'border-cyan-200 dark:border-cyan-800',
    modules: [...RETAIL_MODULES, M.BATCHES],
    features: [F.BATCH_TRACKING],
  },
  {
    id: 'pharmacy',
    icon: '💊',
    label: ar.businessTypes.pharmacy,
    description: ar.businessTypes.pharmacyDesc,
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderLight: 'border-emerald-200 dark:border-emerald-800',
    modules: [...RETAIL_MODULES, M.BATCHES],
    features: [F.BATCH_TRACKING, F.EXPIRY_ALERTS],
  },
  // === WHOLESALE & DISTRIBUTION ===
  {
    id: 'wholesale',
    icon: '📦',
    label: ar.businessTypes.wholesale,
    description: ar.businessTypes.wholesaleDesc,
    color: 'from-indigo-500 to-indigo-700',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderLight: 'border-indigo-200 dark:border-indigo-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.REP, M.SES, M.SET, M.BATCHES, M.DELIVERY],
    features: [F.BATCH_TRACKING, F.PRICE_TIERS],
  },
  // === SERVICE BUSINESS ===
  {
    id: 'service',
    icon: '🔧',
    label: ar.businessTypes.service,
    description: ar.businessTypes.serviceDesc,
    color: 'from-gray-500 to-gray-700',
    bgLight: 'bg-gray-50 dark:bg-gray-800',
    borderLight: 'border-gray-200 dark:border-gray-700',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.REP, M.SES, M.SET, M.APPT, M.STAFF, M.SERVICES],
    features: [F.SERVICES_POS, F.STAFF_AT_CHECKOUT],
  },
  {
    id: 'salon',
    icon: '💇',
    label: ar.businessTypes.salon,
    description: ar.businessTypes.salonDesc,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50 dark:bg-violet-900/20',
    borderLight: 'border-violet-200 dark:border-violet-800',
    modules: [M.POS, M.CUS, M.REP, M.SES, M.SET, M.APPT, M.STAFF, M.SERVICES],
    features: [F.SERVICES_POS, F.STAFF_AT_CHECKOUT],
  },
  {
    id: 'repair_shop',
    icon: '🔩',
    label: ar.businessTypes.repair_shop,
    description: ar.businessTypes.repair_shopDesc,
    color: 'from-stone-500 to-stone-700',
    bgLight: 'bg-stone-50 dark:bg-stone-900/20',
    borderLight: 'border-stone-200 dark:border-stone-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.REP, M.SES, M.SET, M.APPT, M.STAFF, M.SERVICES, M.WORK_ORDERS],
    features: [F.SERVICES_POS, F.STAFF_AT_CHECKOUT, F.CAR_PARTS_FIELDS, F.PARTS_LOOKUP, F.WORK_ORDERS],
  },
  // === MOBILE ===
  {
    id: 'mobile_vendor',
    icon: '🚚',
    label: ar.businessTypes.mobile_vendor,
    description: ar.businessTypes.mobile_vendorDesc,
    color: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    borderLight: 'border-purple-200 dark:border-purple-800',
    modules: [M.POS, M.INV, M.REP, M.SES, M.SET],
    features: [F.CASH_ONLY, F.OFFLINE_QUEUE],
  },
  // === FRUITS & VEGETABLES ===
  {
    id: 'fruits_vegetables',
    icon: '🥦',
    label: ar.businessTypes.fruits_vegetables,
    description: ar.businessTypes.fruits_vegetablesDesc,
    color: 'from-lime-500 to-green-600',
    bgLight: 'bg-lime-50 dark:bg-lime-900/20',
    borderLight: 'border-lime-200 dark:border-lime-800',
    modules: [M.POS, M.INV, M.PUR, M.DEBT, M.REP, M.SES, M.SET],
    features: [F.WEIGHT_PRODUCTS, F.WEIGHT_SCALE, F.NO_CCP],
  },
  // === ACCOUNTING / FISCAL ===
  {
    id: 'accounting',
    icon: '🧾',
    label: ar.businessTypes.accounting,
    description: ar.businessTypes.accountingDesc,
    color: 'from-slate-600 to-slate-800',
    bgLight: 'bg-slate-50 dark:bg-slate-900/20',
    borderLight: 'border-slate-200 dark:border-slate-800',
    modules: [...RETAIL_MODULES, M.TVA],
    features: [F.TVA_CHECKOUT],
  },
  // === FRANCHISE / MULTI-BRANCH ===
  {
    id: 'franchise',
    icon: '🏢',
    label: ar.businessTypes.franchise,
    description: ar.businessTypes.franchiseDesc,
    color: 'from-teal-500 to-teal-700',
    bgLight: 'bg-teal-50 dark:bg-teal-900/20',
    borderLight: 'border-teal-200 dark:border-teal-800',
    modules: [M.POS, M.INV, M.PUR, M.CUS, M.DEBT, M.HOLD, M.REP, M.SES, M.SET, M.BRANCH, M.STAFF, M.PROMO],
    features: [F.BATCH_TRACKING, F.PRICE_TIERS, F.BRANCH_SELECTOR],
  },
]

export function getBusinessType(id) {
  return BUSINESS_TYPES.find(t => t.id === id)
}

export function getVisibleModules(businessTypeId) {
  const bt = getBusinessType(businessTypeId)
  return bt ? bt.modules : BUSINESS_TYPES[0].modules
}

export function hasModule(businessTypeId, moduleId) {
  const modules = getVisibleModules(businessTypeId)
  return modules.includes(moduleId)
}

export function getFeatures(businessTypeId) {
  const bt = getBusinessType(businessTypeId)
  return bt?.features || []
}

export function hasFeature(businessTypeId, featureId) {
  return getFeatures(businessTypeId).includes(featureId)
}

/** Visible extra module routes for settings / desktop nav */
export function getExtraModuleRoutes(businessTypeId) {
  return EXTRA_MODULE_ROUTES.filter(r => hasModule(businessTypeId, r.module))
}

export function getPosMode(businessTypeId) {
  const bt = getBusinessType(businessTypeId)
  return bt?.posMode || POS_MODE_MAP[businessTypeId] || POS_MODE.RETAIL
}
