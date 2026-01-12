import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  uploadCode: (payload) => ipcRenderer.invoke('upload-code', payload),
  executeCommand: (payload) => ipcRenderer.invoke('execute-command', payload),
})
