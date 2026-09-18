const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  printSilent: (options) => ipcRenderer.invoke("print-silent", options),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  savePhotoLocal: (data) => ipcRenderer.invoke("save-photo-local", data),
  getStoragePath: () => ipcRenderer.invoke("get-storage-path"),
  openStorageFolder: () => ipcRenderer.invoke("open-storage-folder"),
  toggleKiosk: () => ipcRenderer.invoke("toggle-kiosk"),
  isKiosk: () => ipcRenderer.invoke("is-kiosk"),
});
