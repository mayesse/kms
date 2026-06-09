const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gc', {
  isElectron: true,
  platform: process.platform,
  reload: () => ipcRenderer.send('gc:reload'),
  checkForUpdates: () => ipcRenderer.invoke('gc:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('gc:downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('gc:installUpdate'),
  onUpdateStatus: (cb) => {
    const handler = (_, type, data) => cb(type, data)
    ipcRenderer.on('gc:updateStatus', handler)
    return () => ipcRenderer.removeListener('gc:updateStatus', handler)
  },
})
