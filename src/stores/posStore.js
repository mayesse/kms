import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { resolveTierPrice } from '../utils/priceTier'
import i18next from 'i18next'

function buildCartItemId(product, options = {}) {
  const { selectedUnit, variant } = options
  if (variant) return `${product.id}_v_${variant.id}`
  const unitName = selectedUnit ? selectedUnit.name : (product.base_unit || i18next.t('pos.unitPc'))
  return `${product.id}_${unitName}`
}

function buildDisplayName(product, variant) {
  if (!variant) return product.name
  const parts = [product.name]
  if (variant.size) parts.push(variant.size)
  if (variant.color) parts.push(variant.color)
  return parts.join(' — ')
}

function applyTierToItem(item, qty, priceTierMap) {
  if (!item.product_id || item.is_service) return item
  const tiers = priceTierMap[item.product_id]
  const base = item.base_unit_price ?? item.unit_price
  const { unitPrice, tierName } = resolveTierPrice(qty, tiers, base)
  return { ...item, qty, unit_price: unitPrice, tier_name: tierName, base_unit_price: base }
}

export const usePosStore = create(persist((set, get) => ({
  cart: [],
  checkoutDefaults: null,
  priceTierMap: {},
  activeBranchId: null,
  activeTableId: null,
  activeTableName: null,

  setPriceTierMap: (map) => set({ priceTierMap: map }),

  setActiveBranch: (branchId) => set({ activeBranchId: branchId }),

  setActiveTable: (tableId, tableName) => set({ activeTableId: tableId, activeTableName: tableName }),

  clearActiveTable: () => set({ activeTableId: null, activeTableName: null }),

  addToCart: (product, selectedUnit = null, variant = null) => set((state) => {
    const cartItemId = buildCartItemId(product, { selectedUnit, variant })
    const unitName = variant
      ? [variant.size, variant.color].filter(Boolean).join('/') || i18next.t('pos.defaultVariant')
      : selectedUnit ? selectedUnit.name : (product.base_unit || i18next.t('pos.unitPc'))

    const unitPrice = variant
      ? parseFloat(variant.selling_price ?? product.selling_price)
      : selectedUnit ? parseFloat(selectedUnit.selling_price) : parseFloat(product.selling_price)

    const purchasePrice = variant
      ? parseFloat(variant.purchase_price ?? product.purchase_price ?? 0)
      : selectedUnit ? parseFloat(selectedUnit.purchase_price) : parseFloat(product.purchase_price || 0)

    const stock = variant ? variant.quantity : product.quantity

    const existing = state.cart.find(i => i.id === cartItemId)
    if (existing) {
      const newQty = existing.qty + 1
      return {
        cart: state.cart.map(i =>
          i.id === cartItemId ? applyTierToItem(i, newQty, state.priceTierMap) : i
        ),
      }
    }

    const newItem = applyTierToItem({
      id: cartItemId,
      product_id: product.id,
      service_id: null,
      variant_id: variant?.id || null,
      product_name: buildDisplayName(product, variant),
      unit_name: unitName,
      conversion_rate: selectedUnit ? parseFloat(selectedUnit.conversion_rate) : 1,
      unit_price: unitPrice,
      base_unit_price: unitPrice,
      purchase_price: purchasePrice,
      qty: 1,
      stock,
      batch_id: null,
      batch_label: null,
      is_service: false,
      tier_name: null,
    }, 1, state.priceTierMap)

    return { cart: [...state.cart, newItem] }
  }),

  addProductWithModifiers: (product, selectedUnit, variant, modifierItems, modifierTotal, modifierLabel) => set((state) => {
    const baseId = buildCartItemId(product, { selectedUnit, variant })
    const cartItemId = `${baseId}_m_${Date.now()}`
    const unitName = variant
      ? [variant.size, variant.color].filter(Boolean).join('/') || i18next.t('pos.defaultVariant')
      : selectedUnit ? selectedUnit.name : (product.base_unit || i18next.t('pos.unitPc'))

    const basePrice = variant
      ? parseFloat(variant.selling_price ?? product.selling_price)
      : selectedUnit ? parseFloat(selectedUnit.selling_price) : parseFloat(product.selling_price)

    const unitPrice = basePrice + parseFloat(modifierTotal || 0)
    const purchasePrice = variant
      ? parseFloat(variant.purchase_price ?? product.purchase_price ?? 0)
      : selectedUnit ? parseFloat(selectedUnit.purchase_price) : parseFloat(product.purchase_price || 0)

    let productName = buildDisplayName(product, variant)
    if (modifierLabel) productName = `${productName} (${modifierLabel})`

    const newItem = applyTierToItem({
      id: cartItemId,
      product_id: product.id,
      service_id: null,
      variant_id: variant?.id || null,
      product_name: productName,
      unit_name: unitName,
      conversion_rate: selectedUnit ? parseFloat(selectedUnit.conversion_rate) : 1,
      unit_price: unitPrice,
      base_unit_price: basePrice,
      purchase_price: purchasePrice,
      qty: 1,
      stock: variant ? variant.quantity : product.quantity,
      batch_id: null,
      batch_label: null,
      is_service: false,
      tier_name: null,
      modifier_note: modifierLabel || null,
    }, 1, state.priceTierMap)

    return { cart: [...state.cart, newItem] }
  }),

  addServiceToCart: (service) => set((state) => {
    const cartItemId = `svc_${service.id}`
    const existing = state.cart.find(i => i.id === cartItemId)
    if (existing) {
      return {
        cart: state.cart.map(i =>
          i.id === cartItemId ? { ...i, qty: i.qty + 1 } : i
        ),
      }
    }
    return {
      cart: [...state.cart, {
        id: cartItemId,
        product_id: null,
        service_id: service.id,
        variant_id: null,
        product_name: service.name,
        unit_name: i18next.t('pos.serviceUnit'),
        conversion_rate: 1,
        unit_price: parseFloat(service.price),
        base_unit_price: parseFloat(service.price),
        purchase_price: 0,
        qty: 1,
        stock: null,
        batch_id: null,
        batch_label: null,
        is_service: true,
        tier_name: null,
      }],
    }
  }),

  setCheckoutDefaults: (defaults) => set({ checkoutDefaults: defaults }),

  clearCheckoutDefaults: () => set({ checkoutDefaults: null }),

  setCartItemBatch: (itemId, batchId, batchLabel) => set((state) => ({
    cart: state.cart.map(i =>
      i.id === itemId ? { ...i, batch_id: batchId, batch_label: batchLabel } : i
    ),
  })),

  addManualItem: (name, price) => set((state) => ({
    cart: [...state.cart, {
      id: `manual_${Date.now()}`,
      product_id: null,
      service_id: null,
      variant_id: null,
      product_name: name,
      unit_name: i18next.t('pos.unitPc'),
      conversion_rate: 1,
      unit_price: parseFloat(price),
      base_unit_price: parseFloat(price),
      purchase_price: 0,
      qty: 1,
      stock: null,
      batch_id: null,
      batch_label: null,
      is_service: false,
      tier_name: null,
    }],
  })),

  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(i => i.id !== itemId),
  })),

  updateQty: (itemId, qty) => set((state) => ({
    cart: qty <= 0
      ? state.cart.filter(i => i.id !== itemId)
      : state.cart.map(i => i.id === itemId ? applyTierToItem(i, qty, state.priceTierMap) : i),
  })),

  clearCart: () => set({ cart: [] }),

  restoreCart: (items) => set({ cart: items }),

  getTotal: () => get().cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0),

  getItemCount: () => get().cart.reduce((sum, i) => sum + i.qty, 0),

  getCartForSale: () => get().cart.map(i => ({
    product_id: i.product_id,
    service_id: i.service_id || null,
    variant_id: i.variant_id || null,
    product_name: i.product_name,
    quantity: i.qty,
    unit_price: i.unit_price,
    purchase_price: i.purchase_price,
    note: null,
    unit_name: i.unit_name,
    conversion_rate: i.conversion_rate,
    batch_id: i.batch_id || null,
  })),
}), {
  name: 'pos-cart',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    cart: state.cart,
    checkoutDefaults: state.checkoutDefaults,
    activeBranchId: state.activeBranchId,
    activeTableId: state.activeTableId,
    activeTableName: state.activeTableName,
  }),
}))
