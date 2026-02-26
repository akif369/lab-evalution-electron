const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  ensureWindowFocus: () => Promise.resolve(false),
  uploadCode: (payload) => ipcRenderer.invoke('upload-code', payload),
  executeCommand: (payload) => ipcRenderer.invoke('execute-command', payload),
})