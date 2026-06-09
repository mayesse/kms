import { supabase } from '../lib/supabase'

export const modifierRepository = {
  async getGroupsWithItems(storeId) {
    const { data: groups, error } = await supabase
      .from('modifier_groups')
      .select('*, modifier_items(*)')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (groups || []).map(g => ({
      ...g,
      modifier_items: (g.modifier_items || []).filter(i => i.is_active !== false),
    }))
  },

  async getGroupsForProduct(storeId, productId) {
    const { data, error } = await supabase
      .from('product_modifiers')
      .select('group_id, modifier_groups(*, modifier_items(*))')
      .eq('store_id', storeId)
      .eq('product_id', productId)
    if (error) throw error
    return (data || [])
      .map(row => row.modifier_groups)
      .filter(Boolean)
      .map(g => ({
        ...g,
        modifier_items: (g.modifier_items || []).filter(i => i.is_active !== false),
      }))
  },

  async setProductGroups(storeId, productId, groupIds) {
    await supabase.from('product_modifiers').delete().eq('product_id', productId).eq('store_id', storeId)
    if (!groupIds?.length) return
    const rows = groupIds.map(groupId => ({
      product_id: productId,
      group_id: groupId,
      store_id: storeId,
    }))
    const { error } = await supabase.from('product_modifiers').insert(rows)
    if (error) throw error
  },

  async createGroup(storeId, { name, min_selections = 0, max_selections = 99 }) {
    const { data, error } = await supabase
      .from('modifier_groups')
      .insert({ store_id: storeId, name, min_selections, max_selections })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addItem(storeId, groupId, { name, price = 0 }) {
    const { data, error } = await supabase
      .from('modifier_items')
      .insert({ store_id: storeId, group_id: groupId, name, price })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
