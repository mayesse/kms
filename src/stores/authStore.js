import { create } from 'zustand'
import { supabase, _real } from '../lib/supabase'
import { ensureMachineId } from '../utils/machineId'
import { setAdminStorageConfig } from '../lib/adapters/storageConfig'

// Fetch store profile including is_active — always via supabase proxy so local mode works
async function fetchStoreProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('store_profiles')
      .select('business_type, is_active')
      .eq('id', userId)
      .single()
    if (error && !window.__DEMO_MODE__) throw error
    return data || null
  } catch {
    return null
  }
}

// Backward-compat wrapper used by refreshBusinessType
async function fetchBusinessType(userId) {
  const profile = await fetchStoreProfile(userId)
  return profile?.business_type || null
}

async function checkAndBindMachine(userId, email) {
  try {
    const machineId = await ensureMachineId()
    if (!machineId) return
    const { data: profile } = await _real.from('store_profiles').select('owner_name, phone').eq('id', userId).single()
    await _real.rpc('manage_check_machine', { p_user_id: userId, p_machine_id: machineId })
    await _real.rpc('manage_bind_machine', {
      p_user_id: userId, p_machine_id: machineId,
      p_user_email: email,
      p_user_name: profile?.owner_name || '',
      p_user_phone: profile?.phone || '',
    })
    const { data: storageConfig } = await _real.rpc('manage_get_storage_config', { p_user_id: userId })
    if (storageConfig) setAdminStorageConfig(storageConfig)
  } catch {}
}

export const useAuthStore = create((set, get) => ({
  user: null,
  storeId: null,
  session: null,
  businessType: null,
  isLoading: false,
  isInitializing: true,
  error: null,

  initialize: async () => {
    if (window.__DEMO_MODE__) {
      const { data: { session } } = await _real.auth.getSession()
      if (session) {
        const businessType = await fetchBusinessType(session.user.id)
        set({ user: session.user, storeId: session.user.id, session, businessType, isInitializing: false })
      } else {
        set({ isInitializing: false })
      }
      _real.auth.onAuthStateChange(async (_event, s) => {
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
        const { data: { session }, error } = await _real.auth.getSession()
        if (error || !session) {
          const { data, error: exchangeError } = await _real.auth.setSession({
            access_token: hashParams.get('access_token'),
            refresh_token: hashParams.get('refresh_token') || '',
          })
          if (exchangeError || !data.session) {
            window.location.hash = ''
          }
        }
      }

      const { data: { session }, error: sessionError } = await _real.auth.getSession()
      if (sessionError?.message?.includes('Refresh Token')) {
        await _real.auth.signOut()
        set({ user: null, storeId: null, session: null, businessType: null, isInitializing: false })
        return
      }
      if (session) {
        const profile = await fetchStoreProfile(session.user.id)
        // Force sign-out if store is suspended
        if (profile?.is_active === false) {
          await _real.auth.signOut()
          set({ user: null, storeId: null, session: null, businessType: null, isInitializing: false,
            error: 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.' })
          return
        }
        set({ user: session.user, storeId: session.user.id, session, businessType: profile?.business_type || null, isInitializing: false })
      } else {
        set({ isInitializing: false })
      }

      _real.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          const profile = await fetchStoreProfile(session.user.id)
          if (profile?.is_active === false) {
            await _real.auth.signOut()
            set({ user: null, storeId: null, session: null, businessType: null,
              error: 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.' })
            return
          }
          set({ user: session.user, storeId: session.user.id, session, businessType: profile?.business_type || null })
        } else {
          set({ user: null, storeId: null, session: null, businessType: null })
        }
      })
    } catch (error) {
      const msg = error?.message || ''
      if (msg.includes('Refresh Token')) {
        await _real.auth.signOut().catch(() => {})
        set({ user: null, storeId: null, session: null, businessType: null, isInitializing: false, error: null })
      } else {
        set({ error: msg, isInitializing: false })
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
      const { data, error } = await _real.auth.signInWithPassword({ email, password })
      if (error) throw error
      const profile = await fetchStoreProfile(data.user.id)
      // Block suspended accounts immediately on login
      if (profile?.is_active === false) {
        await _real.auth.signOut()
        set({ isLoading: false })
        return { success: false, error: 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.' }
      }
      set({ user: data.user, storeId: data.user.id, session: data.session, businessType: profile?.business_type || null, isLoading: false })
      checkAndBindMachine(data.user.id, email)
      return { success: true }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
  },

  register: async (email, password, storeName, ownerName, phone, appSource) => {
    set({ isLoading: true, error: null })
    try {
      const meta = { store_name: storeName, owner_name: ownerName }
      if (phone) meta.phone = phone
      if (appSource) meta.app_source = appSource
      // Always use _real (direct Supabase) for auth — never the storage proxy
      const { data, error } = await _real.auth.signUp({
        email, password,
        options: { data: meta },
      })
      if (error) throw error
      if (data.session) {
        set({ user: data.user, storeId: data.user.id, session: data.session })
        checkAndBindMachine(data.user.id, email)
        // Wait for handle_new_user trigger to create store_profiles row
        let profile = null
        for (let i = 0; i < 8; i++) {
          profile = await fetchStoreProfile(data.user.id)
          if (profile?.business_type !== undefined) break
          await new Promise(r => setTimeout(r, 600))
        }
        set({ businessType: profile?.business_type || null, isLoading: false })
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
    const { data, error } = await _real.auth.signInWithOAuth({
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
    await _real.auth.signOut()
    set({ user: null, storeId: null, session: null, businessType: null })
  },
}))
