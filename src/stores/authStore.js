import { create } from 'zustand'
import { supabase } from '../lib/supabase'

async function fetchBusinessType(userId) {
  try {
    const { data, error } = await supabase
      .from('store_profiles')
      .select('business_type')
      .eq('id', userId)
      .single()
    if (error && !window.__DEMO_MODE__) throw error
    return data?.business_type || null
  } catch {
    return null
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  storeId: null,
  session: null,
  businessType: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    if (window.__DEMO_MODE__) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const businessType = await fetchBusinessType(session.user.id)
        set({ user: session.user, storeId: session.user.id, session, businessType, isLoading: false })
      } else {
        set({ isLoading: false })
      }
      supabase.auth.onAuthStateChange(async (_event, s) => {
        if (s) {
          const bt = await fetchBusinessType(s.user.id)
          set({ user: s.user, storeId: s.user.id, session: s, businessType: bt })
        } else {
          set({ user: null, storeId: null, session: null, businessType: null })
        }
      })
      return
    }
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
      const hasUrlSession = hashParams.has('access_token')
      if (hasUrlSession) {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          const { data, error: exchangeError } = await supabase.auth.setSession({
            access_token: hashParams.get('access_token'),
            refresh_token: hashParams.get('refresh_token') || '',
          })
          if (exchangeError || !data.session) {
            window.location.hash = ''
          }
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError?.message?.includes('Refresh Token')) {
        await supabase.auth.signOut()
        set({ user: null, storeId: null, session: null, businessType: null, isLoading: false })
        return
      }
      if (session) {
        const businessType = await fetchBusinessType(session.user.id)
        set({ user: session.user, storeId: session.user.id, session, businessType, isLoading: false })
      } else {
        set({ isLoading: false })
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const businessType = await fetchBusinessType(session.user.id)
          set({ user: session.user, storeId: session.user.id, session, businessType })
        } else {
          set({ user: null, storeId: null, session: null, businessType: null })
        }
      })
    } catch (error) {
      const msg = error?.message || ''
      if (msg.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {})
        set({ user: null, storeId: null, session: null, businessType: null, isLoading: false, error: null })
      } else {
        set({ error: msg, isLoading: false })
      }
    }
  },

  refreshBusinessType: async () => {
    const userId = get().storeId
    if (!userId) return
    const businessType = await fetchBusinessType(userId)
    set({ businessType })
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const businessType = await fetchBusinessType(data.user.id)
      set({ user: data.user, storeId: data.user.id, session: data.session, businessType, isLoading: false })
      return { success: true }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  register: async (email, password, storeName, ownerName) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { store_name: storeName, owner_name: ownerName } },
      })
      if (error) throw error
      if (data.session) {
        set({ user: data.user, storeId: data.user.id, session: data.session, isLoading: false })
        return { success: true }
      }
      set({ isLoading: false })
      return { success: true, needsEmailConfirm: true }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, url: data.url }
  },

  setBusinessType: async (businessType) => {
    const userId = get().storeId
    if (!userId) return { success: false }
    try {
      const { error } = await supabase.from('store_profiles').update({ business_type: businessType }).eq('id', userId)
      if (error) throw error
      set({ businessType })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  logout: async () => {
    if (window.__DEMO_MODE__) {
      window.location.href = '/'
      const { exitDemoMode } = await import('../landing/hooks/useDemoMode')
      exitDemoMode()
    }
    await supabase.auth.signOut()
    set({ user: null, storeId: null, session: null, businessType: null })
  },
}))
