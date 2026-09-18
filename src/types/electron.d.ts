export interface ElectronPrinter {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface PrintSilentOptions {
  imageUrl?: string;
  html?: string;
  printerName?: string;
  landscape?: boolean;
  copies?: number;
}

export interface ElectronAPI {
  isElectron: boolean;
  printSilent: (options: PrintSilentOptions) => Promise<{ success: boolean; failureReason?: string; error?: string }>;
  getPrinters: () => Promise<ElectronPrinter[]>;
  savePhotoLocal: (data: { base64Data: string; filename?: string; subFolder?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getStoragePath: () => Promise<string>;
  openStorageFolder: () => Promise<boolean>;
  toggleKiosk: () => Promise<boolean>;
  isKiosk: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
