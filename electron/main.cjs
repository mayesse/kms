const {
  app, BrowserWindow, shell, Menu, ipcMain,
  powerSaveBlocker, Notification, nativeTheme,
} = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged
let mainWindow = null
let powerSaveId = null

// ─── Auto-updater ───
let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
} catch (e) {
  // autoUpdater not available (dev mode or missing dep)
}

// ─── Single instance lock ───
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// ─── Window state persistence ───
const statePath = path.join(app.getPath('userData'), 'window-state.json')
function loadWindowState() {
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'))
    }
  } catch { /* ignore */ }
  return { width: 1280, height: 800 }
}
function saveWindowState(win) {
  try {
    if (!win.isMaximized()) {
      const bounds = win.getBounds()
      fs.writeFileSync(statePath, JSON.stringify({ width: bounds.width, height: bounds.height }))
    }
  } catch { /* ignore */ }
}

// ─── Application Menu (Arabic) ───
function buildMenu() {
  const template = [
    {
      label: 'التاج الأخضر',
      submenu: [
        { label: 'حول', role: 'about' },
        { type: 'separator' },
        { label: 'إخفاء', role: 'hide' },
        { label: 'إظهار الكل', role: 'unhide' },
        { type: 'separator' },
        { label: 'إنهاء', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'تعديل',
      submenu: [
        { label: 'تراجع', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'إعادة', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'نسخ', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'لصق', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'تحديد الكل', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'تصغير', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'تكبير افتراضي', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'أدوات المطور', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'التحديثات',
          click: () => {
            mainWindow?.webContents.send('gc:menuCheckUpdates')
            if (autoUpdater) autoUpdater.checkForUpdates().catch(() => {})
          },
        },
        { type: 'separator' },
        {
          label: 'عن التاج الأخضر',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول التاج الأخضر',
              message: `Green Crown POS v${app.getVersion()}`,
              detail: 'نظام إدارة المبيعات والمخزون\nنقطة بيع متكاملة للأسواق الصغيرة والمتوسطة',
            })
          },
        },
      ],
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ─── IPC Handlers ───
ipcMain.handle('gc:print', async (event, htmlContent) => {
  const { webContents } = event.sender
  const printWindow = new BrowserWindow({
    width: 400, height: 600,
    show: false, webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({}, () => printWindow.close())
  })
})

ipcMain.handle('gc:saveFile', async (event, { defaultName, content, filters }) => {
  const { dialog } = require('electron')
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf8')
    return true
  }
  return false
})

ipcMain.handle('gc:openFile', async (event, { filters }) => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return fs.readFileSync(result.filePaths[0], 'utf8')
  }
  return null
})

ipcMain.handle('gc:getAppInfo', () => ({
  version: app.getVersion(),
  name: app.getName(),
  platform: process.platform,
  arch: process.arch,
  userData: app.getPath('userData'),
}))

ipcMain.handle('gc:notify', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})

ipcMain.handle('gc:keepAwake', (event, shouldKeepAwake) => {
  if (shouldKeepAwake && !powerSaveId) {
    powerSaveId = powerSaveBlocker.start('prevent-display-sleep')
  } else if (!shouldKeepAwake && powerSaveId) {
    powerSaveBlocker.stop(powerSaveId)
    powerSaveId = null
  }
})

ipcMain.handle('gc:getTheme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')

// ─── Auto-updater IPC ───
ipcMain.handle('gc:checkForUpdates', async () => {
  if (!autoUpdater) return { updateAvailable: false }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { updateAvailable: result?.updateInfo?.version ? result.updateInfo.version !== app.getVersion() : false, info: result?.updateInfo || null }
  } catch {
    return { updateAvailable: false }
  }
})

ipcMain.handle('gc:downloadUpdate', async () => {
  if (!autoUpdater) return { success: false }
  try {
    autoUpdater.downloadUpdate()
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('gc:installUpdate', () => {
  if (autoUpdater) autoUpdater.quitAndInstall()
})

autoUpdater?.on('download-progress', (progress) => {
  mainWindow?.webContents.send('gc:updateProgress', {
    percent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total,
  })
})

autoUpdater?.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('gc:updateDownloaded', { version: info.version })
})

autoUpdater?.on('error', (err) => {
  mainWindow?.webContents.send('gc:updateError', { message: err.message })
})

autoUpdater?.on('update-available', (info) => {
  mainWindow?.webContents.send('gc:updateAvailable', { version: info.version })
})

// Check for updates after window is ready (production only)
if (!isDev && autoUpdater) {
  app.whenReady().then(() => {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 5000)
  })
}

// ─── HFSQL IPC ───
ipcMain.handle('gc:hfsql:testConnection', async (event, { host, port, database, username, password }) => {
  try {
    let result
    // Attempt ODBC connection to HFSQL
    try {
      const odbc = require('odbc')
      const connStr = `DRIVER={HFSQL Client/Server};HOST=${host};PORT=${port};DATABASE=${database};UID=${username};PWD=${password}`
      const conn = await odbc.connect(connStr)
      await conn.close()
      result = { success: true }
    } catch {
      // Fallback attempt: HFSQL HTTP API bridge
      try {
        const http = require('http')
        const url = new URL(`http://${host}:${port}/api/ping`)
        const resp = await new Promise((resolve, reject) => {
          const req = http.get(url, (res) => {
            let data = ''
            res.on('data', (c) => data += c)
            res.on('end', () => resolve({ status: res.statusCode, data }))
          })
          req.on('error', reject)
          req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')) })
        })
        result = resp.status === 200 ? { success: true } : { success: false, error: `HTTP ${resp.status}` }
      } catch (e) {
        result = { success: false, error: e.message }
      }
    }
    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── HFSQL helpers ───
function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  return `'${String(v).replace(/'/g, "''")}'`
}

function buildWhere(filters) {
  if (!filters || filters.length === 0) return ''
  const parts = filters.map(f => {
    switch (f.op) {
      case 'eq': return `${f.f} = ${esc(f.v)}`
      case 'neq': return `${f.f} <> ${esc(f.v)}`
      case 'in':
        if (!Array.isArray(f.v) || f.v.length === 0) return '1=0'
        return `${f.f} IN (${f.v.map(esc).join(', ')})`
      case 'is': return f.v === null ? `${f.f} IS NULL` : `${f.f} = ${esc(f.v)}`
      case 'gte': return `${f.f} >= ${esc(f.v)}`
      case 'lte': return `${f.f} <= ${esc(f.v)}`
      case 'textSearch': return `${f.f} LIKE '%' || ${esc(f.v)} || '%'`
      case 'ilike': return `UCASE(${f.f}) LIKE '%' || UCASE(${esc(f.v)}) || '%'`
      case 'or':
        if (!Array.isArray(f.parts) || f.parts.length === 0) return '1=1'
        return '(' + f.parts.map(sf => {
          const val = `'%${String(sf.val).replace(/'/g, "''")}%'`
          if (sf.op === 'ilike') return `UCASE(${sf.field}) LIKE UCASE(${val})`
          if (sf.op === 'eq') return `${sf.field} = ${esc(sf.val)}`
          return `${sf.field} ${sf.op} ${esc(sf.val)}`
        }).join(' OR ') + ')'
      default: return ''
    }
  }).filter(Boolean)
  return parts.length > 0 ? ' WHERE ' + parts.join(' AND ') : ''
}

function escapeId(id) {
  return `"${id}"`
}

ipcMain.handle('gc:hfsql:query', async (event, msg) => {
  let conn = null
  try {
    const configPath = path.join(app.getPath('userData'), 'hfsql-config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const odbc = require('odbc')
    const connStr = `DRIVER={HFSQL Client/Server};HOST=${config.host};PORT=${config.port};DATABASE=${config.database};UID=${config.username};PWD=${config.password}`
    conn = await odbc.connect(connStr)

    const { action, table, fields, data, filters, orderField, orderAsc, limit, range, single, maybe } = msg
    const tbl = escapeId(table)
    const where = buildWhere(filters || [])

    switch (action) {
      case 'select': {
        const cols = fields && fields !== '*' ? fields : '*'
        let sql = `SELECT ${cols} FROM ${tbl}${where}`
        if (orderField) sql += ` ORDER BY ${escapeId(orderField)} ${orderAsc ? 'ASC' : 'DESC'}`
        if (limit) sql += ` FETCH FIRST ${parseInt(limit)} ROWS ONLY`
        const result = await conn.query(sql)
        let rows = result || []
        if (range) rows = rows.slice(range[0], range[1] + 1)
        if (single) return { data: rows[0] || null, error: rows.length === 0 ? { code: 'PGRST116' } : null }
        if (maybe) return { data: rows[0] || null, error: null }
        return { data: rows, error: null }
      }
      case 'insert': {
        if (!Array.isArray(data) || data.length === 0) return { data: null, error: { message: 'No data' } }
        const results = []
        for (const row of data) {
          const keys = Object.keys(row)
          const cols = keys.map(escapeId).join(', ')
          const vals = keys.map(k => esc(row[k])).join(', ')
          await conn.query(`INSERT INTO ${tbl} (${cols}) VALUES (${vals})`)
          results.push(row)
        }
        return { data: single ? results[0] : results, error: null, status: 201 }
      }
      case 'update': {
        if (!data || Object.keys(data).length === 0) return { data: null, error: { message: 'No data' } }
        const sets = Object.entries(data).map(([k, v]) => `${escapeId(k)}=${esc(v)}`).join(', ')
        await conn.query(`UPDATE ${tbl} SET ${sets}${where}`)
        return { data: data, error: null }
      }
      case 'delete': {
        await conn.query(`DELETE FROM ${tbl}${where}`)
        return { data: null, error: null, status: 204 }
      }
      default:
        return { data: null, error: { message: `Unknown action: ${action}` } }
    }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  } finally {
    if (conn) try { await conn.close() } catch {}
  }
})

ipcMain.handle('gc:hfsql:rpc', async (event, { fn, params }) => {
  let conn = null
  try {
    const configPath = path.join(app.getPath('userData'), 'hfsql-config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const odbc = require('odbc')
    const connStr = `DRIVER={HFSQL Client/Server};HOST=${config.host};PORT=${config.port};DATABASE=${config.database};UID=${config.username};PWD=${config.password}`
    conn = await odbc.connect(connStr)

    if (fn === 'get_trial_info') {
      const sid = params?.p_store_id || params?.store_id
      if (!sid) return { data: { hasTrial: false }, error: null }
      const [rows] = await conn.query(`SELECT * FROM trials WHERE store_id = ${esc(sid)}`)
      if (!rows) return { data: { hasTrial: false }, error: null }
      const [pCount] = await conn.query(`SELECT COUNT(*) AS c FROM products WHERE store_id = ${esc(sid)}`)
      const [sCount] = await conn.query(`SELECT COUNT(*) AS c FROM sales WHERE store_id = ${esc(sid)}`)
      const [supCount] = await conn.query(`SELECT COUNT(*) AS c FROM suppliers WHERE store_id = ${esc(sid)}`)
      return {
        data: {
          hasTrial: true,
          startedAt: rows.started_at,
          expiresAt: rows.expires_at,
          remainingDays: Math.max(0, Math.floor((new Date(rows.expires_at) - new Date()) / 86400000)),
          isExpired: new Date() > new Date(rows.expires_at),
          usage: { products: pCount?.c || 0, sales: sCount?.c || 0, suppliers: supCount?.c || 0 },
          limits: { products: rows.products_limit, sales: rows.sales_limit, suppliers: rows.suppliers_limit },
        },
        error: null,
      }
    }

    if (fn === 'create_trial') {
      const sid = params?.p_store_id || params?.store_id
      if (!sid) return { data: null, error: { message: 'store_id required' } }
      const exp = new Date(Date.now() + 3 * 86400000).toISOString()
      await conn.query(`DELETE FROM trials WHERE store_id = ${esc(sid)}`)
      await conn.query(`INSERT INTO trials (store_id, started_at, expires_at, status, products_limit, sales_limit, suppliers_limit) VALUES (${esc(sid)}, NOW(), ${esc(exp)}, 'active', 50, 50, 2)`)
      return { data: { store_id: sid, status: 'active' }, error: null }
    }

    if (fn === 'get_next_invoice_number') {
      const sid = params?.p_store_id || params?.store_id
      if (!sid) return { data: null, error: { message: 'store_id required' } }
      const year = new Date().getFullYear()
      const [seq] = await conn.query(`SELECT * FROM invoice_sequences WHERE store_id = ${esc(sid)} AND year = ${year}`)
      const next = (seq?.last_number || 0) + 1
      if (seq) {
        await conn.query(`UPDATE invoice_sequences SET last_number = ${next} WHERE store_id = ${esc(sid)} AND year = ${year}`)
      } else {
        await conn.query(`INSERT INTO invoice_sequences (store_id, year, last_number) VALUES (${esc(sid)}, ${year}, ${next})`)
      }
      return { data: `FAC-${year}-${String(next).padStart(5, '0')}`, error: null }
    }

    if (fn === 'create_return_note') {
      return { data: null, error: { message: 'Return notes not yet supported in HFSQL mode' } }
    }

    return { data: null, error: { message: `RPC ${fn} not available in HFSQL mode` } }
  } catch (e) {
    return { data: null, error: { message: e.message } }
  } finally {
    if (conn) try { await conn.close() } catch {}
  }
})

ipcMain.handle('gc:hfsql:saveConfig', async (event, config) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'hfsql-config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── Window creation ───
function createWindow() {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b0f0d',
    title: 'التاج الأخضر — Green Crown POS',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: blob:; " +
          "media-src 'self' mediastream:; " +
          "connect-src 'self' https://*.supabase.co ws://localhost:* http://localhost:*; " +
          "worker-src 'self' blob:;",
        ],
      },
    })
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('resize', () => saveWindowState(mainWindow))
  mainWindow.on('move', () => saveWindowState(mainWindow))
  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── App lifecycle ───
app.whenReady().then(() => {
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (powerSaveId) {
    powerSaveBlocker.stop(powerSaveId)
    powerSaveId = null
  }
})
