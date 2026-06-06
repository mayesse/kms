import { supabase } from '../lib/supabase'

export const productVariantRepository = {
  async getByProduct(storeId, productId) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('size')
      .order('color')
    if (error) throw error
    return data || []
  },

  async getByBarcode(storeId, barcode) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*, products(*, categories(name, color), product_units(*))')
      .eq('store_id', storeId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async replaceForProduct(storeId, productId, variants) {
    await supabase
      .from('product_variants')
      .delete()
      .eq('store_id', storeId)
      .eq('product_id', productId)

    if (!variants?.length) return []

    const rows = variants.map(v => ({
      store_id: storeId,
      product_id: productId,
      size: v.size?.trim() || null,
      color: v.color?.trim() || null,
      barcode: v.barcode?.trim() || null,
      quantity: parseFloat(v.quantity || 0),
      purchase_price: v.purchase_price != null ? parseFloat(v.purchase_price) : null,
      selling_price: v.selling_price != null ? parseFloat(v.selling_price) : null,
      is_active: true,
    }))

    const { data, error } = await supabase
      .from('product_variants')
      .insert(rows)
      .select()
    if (error) throw error
    return data || []
  },

  async syncProductQuantityFromVariants(storeId, productId) {
    const variants = await this.getByProduct(storeId, productId)
    const total = variants.reduce((sum, v) => sum + parseFloat(v.quantity || 0), 0)
    await supabase
      .from('products')
      .update({ quantity: total, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('store_id', storeId)
    return total
  },
}
