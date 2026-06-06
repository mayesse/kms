const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gc', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',

  // Print HTML content via OS print dialog
  print: (htmlContent) => ipcRenderer.invoke('gc:print', htmlContent),

  // Save file to disk
  saveFile: (options) => ipcRenderer.invoke('gc:saveFile', options),

  // Open file from disk
  openFile: (options) => ipcRenderer.invoke('gc:openFile', options),

  // Get app info (version, paths)
  getAppInfo: () => ipcRenderer.invoke('gc:getAppInfo'),

  // Show OS-level notification
  notify: (options) => ipcRenderer.invoke('gc:notify', options),

  // Prevent display sleep (for POS sessions)
  keepAwake: (shouldKeepAwake) => ipcRenderer.invoke('gc:keepAwake', shouldKeepAwake),

  // Get current OS theme
  getTheme: () => ipcRenderer.invoke('gc:getTheme'),

  // ─── Auto-updater ───
  checkForUpdates: () => ipcRenderer.invoke('gc:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('gc:downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('gc:installUpdate'),
  onUpdateStatus: (callback) => {
    const channels = ['gc:updateAvailable', 'gc:updateProgress', 'gc:updateDownloaded', 'gc:updateError', 'gc:menuCheckUpdates']
    const unsubs = channels.map(ch => {
      const handler = (_event, data) => callback(ch.replace('gc:', ''), data)
      ipcRenderer.on(ch, handler)
      return () => ipcRenderer.removeListener(ch, handler)
    })
    return () => unsubs.forEach(fn => fn())
  },

  // ─── HFSQL Database ───
  hfsql: {
    testConnection: (opts) => ipcRenderer.invoke('gc:hfsql:testConnection', opts),
    query: (opts) => ipcRenderer.invoke('gc:hfsql:query', opts),
    rpc: (fn, params) => ipcRenderer.invoke('gc:hfsql:rpc', { fn, params }),
    saveConfig: (config) => ipcRenderer.invoke('gc:hfsql:saveConfig', config),
    auth: {
      signInWithPassword: async () => ({ data: null, error: { message: 'Auth handled by HFSQL server' } }),
      signUp: async () => ({ data: null, error: { message: 'Auth handled by HFSQL server' } }),
      signOut: async () => ({ error: null }),
      getSession: async () => {
        try {
          const data = localStorage.getItem('gc_hfsql_session')
          return data ? { data: { session: JSON.parse(data) }, error: null } : { data: { session: null }, error: null }
        } catch {
          return { data: { session: null }, error: null }
        }
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => ({ data: { url: '/app/' }, error: null }),
      setSession: async (session) => {
        localStorage.setItem('gc_hfsql_session', JSON.stringify(session))
        return { data: { session }, error: null }
      },
      refreshSession: async () => {
        try {
          const data = localStorage.getItem('gc_hfsql_session')
          return data ? { data: { session: JSON.parse(data) }, error: null } : { data: { session: null }, error: null }
        } catch {
          return { data: { session: null }, error: null }
        }
      },
    },
  },
})
