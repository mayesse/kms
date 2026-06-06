import { supabase } from '../lib/supabase'
import { activityLogRepository } from './activityLogRepository'
import { checkTrialLimit } from './trialRepository'

export const productRepository = {
  normalizeBarcode(barcode) {
    if (typeof barcode !== 'string') return barcode || null
    const trimmed = barcode.trim()
    return trimmed || null
  },

  async releaseInactiveBarcodeConflicts(storeId, barcodes, exceptProductId = null) {
    const uniqueBarcodes = [...new Set((barcodes || []).map(this.normalizeBarcode).filter(Boolean))]
    if (uniqueBarcodes.length === 0) return

    for (const barcode of uniqueBarcodes) {
      let productQuery = supabase
        .from('products')
        .update({ barcode: null, updated_at: new Date().toISOString() })
        .eq('store_id', storeId)
        .eq('barcode', barcode)
        .eq('is_active', false)

      if (exceptProductId) productQuery = productQuery.neq('id', exceptProductId)

      const { error: productError } = await productQuery
      if (productError) throw productError

      const { data: matchingUnits, error: unitLookupError } = await supabase
        .from('product_units')
        .select('id, product_id')
        .eq('store_id', storeId)
        .eq('barcode', barcode)

      if (unitLookupError) throw unitLookupError

      const productIds = [...new Set((matchingUnits || []).map(u => u.product_id).filter(Boolean))]
      if (productIds.length === 0) continue

      let inactiveProductsQuery = supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', false)
        .in('id', productIds)

      if (exceptProductId) inactiveProductsQuery = inactiveProductsQuery.neq('id', exceptProductId)

      const { data: inactiveProducts, error: inactiveProductsError } = await inactiveProductsQuery
      if (inactiveProductsError) throw inactiveProductsError

      const inactiveProductIds = new Set((inactiveProducts || []).map(p => p.id))
      const inactiveUnitIds = (matchingUnits || [])
        .filter(unit => inactiveProductIds.has(unit.product_id))
        .map(unit => unit.id)

      if (inactiveUnitIds.length > 0) {
        const { error: unitDeleteError } = await supabase
          .from('product_units')
          .delete()
          .eq('store_id', storeId)
          .in('id', inactiveUnitIds)

        if (unitDeleteError) throw unitDeleteError
      }
    }
  },

  async getAll(storeId, filters = {}) {
    let query = supabase
      .from('products')
      .select('*, categories(name, color), product_units(*), product_variants(*)')
      .eq('store_id', storeId)
      .eq('is_active', true)

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)
    }
    if (filters.carSearch) {
      const s = filters.carSearch.replace(/%/g, '')
      query = query.or(
        `name.ilike.%${s}%,car_oem.ilike.%${s}%,car_make.ilike.%${s}%,car_model.ilike.%${s}%,car_year.ilike.%${s}%`
      )
    }
    if (filters.carOem) {
      query = query.ilike('car_oem', `%${filters.carOem.replace(/%/g, '')}%`)
    }
    if (filters.carMake) {
      query = query.ilike('car_make', `%${filters.carMake.replace(/%/g, '')}%`)
    }
    if (filters.carModel) {
      query = query.ilike('car_model', `%${filters.carModel.replace(/%/g, '')}%`)
    }
    if (filters.carYear) {
      query = query.ilike('car_year', `%${filters.carYear.replace(/%/g, '')}%`)
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters.noBarcode) {
      query = query.is('barcode', null)
    }

    const { data, error } = await query.order('name')
    if (error) throw error
    let products = data || []

    // Include products matched by unit barcode in search results.
    if (filters.search) {
      const { data: unitHits } = await supabase
        .from('product_units')
        .select('product_id')
        .eq('store_id', storeId)
        .ilike('barcode', `%${filters.search}%`)

      const productIdsFromUnits = [...new Set((unitHits || []).map(u => u.product_id).filter(Boolean))]
      const existingIds = new Set(products.map(p => p.id))
      const missingIds = productIdsFromUnits.filter(id => !existingIds.has(id))

      if (missingIds.length > 0) {
        let unitQuery = supabase
          .from('products')
          .select('*, categories(name, color), product_units(*), product_variants(*)')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .in('id', missingIds)

        if (filters.categoryId) {
          unitQuery = unitQuery.eq('category_id', filters.categoryId)
        }
        if (filters.noBarcode) {
          unitQuery = unitQuery.is('barcode', null)
        }

        const { data: unitMatchedProducts } = await unitQuery
        products = [...products, ...(unitMatchedProducts || [])]
      }
    }

    if (filters.lowStockOnly) {
      products = products.filter(p => p.quantity <= p.min_stock_threshold)
    }
    return products
  },

  async getByBarcode(storeId, barcode) {
    // Try variant barcode first (clothing SKUs)
    const { data: variantHit } = await supabase
      .from('product_variants')
      .select('*, products(*, categories(name, color), product_units(*), product_variants(*))')
      .eq('store_id', storeId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle()

    if (variantHit?.products) {
      const product = { ...variantHit.products, scanned_variant: variantHit }
      product.scanned_barcode = barcode
      return product
    }

    // First try finding the product by its main barcode
    let { data, error } = await supabase
      .from('products')
      .select('*, categories(name, color), product_units(*), product_variants(*)')
      .eq('store_id', storeId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      // Try finding by unit barcode
      const { data: unitData } = await supabase
        .from('product_units')
        .select('product_id')
        .eq('store_id', storeId)
        .eq('barcode', barcode)
        .maybeSingle()

      if (unitData) {
        const { data: prod } = await supabase
          .from('products')
          .select('*, categories(name, color), product_units(*), product_variants(*)')
          .eq('store_id', storeId)
          .eq('id', unitData.product_id)
          .eq('is_active', true)
          .maybeSingle()
        data = prod
      }
    }

    if (!data) {
      // Try finding by supplementary barcodes
      const { data: suppMatch } = await supabase
        .from('products')
        .select('*, categories(name, color), product_units(*), product_variants(*)')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .contains('supplementary_barcodes', [barcode])
        .maybeSingle()

      data = suppMatch
    }

    // Attach the scanned barcode to the object so POS knows which unit was scanned
    if (data) {
      data.scanned_barcode = barcode
    }

    return data || null
  },

  async getById(storeId, id) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name, color), product_units(*), product_variants(*)')
      .eq('store_id', storeId)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(storeId, productData, unitsData = []) {
    await checkTrialLimit(storeId, 'products')
    const mainBarcode = this.normalizeBarcode(productData.barcode)
    const unitBarcodes = unitsData.map(u => this.normalizeBarcode(u.barcode))
    const suppBarcodes = (productData.supplementary_barcodes || []).map(b => this.normalizeBarcode(b)).filter(Boolean)
    await this.releaseInactiveBarcodeConflicts(storeId, [mainBarcode, ...unitBarcodes, ...suppBarcodes])

    const { data, error } = await supabase
      .from('products')
      .insert({ ...productData, barcode: mainBarcode, supplementary_barcodes: suppBarcodes, store_id: storeId })
      .select()
      .single()

    if (error) throw error

    // Insert units
    if (unitsData.length > 0) {
      const unitsToInsert = unitsData.map(u => ({
        ...u,
        barcode: this.normalizeBarcode(u.barcode),
        product_id: data.id,
        store_id: storeId,
      }))
      const { error: unitErr } = await supabase.from('product_units').insert(unitsToInsert)
      if (unitErr) console.error('Failed to insert units:', unitErr)
    }

    await activityLogRepository.log(storeId, 'product_created', 'product',
      data.id, data.name, null, null)

    return data
  },

  async update(storeId, id, updateData, unitsData = []) {
    const mainBarcode = this.normalizeBarcode(updateData.barcode)
    const unitBarcodes = unitsData.map(u => this.normalizeBarcode(u.barcode))
    const suppBarcodes = (updateData.supplementary_barcodes || []).map(b => this.normalizeBarcode(b)).filter(Boolean)
    await this.releaseInactiveBarcodeConflicts(storeId, [mainBarcode, ...unitBarcodes, ...suppBarcodes], id)

    const { data, error } = await supabase
      .from('products')
      .update({ ...updateData, barcode: mainBarcode, supplementary_barcodes: suppBarcodes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    // Replace units
    await supabase.from('product_units').delete().eq('product_id', id).eq('store_id', storeId)
    if (unitsData.length > 0) {
      const unitsToInsert = unitsData.map(u => ({
        ...u,
        barcode: this.normalizeBarcode(u.barcode),
        product_id: id,
        store_id: storeId,
      }))
      const { error: unitErr } = await supabase.from('product_units').insert(unitsToInsert)
      if (unitErr) console.error('Failed to insert units:', unitErr)
    }

    await activityLogRepository.log(storeId, 'product_updated', 'product',
      data.id, data.name, updateData, null)

    return data
  },

  async delete(storeId, id) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false, barcode: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    const { error: unitDeleteError } = await supabase
      .from('product_units')
      .delete()
      .eq('product_id', id)
      .eq('store_id', storeId)

    if (unitDeleteError) throw unitDeleteError

    await activityLogRepository.log(storeId, 'product_deleted', 'product',
      id, data.name, null, null)

    return data
  },

  async adjustStock(storeId, id, delta, reason) {
    // First get current product
    const { data: product } = await supabase
      .from('products')
      .select('name, quantity')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()

    const newQty = (product?.quantity || 0) + delta

    const { data, error } = await supabase
      .from('products')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    await activityLogRepository.log(storeId, 'stock_adjusted', 'product',
      id, product?.name, { delta, reason, new_qty: newQty }, null)

    return data
  },

  async getLowStock(storeId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories(name, color), product_units(*), product_variants(*)')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('quantity')

    if (error) throw error
    return (products || []).filter(p => p.quantity <= p.min_stock_threshold)
  },

  async getStockValue(storeId) {
    const { data, error } = await supabase
      .from('products')
      .select('quantity, purchase_price')
      .eq('store_id', storeId)
      .eq('is_active', true)

    if (error) throw error

    return (data || []).reduce((sum, p) =>
      sum + (Math.max(0, p.quantity) * parseFloat(p.purchase_price || 0)), 0)
  },
}
