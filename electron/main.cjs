const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

// Determine storage path for local photo backups
function getLocalPhotosPath() {
  const customWinPath = "C:\\Photobooth\\Photos";
  try {
    if (process.platform === "win32") {
      if (!fs.existsSync("C:\\Photobooth")) {
        fs.mkdirSync("C:\\Photobooth", { recursive: true });
      }
      if (!fs.existsSync(customWinPath)) {
        fs.mkdirSync(customWinPath, { recursive: true });
      }
      return customWinPath;
    }
  } catch (e) {
    console.warn("Could not create C:\\Photobooth\\Photos, falling back to Pictures folder:", e);
  }
  const fallback = path.join(app.getPath("pictures"), "YodhaPhotobooth");
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

function createWindow() {
  const isDev = !app.isPackaged || process.env.NODE_ENV === "development";
  const startKiosk = process.env.KIOSK === "true";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: "#0f172a",
    fullscreen: startKiosk,
    kiosk: startKiosk,
    autoHideMenuBar: true,
    title: "Yodha Photobooth",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // allows local camera and image blob access
    },
  });

  // Display clean branded loading screen while resolving connection
  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Yodha Photobooth</title>
      <style>
        body {
          margin: 0;
          background: #0f172a;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #334155;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1.5rem;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h2 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
        p { margin: 0; color: #94a3b8; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <h2>Yodha Photobooth</h2>
      <p id="status">Menghubungkan ke sistem photobooth...</p>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  const candidateUrls = [
    process.env.BOOTH_URL,
    process.env.VITE_DEV_SERVER_URL,
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://yodhaphotobooth.vercel.app",
  ].filter(Boolean);

  async function loadWithFallback(urls) {
    for (const url of urls) {
      try {
        console.log(`[Electron] Connecting to: ${url}`);
        await mainWindow.loadURL(url);
        console.log(`[Electron] Successfully connected to: ${url}`);
        return;
      } catch (err) {
        console.warn(`[Electron] Could not connect to ${url}, trying next fallback...`);
      }
    }
  }

  // Allow splash to render briefly before switching
  setTimeout(() => {
    loadWithFallback(candidateUrls);
  }, 400);

  // Keyboard shortcuts for booth operators:
  // F11: Toggle Fullscreen/Kiosk
  // Ctrl+Shift+I: Toggle DevTools
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11" && input.type === "keyDown") {
      const isKiosk = mainWindow.isKiosk();
      mainWindow.setKiosk(!isKiosk);
      mainWindow.setFullScreen(!isKiosk);
      event.preventDefault();
    }
    if (input.key === "I" && input.control && input.shift && input.type === "keyDown") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────

// 1. Get system printers
ipcMain.handle("get-printers", async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error("Error getting printers:", err);
    return [];
  }
});

// 2. Silent Print Handler (Hidden window print)
ipcMain.handle("print-silent", async (event, options = {}) => {
  const { imageUrl, html, printerName, landscape = false, copies = 1 } = options;

  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    let contentHtml = "";
    if (html) {
      contentHtml = html;
    } else if (imageUrl) {
      contentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" onload="window.imgReady = true;" />
        </body>
        </html>
      `;
    } else {
      printWindow.close();
      return resolve({ success: false, error: "No image or HTML provided for printing." });
    }

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(contentHtml)}`);

    printWindow.webContents.on("did-finish-load", async () => {
      // Small buffer to guarantee image render
      setTimeout(async () => {
        try {
          const printSettings = {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
            landscape: !!landscape,
            copies: copies || 1,
            margins: { marginType: "none" },
          };

          printWindow.webContents.print(printSettings, (success, failureReason) => {
            printWindow.close();
            if (!success) {
              console.error("Print failed:", failureReason);
              resolve({ success: false, failureReason });
            } else {
              console.log("Silent print completed successfully!");
              resolve({ success: true });
            }
          });
        } catch (err) {
          printWindow.close();
          console.error("Print exception:", err);
          resolve({ success: false, error: err.message });
        }
      }, 350);
    });
  });
});

// 3. Save Photo Backup Locally
ipcMain.handle("save-photo-local", async (event, { base64Data, filename, subFolder }) => {
  try {
    const rootPath = getLocalPhotosPath();
    const today = new Date().toISOString().split("T")[0];
    const targetDir = path.join(rootPath, subFolder || today);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = filename || `photo_${Date.now()}.jpg`;
    const filePath = path.join(targetDir, safeFilename);

    // Strip data URL prefix if present (e.g. data:image/jpeg;base64,)
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    await fs.promises.writeFile(filePath, buffer);
    console.log(`[Electron] Saved local photo backup: ${filePath}`);
    return { success: true, filePath };
  } catch (err) {
    console.error("Error saving local photo:", err);
    return { success: false, error: err.message };
  }
});

// 4. Storage path utilities
ipcMain.handle("get-storage-path", () => {
  return getLocalPhotosPath();
});

ipcMain.handle("open-storage-folder", async () => {
  const p = getLocalPhotosPath();
  await shell.openPath(p);
  return true;
});

// 5. Kiosk mode control
ipcMain.handle("toggle-kiosk", () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isKiosk();
  mainWindow.setKiosk(next);
  mainWindow.setFullScreen(next);
  return next;
});

ipcMain.handle("is-kiosk", () => {
  return mainWindow ? mainWindow.isKiosk() : false;
});

// ─────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
