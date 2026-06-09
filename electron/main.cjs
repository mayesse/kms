const { app, protocol, net, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const https = require('https')
const { pathToFileURL } = require('url')

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

let mainWindow = null
const APP_VERSION = '2.1.9'
const GITHUB_API = 'https://api.github.com/repos/mayesse/kms/releases/latest'
const DIST_DIR = path.join(__dirname, '..', 'dist')
const WARN = (...args) => console.warn('[main]', ...args)

function sendUpdateStatus(type, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('gc:updateStatus', type, data)
  }
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'greencrown-pos' } }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
      })
    }).on('error', reject)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 400,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadURL('app://index.html')
  }

  // Prevent external navigations — SPA handles its own routing.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const currentOrigin = new URL(mainWindow.webContents.getURL()).origin
      const targetOrigin = new URL(url).origin
      if (targetOrigin !== currentOrigin) {
        event.preventDefault()
        WARN('Blocked navigation to external URL:', url)
      }
    } catch {
      event.preventDefault()
    }
  })
}

// IPC handlers
ipcMain.on('gc:reload', () => {
  if (mainWindow) mainWindow.webContents.reload()
})

ipcMain.handle('gc:checkForUpdates', async () => {
  try {
    const release = await fetchJSON(GITHUB_API)
    const latest = (release.tag_name || '').replace(/^v/, '')
    if (!latest) return { updateAvailable: false }
    const currentParts = APP_VERSION.split('.').map(Number)
    const latestParts = latest.split('.').map(Number)
    let isNewer = false
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const a = currentParts[i] || 0
      const b = latestParts[i] || 0
      if (b > a) { isNewer = true; break }
      if (b < a) break
    }
    if (isNewer) {
      const asset = (release.assets || []).find(a =>
        a.name.endsWith('.exe') || a.name.endsWith('.apk')
      )
      return {
        updateAvailable: true,
        version: latest,
        info: { version: latest, releaseUrl: release.html_url },
        downloadUrl: asset?.browser_download_url || release.html_url,
      }
    }
    return { updateAvailable: false }
  } catch (e) {
    WARN('checkForUpdates error:', e.message)
    return { updateAvailable: false }
  }
})

ipcMain.handle('gc:downloadUpdate', async () => {
  try {
    const result = await ipcMain.emit('gc:checkForUpdates')
    // Open the release page in browser for now
    shell.openExternal('https://github.com/mayesse/kms/releases/latest')
    return { success: true }
  } catch {
    return { success: false }
  }
})

ipcMain.handle('gc:installUpdate', () => {
  return { success: false }
})

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    let filePath = url.pathname
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html'
    }
    const fullPath = path.join(DIST_DIR, filePath)
    return net.fetch(pathToFileURL(fullPath).toString())
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
