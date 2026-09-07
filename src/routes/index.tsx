import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AdminScreen, Template } from "@/components/AdminScreen";
import { AdminLogin } from "@/components/AdminLogin";
import { TemplateDB, CustomTemplate, SessionDB, SettingsDB } from "@/lib/db";
import { isSupabaseConfigured, uploadToStorage, getSupabaseAnonKey, getSupabaseUrl, compressDataUrlToJpegBlob } from "@/lib/supabase";
import { generateGifFromPhotos } from "@/lib/gif";
import { recordLiveClip, composeLiveVideoFrame, composeLiveGifFrame } from "@/lib/frameLive";
import {
  isAdminAuthenticated,
  isBoothAccessAllowed,
  createBoothSession,
  verifyAndLoginAdmin,
} from "@/lib/auth";
import yodhaLogo from "@/assets/yodha.png";
import arthanaLogo from "@/assets/arthana.png";
import gachaAsset from "@/assets/GACHA MACHINE.png";
import flowerAsset from "@/assets/FLOWER.png";
// PNC assets — 1x1
// import pnc3Asset from "@/assets/pnc/1x1/ekskusif/3.png";
// import pnc4Asset from "@/assets/pnc/1x1/ekskusif/4.png";
import pnc15Asset from "@/assets/pnc/1x1/15.png";

// PNC assets — 4x2
// import pnc4x2_9Asset from "@/assets/pnc/4x2/9.png";
// import pnc4x2_10Asset from "@/assets/pnc/4x2/10.png";
import pnc4x2_11Asset from "@/assets/pnc/4x2/11.png";
import pnc4x2_12Asset from "@/assets/pnc/4x2/12.png";
import pnc4x2_13Asset from "@/assets/pnc/4x2/13.png";
import pnc4x2_14Asset from "@/assets/pnc/4x2/14.png";
import pnc4x2_15Asset from "@/assets/pnc/4x2/15.png";
import pnc4x2_16Asset from "@/assets/pnc/4x2/16.png";
import pnc4x2_17Asset from "@/assets/pnc/4x2/17.png";
import pnc4x2_18Asset from "@/assets/pnc/4x2/18.png";

// RAICAB assets
import raicab15Asset from "@/assets/raicab/15.png";
import raicab16Asset from "@/assets/raicab/16.png";
import raicab17Asset from "@/assets/raicab/17.png";
import raicab18Asset from "@/assets/raicab/18.png";

import { CustomerDownloadPortal } from "@/components/CustomerDownloadPortal";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { session?: string; download?: string; mode?: string } => {
    return {
      session: typeof search.session === "string" ? search.session : undefined,
      download: typeof search.download === "string" ? search.download : undefined,
      mode: typeof search.mode === "string" ? search.mode : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Yodha-Photobooth" },
      { name: "description", content: "Photobooth pixel seru! Pilih bingkai lucu, jepret tiga foto, dan dapatkan strip foto siap cetak." },
      { property: "og:title", content: "Yodha-Photobooth" },
      { property: "og:description", content: "Photobooth pixel: pilih frame, jepret, simpan strip foto." },
      // Meta tags to enable standalone fullscreen mode on iOS/iPadOS and Android when added to home screen
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
  }),
  component: Photobooth,
});

type Screen = "home" | "frame" | "filter" | "shoot" | "review" | "result" | "admin";
type FrameId = "cafe" | "gameboy" | "bedroom" | "template";
type LayoutId = "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2";

export interface CameraFilter {
  id: string;
  name: string;
  css: string;
  emoji: string;
  desc: string;
}

export const PHOTO_FILTERS: CameraFilter[] = [
  { id: "normal", name: "Alami (Normal)", css: "none", emoji: "✨", desc: "Warna jernih natural" },
  { id: "warm", name: "Vintage Hangat", css: "sepia(0.35) contrast(1.05) brightness(1.02) saturate(1.15)", emoji: "🎞️", desc: "Sentuhan retro 90-an" },
  { id: "bw", name: "Hitam Putih (B&W)", css: "grayscale(1) contrast(1.2) brightness(1.05)", emoji: "🖤", desc: "Monokrom klasik elegan" },
  { id: "glow", name: "Soft Barbie Glow", css: "contrast(1.05) brightness(1.1) saturate(1.25)", emoji: "🌸", desc: "Cerah lembut bercahaya" },
  { id: "cool", name: "Cool Cinema", css: "contrast(1.1) hue-rotate(185deg) saturate(0.9)", emoji: "❄️", desc: "Nuansa sejuk sinematik" },
  { id: "cyber", name: "Retro Cyber", css: "contrast(1.3) saturate(1.4) brightness(1.04)", emoji: "⚡", desc: "Warna kontras tinggi pop" },
];

// Physical print sizes (cm) per layout
const PRINT_SIZES: Record<LayoutId, { w: number; h: number; sheets: number; label: string }> = {
  "3x1": { w: 5, h: 15, sheets: 2, label: "5×15 cm · 2 strip (1 lembar 4R)" },
  "3x2": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar" },
  "2x1": { w: 5, h: 15, sheets: 2, label: "5×15 cm · 2 strip (1 lembar 4R)" },
  "1x1": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar" },
  "2x2": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar" },
  "4x2": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar" },
};

const LAYOUTS: { id: LayoutId; name: string; rows: number; cols: number; totalPhotos: number; desc: string; emoji: string }[] = [
  { id: "4x2", name: "Grid 8 Foto (4 Jepretan)", rows: 4, cols: 2, totalPhotos: 4, desc: "8 foto empat baris dengan 4 jepretan (kiri-kanan berpasangan) · Cetak 10×15 cm", emoji: "🎦" },
  { id: "1x1", name: "Foto Tunggal", rows: 1, cols: 1, totalPhotos: 1, desc: "1 foto polaroid · Cetak 10×15 cm", emoji: "📷" },
  { id: "3x2", name: "Grid 6 Foto", rows: 3, cols: 2, totalPhotos: 6, desc: "6 foto dua kolom · Cetak 10×15 cm", emoji: "🖼️" },
  { id: "2x1", name: "Strip Pendek", rows: 2, cols: 1, totalPhotos: 2, desc: "2 foto susun ke bawah · Cetak 5×15 cm", emoji: "📸" },
  { id: "2x2", name: "Grid 4 Foto", rows: 2, cols: 2, totalPhotos: 4, desc: "4 foto dua kolom · Cetak 10×15 cm", emoji: "🗒️" },
];


// Auto-reset timeout after result screen (seconds)
const AUTO_RESET_SECONDS = 60;

/* ───────────────────────── Fullscreen Hook ───────────────────────── */
function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Auto-fullscreen on first user interaction anywhere on the page
  useEffect(() => {
    const autoFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => { });
      }
      // Remove listeners after first interaction
      window.removeEventListener("click", autoFullscreen);
      window.removeEventListener("touchstart", autoFullscreen);
    };
    window.addEventListener("click", autoFullscreen, { passive: true });
    window.addEventListener("touchstart", autoFullscreen, { passive: true });
    return () => {
      window.removeEventListener("click", autoFullscreen);
      window.removeEventListener("touchstart", autoFullscreen);
    };
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      // Browser exits fullscreen when print dialog is opened. We restore it immediately.
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .catch(() => {
            // If the browser blocks immediate entry due to user gesture requirements,
            // we attach a one-time click/touch listener to restore it on next interaction.
            const restore = () => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => { });
              }
              window.removeEventListener("click", restore);
              window.removeEventListener("touchstart", restore);
            };
            window.addEventListener("click", restore, { passive: true });
            window.addEventListener("touchstart", restore, { passive: true });
          });
      }
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  return { isFullscreen, toggle };
}

function getDefaultTemplates(disabledIds: string[]): Template[] {
  const e = (id: string) => !disabledIds.includes(id);
  return [
    // ── 4x2 (Grid 8 Foto) ─────────────────────────────────
    { id: "4x2_raicab16", name: "RAICAB 16", layout: "4x2", img: raicab16Asset, isCustom: false, enabled: e("4x2_raicab16"), presetId: "raicab16" },
    { id: "4x2_raicab17", name: "RAICAB 17", layout: "4x2", img: raicab17Asset, isCustom: false, enabled: e("4x2_raicab17"), presetId: "raicab17" },
    { id: "4x2_raicab18", name: "RAICAB 18", layout: "4x2", img: raicab18Asset, isCustom: false, enabled: e("4x2_raicab18"), presetId: "raicab18" },
    // { id: "4x2_pnc9", name: "PNC 9", layout: "4x2", img: pnc4x2_9Asset, isCustom: false, enabled: e("4x2_pnc9"), presetId: "pnc9" },
    // { id: "4x2_pnc10", name: "PNC 10", layout: "4x2", img: pnc4x2_10Asset, isCustom: false, enabled: e("4x2_pnc10"), presetId: "pnc10" },
    { id: "4x2_pnc11", name: "PNC 11", layout: "4x2", img: pnc4x2_11Asset, isCustom: false, enabled: e("4x2_pnc11"), presetId: "pnc11" },
    { id: "4x2_pnc12", name: "PNC 12", layout: "4x2", img: pnc4x2_12Asset, isCustom: false, enabled: e("4x2_pnc12"), presetId: "pnc12" },
    { id: "4x2_pnc13", name: "PNC 13", layout: "4x2", img: pnc4x2_13Asset, isCustom: false, enabled: e("4x2_pnc13"), presetId: "pnc13" },
    { id: "4x2_pnc14", name: "PNC 14", layout: "4x2", img: pnc4x2_14Asset, isCustom: false, enabled: e("4x2_pnc14"), presetId: "pnc14" },
    { id: "4x2_pnc15", name: "PNC 15", layout: "4x2", img: pnc4x2_15Asset, isCustom: false, enabled: e("4x2_pnc15"), presetId: "pnc15" },
    { id: "4x2_pnc16", name: "PNC 16", layout: "4x2", img: pnc4x2_16Asset, isCustom: false, enabled: e("4x2_pnc16"), presetId: "pnc16" },
    { id: "4x2_pnc17", name: "PNC 17", layout: "4x2", img: pnc4x2_17Asset, isCustom: false, enabled: e("4x2_pnc17"), presetId: "pnc17" },
    { id: "4x2_pnc18", name: "PNC 18", layout: "4x2", img: pnc4x2_18Asset, isCustom: false, enabled: e("4x2_pnc18"), presetId: "pnc18" },

    // ── 1x1 (Foto Tunggal) ────────────────────────────────
    { id: "1x1_raicab15", name: "RAICAB 15", layout: "1x1", img: raicab15Asset, isCustom: false, enabled: e("1x1_raicab15"), presetId: "raicab15" },
    { id: "1x1_pnc15", name: "PNC 15", layout: "1x1", img: pnc15Asset, isCustom: false, enabled: e("1x1_pnc15"), presetId: "pnc15" },
    // { id: "1x1_pnc3", name: "PNC 3", layout: "1x1", img: pnc3Asset, isCustom: false, enabled: e("1x1_pnc3"), presetId: "pnc3" },
    // { id: "1x1_pnc4", name: "PNC 4", layout: "1x1", img: pnc4Asset, isCustom: false, enabled: e("1x1_pnc4"), presetId: "pnc4" },
  ];
}

/* ───────────────────────── Main Component ───────────────────────── */
function Photobooth() {
  const search = Route.useSearch();
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => isAdminAuthenticated());
  const [isBoothMode, setIsBoothMode] = useState<boolean>(() => {
    if (search?.mode === "booth") return true;
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "booth";
  });
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitPin, setExitPin] = useState("");
  const [exitError, setExitError] = useState("");

  const [customerSessionCode, setCustomerSessionCode] = useState<string | null>(() => {
    if (search?.session) return search.session;
    if (search?.download) return search.download;
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("session") || params.get("download") || null;
  });

  useEffect(() => {
    const code = search?.session || search?.download;
    if (code) {
      setCustomerSessionCode(code);
    } else if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pCode = params.get("session") || params.get("download");
      if (pCode) {
        setCustomerSessionCode(pCode);
      }
    }
  }, [search?.session, search?.download]);

  const [selectedFilter, setSelectedFilter] = useState<string>("normal");

  const [screen, setScreen] = useState<Screen>("home");
  const [layout, setLayout] = useState<LayoutId>("4x2");
  const [variant, setVariant] = useState<string>("raicab16");
  const frame: FrameId = "template";
  const [photos, setPhotos] = useState<string[]>([]);
  const [liveVideos, setLiveVideos] = useState<string[]>([]);
  const [strip, setStrip] = useState<string | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [templates, setTemplates] = useState<Template[]>([]);

  const settingsDB = useRef(new SettingsDB()).current;
  const templateDB = useRef(new TemplateDB()).current;

  // Function to reload all templates (defaults + custom from DB)
  const reloadTemplates = useCallback(async () => {
    const disabledIds = await settingsDB.getSetting<string[]>(
      "disabled_templates",
      JSON.parse(localStorage.getItem("yodha_disabled_templates") || "[]")
    );
    const defaults = getDefaultTemplates(disabledIds);

    try {
      const customTemplates = await templateDB.getAllTemplates();
      setTemplates([...defaults, ...customTemplates]);
    } catch (e) {
      console.error(e);
      setTemplates(defaults);
    }
  }, [settingsDB, templateDB]);

  // Load templates on mount
  useEffect(() => {
    reloadTemplates();
  }, [reloadTemplates]);

  // Handle toggling on/off
  const handleToggleTemplate = useCallback(async (id: string, enabled: boolean) => {
    const target = templates.find(t => t.id === id);
    if (!target) return;

    if (target.isCustom) {
      try {
        await templateDB.toggleTemplate(id, enabled);
        await reloadTemplates();
      } catch (e) {
        console.error(e);
      }
    } else {
      const disabledIds = await settingsDB.getSetting<string[]>(
        "disabled_templates",
        JSON.parse(localStorage.getItem("yodha_disabled_templates") || "[]")
      );
      let newDisabled: string[];
      if (enabled) {
        newDisabled = disabledIds.filter((dId: string) => dId !== id);
      } else {
        newDisabled = [...disabledIds, id];
      }
      await settingsDB.saveSetting("disabled_templates", newDisabled);
      localStorage.setItem("yodha_disabled_templates", JSON.stringify(newDisabled));
      await reloadTemplates();
    }
  }, [templates, reloadTemplates, settingsDB, templateDB]);

  // Handle adding custom template
  const handleAddTemplate = useCallback(async (name: string, layout: LayoutId, presetId: string, base64Img: string) => {
    try {
      const db = new TemplateDB();
      const newTemplate: CustomTemplate = {
        id: `custom_${layout}_${Date.now()}`,
        name,
        layout,
        presetId,
        img: base64Img,
        isCustom: true,
        enabled: true,
      };
      await db.saveTemplate(newTemplate);
      await reloadTemplates();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, [reloadTemplates]);

  // Handle deleting custom template
  const handleDeleteTemplate = useCallback(async (id: string) => {
    try {
      const db = new TemplateDB();
      await db.deleteTemplate(id);
      await reloadTemplates();
    } catch (e) {
      console.error(e);
    }
  }, [reloadTemplates]);

  const ensureFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
  };

  const handleExitBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = await verifyAndLoginAdmin(exitPin);
    if (valid) {
      setShowExitModal(false);
      setExitPin("");
      setExitError("");
      setIsBoothMode(false);
      setIsAdminAuth(true);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } else {
      setExitError("PIN Admin salah!");
    }
  };

  // ────────────────── MODE 0: CUSTOMER DOWNLOAD PORTAL (QR CODE SCAN) ──────────────────
  // Dedicated customer page: 100% isolated, NO access to booth kiosk or admin dashboard
  if (customerSessionCode) {
    return <CustomerDownloadPortal sessionCode={customerSessionCode} />;
  }

  // ──────────────────────── MODE 1: ADMIN AREA ────────────────────────
  if (!isBoothMode) {
    if (!isAdminAuth) {
      return <AdminLogin onLoginSuccess={() => setIsAdminAuth(true)} />;
    }

    return (
      <AdminScreen
        templates={templates}
        onToggleTemplate={handleToggleTemplate}
        onAddTemplate={handleAddTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onLaunchBooth={() => {
          createBoothSession();
          setIsBoothMode(true);
        }}
        onLogout={() => setIsAdminAuth(false)}
      />
    );
  }

  // ─────────────────────── MODE 2: BOOTH KIOSK ────────────────────────
  // Security check: random outsiders cannot access booth without admin authorization
  if (!isBoothAccessAllowed()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-900">Akses Kiosk Terbatas</h2>
          <p className="text-sm text-slate-500">
            Halaman Web Photobooth hanya dapat dibuka melalui Dashboard Admin. Silakan masuk sebagai Admin terlebih dahulu.
          </p>
          <button
            onClick={() => {
              setIsBoothMode(false);
              if (typeof window !== "undefined") {
                window.location.href = window.location.origin + window.location.pathname;
              }
            }}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow cursor-pointer"
          >
            Menuju Login Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="photobooth-kiosk min-h-screen flex flex-col items-center px-4 sm:px-8 py-6 sm:py-10">
      <Header
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showFullscreenBtn={screen !== "shoot"}
      />
      <div className="w-full max-w-4xl flex-1 flex items-center justify-center py-4 sm:py-8">
        {screen === "home" && (
          <HomeScreen
            onStart={() => {
              ensureFullscreen();
              setScreen("frame");
            }}
          />
        )}
        {screen === "frame" && (
          <FrameScreen
            selectedLayout={layout}
            setSelectedLayout={setLayout}
            variant={variant}
            setVariant={setVariant}
            onBack={() => setScreen("home")}
            onNext={() => {
              ensureFullscreen();
              setScreen("filter");
            }}
            templates={templates}
          />
        )}
        {screen === "filter" && (
          <FilterScreen
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            onBack={() => setScreen("frame")}
            onNext={() => {
              ensureFullscreen();
              setPhotos([]);
              setLiveVideos([]);
              setStrip(null);
              setScreen("shoot");
            }}
          />
        )}
        {screen === "shoot" && (
          <ShootScreen
            frame={frame}
            layout={layout}
            variant={variant}
            selectedFilter={selectedFilter}
            photos={photos}
            setPhotos={setPhotos}
            onPhotosCaptured={(captured, capturedVideos) => {
              setPhotos(captured);
              setLiveVideos(capturedVideos);
              setScreen("review");
            }}
            onBack={() => setScreen("filter")}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            templates={templates}
          />
        )}
        {screen === "review" && (
          <ReviewScreen
            photos={photos}
            setPhotos={setPhotos}
            liveVideos={liveVideos}
            setLiveVideos={setLiveVideos}
            layout={layout}
            variant={variant}
            selectedFilter={selectedFilter}
            templates={templates}
            onBack={() => setScreen("shoot")}
            onFinish={async (finalStrip) => {
              setStrip(finalStrip);
              setScreen("result");
            }}
          />
        )}
        {screen === "result" && strip && (
          <ResultScreen
            photos={photos}
            liveVideos={liveVideos}
            frame={frame}
            layout={layout}
            variant={variant}
            strip={strip}
            setStrip={setStrip}
            onRetake={() => { setPhotos([]); setLiveVideos([]); setStrip(null); setScreen("shoot"); }}
            onHome={() => { setPhotos([]); setLiveVideos([]); setStrip(null); setScreen("home"); }}
            templates={templates}
          />
        )}
      </div>
      <Footer onExitBooth={() => setShowExitModal(true)} />

      {/* Operator Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl font-sans text-slate-800">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🔒</span> Konfirmasi Admin
            </h3>
            <p className="text-xs text-slate-500">
              Masukkan PIN Admin untuk keluar dari mode Web Photobooth dan kembali ke Dashboard.
            </p>
            <form onSubmit={handleExitBooth} className="space-y-3">
              <input
                type="password"
                value={exitPin}
                onChange={(e) => {
                  setExitPin(e.target.value);
                  setExitError("");
                }}
                placeholder="PIN Admin"
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {exitError && <p className="text-xs text-red-600 font-medium">{exitError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    setExitPin("");
                    setExitError("");
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow cursor-pointer"
                >
                  Keluar ke Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* ───────────────────────── Header / Footer ───────────────────────── */

function Header({
  isFullscreen,
  onToggleFullscreen,
  showFullscreenBtn,
}: {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showFullscreenBtn?: boolean;
}) {
  return (
    <header className="w-full max-w-5xl flex items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          <img src={yodhaLogo} alt="Yodha Logo" className="h-20 w-auto object-contain max-w-[150px]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base">Yodha-Photobooth</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}>
            ♡ jepret, simpan, kenang ♡
          </p>
        </div>
      </div>
      {showFullscreenBtn && onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Keluar Layar Penuh (F11)" : "Layar Penuh (F11)"}
          className="cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
        >
          <img
            src={arthanaLogo}
            alt="Arthana Logo"
            className="h-28 w-auto object-contain max-w-[180px] -my-6"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15)) brightness(0.6)" }}
          />
        </button>
      )}
    </header>
  );
}

function Footer({ onExitBooth }: { onExitBooth?: () => void }) {
  return (
    <footer className="mt-6 text-xs pixel text-muted-foreground flex items-center justify-between w-full max-w-4xl px-2">
      <span>© Yodha-Photobooth</span>
      {onExitBooth && (
        <button
          onClick={onExitBooth}
          className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity"
          title="Area Operator"
        >
          <span>🔒 Operator</span>
        </button>
      )}
    </footer>
  );
}

function PixelLogo() {
  return (
    <div className="relative">
      <div className="w-12 h-12 grid grid-cols-6 grid-rows-6 gap-0">
        {[
          "......",
          ".XXXX.",
          "XYYYYX",
          "XYZZYX",
          "XYYYYX",
          ".XXXX.",
        ].join("").split("").map((c, i) => {
          const color = c === "X" ? "var(--color-ink)" : c === "Y" ? "var(--color-butter)" : c === "Z" ? "var(--color-blush)" : "transparent";
          return <div key={i} style={{ background: color }} />;
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Home ───────────────────────── */

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[50vh] gap-4">
      {/* Center content (Start Button) */}
      <div className="z-10 flex flex-col items-center gap-4">
        <button
          id="start-btn"
          className="pixel-btn hover:scale-105 transition-transform"
          onClick={onStart}
          style={{
            fontSize: "clamp(1.2rem, 3.5vw, 2rem)",
            padding: "clamp(1.5rem, 3vw, 2.5rem) clamp(2.5rem, 6vw, 5rem)",
            letterSpacing: "0.15em",
            boxShadow: "8px 8px 0 0 rgba(0,0,0,0.15), inset -4px -4px 0 0 rgba(0,0,0,0.1)",
          }}
        >
          📸 MULAI FOTO
        </button>
        <div className="pixel text-[10px] text-muted-foreground animate-pulse">
          ▼ Tekan untuk memulai ▼
        </div>
      </div>
    </div>
  );
}

type HoleConfig = { w: number; h: number; holes: { left: number; top: number; width: number; height: number }[] };

function getVariantHoleConfig(layout: string, variant: string): HoleConfig | null {
  if (layout === "3x1" && variant !== "default") {
    if (variant === "frame1") {
      const baseW = 600, baseH = 1800;
      const h = [{ x: 78, y: 478, w: 440, h: 275 }, { x: 78, y: 863, w: 440, h: 275 }, { x: 78, y: 1248, w: 440, h: 275 }];
      return { w: baseW, h: baseH, holes: h.map(v => ({ left: v.x / baseW * 100, top: v.y / baseH * 100, width: v.w / baseW * 100, height: v.h / baseH * 100 })) };
    } else if (variant === "frame2") {
      const baseW = 724, baseH = 2172;
      const h = [{ x: 49, y: 68, w: 632, h: 530 }, { x: 56, y: 670, w: 627, h: 536 }, { x: 52, y: 1265, w: 625, h: 542 }];
      return { w: baseW, h: baseH, holes: h.map(v => ({ left: v.x / baseW * 100, top: v.y / baseH * 100, width: v.w / baseW * 100, height: v.h / baseH * 100 })) };
    } else if (variant === "frame3") {
      const baseW = 724, baseH = 2172;
      const h = [{ x: 63, y: 157, w: 594, h: 414 }, { x: 63, y: 746, w: 594, h: 413 }, { x: 63, y: 1334, w: 594, h: 414 }];
      return { w: baseW, h: baseH, holes: h.map(v => ({ left: v.x / baseW * 100, top: v.y / baseH * 100, width: v.w / baseW * 100, height: v.h / baseH * 100 })) };
    } else if (variant === "frame4") {
      const baseW = 724, baseH = 2172;
      const h = [{ x: 56, y: 192, w: 612, h: 541 }, { x: 56, y: 790, w: 612, h: 541 }, { x: 56, y: 1388, w: 612, h: 541 }];
      return { w: baseW, h: baseH, holes: h.map(v => ({ left: v.x / baseW * 100, top: v.y / baseH * 100, width: v.w / baseW * 100, height: v.h / baseH * 100 })) };
    } else if (variant === "frame5") {
      const baseW = 724, baseH = 2172;
      const h = [{ x: 89, y: 82, w: 546, h: 545 }, { x: 89, y: 747, w: 546, h: 546 }, { x: 89, y: 1412, w: 546, h: 545 }];
      return { w: baseW, h: baseH, holes: h.map(v => ({ left: v.x / baseW * 100, top: v.y / baseH * 100, width: v.w / baseW * 100, height: v.h / baseH * 100 })) };
    }
  } else if (layout === "2x1") {
    const convert = (hArr: { x: number, y: number, w: number, h: number }[], baseW: number, baseH: number) =>
      ({ w: baseW, h: baseH, holes: hArr.map(v => ({ left: v.x / baseW * 100, top: v.y / baseH * 100, width: v.w / baseW * 100, height: v.h / baseH * 100 })) });

    if (variant === "frame1") {
      return convert([{ x: 137, y: 578, w: 451, h: 491 }, { x: 137, y: 1374, w: 451, h: 357 }], 728, 2000);
    } else if (variant === "frame2") {
      return convert([{ x: 110, y: 83, w: 1256, h: 1014 }, { x: 110, y: 1199, w: 1256, h: 1014 }], 1440, 2622);
    } else if (variant === "frame3") {
      return convert([{ x: 103, y: 68, w: 1254, h: 1013 }, { x: 113, y: 1199, w: 1244, h: 951 }], 1440, 2622);
    } else if (variant === "frame4") {
      return convert([{ x: 95, y: 512, w: 538, h: 651 }, { x: 95, y: 1294, w: 538, h: 358 }], 728, 2000);
    } else if (variant === "frame5") {
      return convert([{ x: 139, y: 563, w: 450, h: 490 }, { x: 139, y: 1363, w: 450, h: 355 }], 728, 2000);
    } else if (variant === "frame6") {
      return convert([{ x: 136, y: 599, w: 456, h: 497 }, { x: 136, y: 1400, w: 456, h: 362 }], 728, 2000);
    }
  } else if (layout === "3x2") {
    const baseW = 1333, baseH = 2000;
    const convert = (hArr: { x: number, y: number, w: number, h: number }[], customH = baseH) =>
      ({ w: baseW, h: customH, holes: hArr.map(v => ({ left: v.x / baseW * 100, top: v.y / customH * 100, width: v.w / baseW * 100, height: v.h / customH * 100 })) });

    if (variant === "default") {
      return convert([
        { x: 125, y: 552, w: 419, h: 316 }, { x: 781, y: 560, w: 420, h: 316 },
        { x: 125, y: 1019, w: 419, h: 316 }, { x: 781, y: 1028, w: 420, h: 315 },
        { x: 125, y: 1487, w: 419, h: 316 }, { x: 781, y: 1495, w: 420, h: 316 }
      ], 1999);
    } else if (variant === "frame2") {
      return convert([{ x: 31, y: 64, w: 605, h: 546 }, { x: 698, y: 65, w: 606, h: 546 }, { x: 31, y: 641, w: 605, h: 554 }, { x: 698, y: 642, w: 606, h: 553 }, { x: 31, y: 1226, w: 605, h: 573 }, { x: 697, y: 1226, w: 607, h: 573 }]);
    } else if (variant === "frame3") {
      return convert([{ x: 78, y: 60, w: 545, h: 520 }, { x: 707, y: 60, w: 546, h: 520 }, { x: 78, y: 660, w: 545, h: 520 }, { x: 707, y: 660, w: 546, h: 520 }, { x: 78, y: 1259, w: 546, h: 520 }, { x: 707, y: 1259, w: 546, h: 520 }]);
    } else if (variant === "frame4") {
      return convert([{ x: 49, y: 79, w: 569, h: 481 }, { x: 707, y: 139, w: 592, h: 396 }, { x: 49, y: 674, w: 569, h: 481 }, { x: 715, y: 640, w: 572, h: 439 }, { x: 49, y: 1269, w: 569, h: 480 }, { x: 720, y: 1166, w: 544, h: 456 }]);
    } else if (variant === "frame5") {
      return convert([{ x: 89, y: 168, w: 483, h: 399 }, { x: 755, y: 168, w: 484, h: 399 }, { x: 112, y: 726, w: 451, h: 384 }, { x: 779, y: 726, w: 450, h: 384 }, { x: 103, y: 1267, w: 446, h: 401 }, { x: 770, y: 1267, w: 446, h: 401 }]);
    } else if (variant === "frame6") {
      return convert([{ x: 35, y: 126, w: 597, h: 422 }, { x: 701, y: 126, w: 598, h: 422 }, { x: 39, y: 629, w: 588, h: 451 }, { x: 706, y: 629, w: 588, h: 451 }, { x: 53, y: 1159, w: 559, h: 475 }, { x: 720, y: 1159, w: 559, h: 475 }]);
    } else if (variant === "frame7") {
      return convert([{ x: 31, y: 57, w: 599, h: 523 }, { x: 703, y: 57, w: 599, h: 523 }, { x: 28, y: 631, w: 602, h: 522 }, { x: 703, y: 631, w: 602, h: 522 }, { x: 29, y: 1206, w: 600, h: 520 }, { x: 704, y: 1206, w: 601, h: 520 }]);
    } else if (variant === "frame8") {
      return convert([{ x: 108, y: 82, w: 511, h: 512 }, { x: 715, y: 82, w: 510, h: 512 }, { x: 108, y: 676, w: 511, h: 512 }, { x: 714, y: 676, w: 511, h: 512 }, { x: 107, y: 1270, w: 513, h: 513 }, { x: 714, y: 1270, w: 512, h: 514 }]);
    } else if (variant === "frame9") {
      return convert([{ x: 53, y: 53, w: 561, h: 560 }, { x: 720, y: 53, w: 560, h: 560 }, { x: 53, y: 660, w: 561, h: 560 }, { x: 720, y: 660, w: 560, h: 560 }, { x: 53, y: 1267, w: 561, h: 560 }, { x: 720, y: 1267, w: 560, h: 560 }]);
    }
  }
  return null;
}

/* ───────────────────────── Frame select ───────────────────────── */

function FrameScreen({
  selectedLayout, setSelectedLayout, variant, setVariant, onBack, onNext, templates,
}: {
  selectedLayout: LayoutId;
  setSelectedLayout: (l: LayoutId) => void;
  variant: string;
  setVariant: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  templates: Template[];
}) {
  const printInfo = PRINT_SIZES[selectedLayout];
  const enabledTemplates = templates.filter((t) => t.layout === selectedLayout && t.enabled);
  const availableLayouts = LAYOUTS.filter((l) => templates.some((t) => t.layout === l.id && t.enabled));
  const [exSlideIdx, setExSlideIdx] = useState(0);
  const regularScrollRef = useRef<HTMLDivElement>(null);
  const [regularScrollIndex, setRegularScrollIndex] = useState(0);

  const handleRegularScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const firstChild = container.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth : 90;
    const gap = 12;
    setRegularScrollIndex(Math.round(container.scrollLeft / (itemWidth + gap)));
  };

  // Auto-select the first available layout if current layout has no enabled templates
  useEffect(() => {
    if (availableLayouts.length > 0 && !availableLayouts.some(l => l.id === selectedLayout)) {
      const firstLayout = availableLayouts[0].id;
      setSelectedLayout(firstLayout);
      const enabledTs = templates.filter((t) => t.layout === firstLayout && t.enabled);
      if (enabledTs.length > 0) {
        const firstT = enabledTs[0];
        setVariant(firstT.isCustom ? firstT.id : firstT.id.replace(firstLayout + "_", ""));
      } else {
        setVariant("default");
      }
    }
  }, [availableLayouts, selectedLayout, setSelectedLayout, templates, setVariant]);

  if (availableLayouts.length === 0) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="speech inline-block mb-4">
          <p className="pixel text-xs">PILIH UKURAN FOTO!</p>
        </div>
        <div className="pixel-box p-8 bg-red-50 border-2 border-red-500 text-red-700 space-y-4">
          <span className="text-4xl block">⚠️</span>
          <span className="pixel text-[10px] font-bold block">SEMUA LAYOUT & FRAME TELAH DINONAKTIFKAN!</span>
          <p className="text-xs" style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}>
            Silakan buka panel Admin untuk mengaktifkan minimal satu frame.
          </p>
        </div>
        <button className="pixel-btn-powder" onClick={onBack}>◀ Kembali</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* TOP: Layout selector — compact horizontal strip */}
      <div
        className="flex flex-row flex-nowrap gap-2 overflow-x-auto no-scrollbar"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {availableLayouts.map((l) => {
          const active = selectedLayout === l.id;
          return (
            <button
              key={l.id}
              onClick={() => {
                setSelectedLayout(l.id);
                const enabledTs = templates.filter((t) => t.layout === l.id && t.enabled);
                if (enabledTs.length > 0) {
                  const firstT = enabledTs[0];
                  setVariant(firstT.isCustom ? firstT.id : firstT.id.replace(l.id + "_", ""));
                } else {
                  setVariant("default");
                }
              }}
              className="pixel-box flex flex-col items-center justify-center gap-1 transition-transform shrink-0"
              style={{
                width: "72px",
                padding: "8px 6px",
                background: active ? "var(--color-butter)" : "var(--color-card)",
                transform: active ? "translate(-2px,-2px)" : undefined,
                boxShadow: active
                  ? "0 4px 0 0 var(--color-ink),0 -4px 0 0 var(--color-ink),4px 0 0 0 var(--color-ink),-4px 0 0 0 var(--color-ink),6px 6px 0 0 var(--color-ink)"
                  : undefined,
              }}
            >
              <LayoutPreview layout={l.id} />
              <span className="pixel text-[8px] font-bold leading-tight text-center">{l.name}</span>
            </button>
          );
        })}
      </div>


      {/* BOTTOM: Frame selection — takes full remaining space */}
      <div className="w-full flex flex-col gap-2">
        {/* Frame Selection Container */}
        <div className="w-full pixel-box p-3" style={{ background: "var(--color-lavender)" }}>
          <div className="pixel text-[9px] text-center mb-2">PILIH DESAIN FRAME</div>


          {enabledTemplates.length === 0 ? (
            <div className="text-center p-4 bg-red-100 border-2 border-red-500 text-red-700 pixel text-[9px] w-full">
              ⚠️ SEMUA TEMPLATE DINONAKTIFKAN. AKTIFKAN MINIMAL SATU FRAME DI ADMIN.
            </div>
          ) : (() => {
            const aspectClass =
              selectedLayout === "1x1" ? "aspect-[4/5]"
                : selectedLayout === "2x2" ? "aspect-[1/1]"
                  : selectedLayout === "3x2" ? "aspect-[2/3]"
                    : selectedLayout === "4x2" ? "aspect-[1/2]"
                      : selectedLayout === "2x1" ? "aspect-[1/2]"
                        : "aspect-[1/3]"; // 3x1

            // Thumb width — sized so ~4 frames fit in the right column
            const thumbW =
              selectedLayout === "3x2" || selectedLayout === "4x2" ? 70
                : selectedLayout === "1x1" || selectedLayout === "2x2" ? 76
                  : 58; // narrow for vertical strips

            // Exclusive frames: pnc3, pnc4, pnc5, pnc6
            const exclusivePresetIds = ["pnc3", "pnc4", "pnc5", "pnc6"];
            const exclusiveTemplates = enabledTemplates.filter(t => exclusivePresetIds.includes(t.presetId));
            const regularTemplates = enabledTemplates.filter(t => !exclusivePresetIds.includes(t.presetId));

            const getTemplateVal = (t: Template) => t.isCustom ? t.id : t.id.replace(selectedLayout + "_", "");

            // Regular frame thumb button
            const renderThumb = (t: Template, customWidth?: string) => {
              const templateVal = getTemplateVal(t);
              const active = variant === templateVal;
              return (
                <button
                  key={t.id}
                  className={`flex flex-col items-center gap-1 transition-all shrink-0 ${active ? "scale-105 drop-shadow-md" : "opacity-60 hover:opacity-100 active:scale-95"
                    }`}
                  style={{ width: customWidth || (thumbW + "px") }}
                  onClick={() => setVariant(templateVal)}
                >
                  {t.img ? (
                    <img
                      src={t.img}
                      className={`w-full h-auto object-contain bg-white border-[2px] ${active ? "border-[var(--color-ink)]" : "border-[var(--color-ink)]/40"
                        }`}
                      alt={t.name}
                    />
                  ) : (
                    <div className={`w-full ${aspectClass} bg-white border-[2px] ${active ? "border-[var(--color-ink)]" : "border-[var(--color-ink)]/40"
                      } flex flex-col justify-around p-0.5 gap-0.5`}>
                      {Array.from({ length: LAYOUTS.find(l => l.id === selectedLayout)?.totalPhotos ?? 1 }).map((_, i) => (
                        <div key={i} className="w-full flex-1 bg-[var(--color-ink)] opacity-10" />
                      ))}
                    </div>
                  )}
                  <span className="pixel text-[6px] text-center leading-tight w-full truncate">{t.name}</span>
                </button>
              );
            };

            if (exclusiveTemplates.length > 0) {
              const safeIdx = Math.min(exSlideIdx, exclusiveTemplates.length - 1);
              const currentEx = exclusiveTemplates[safeIdx];
              const exVal = getTemplateVal(currentEx);

              return (
                <div className="w-full flex flex-row gap-3 items-stretch" style={{ minHeight: 0 }}>
                  {/* LEFT: Exclusive compact panel */}
                  <div
                    className="flex flex-col items-center gap-1.5 border-4 border-dashed border-yellow-400 bg-yellow-50/20 p-2 rounded-lg shrink-0"
                    style={{ width: "28%" }}
                  >
                    <div className="pixel text-[7px] font-bold text-yellow-500 leading-none">👑 EKSKLUSIF</div>

                    {/* Preview — compact, fixed height */}
                    <button
                      className={`w-full transition-all active:scale-95 ${variant === exVal ? "ring-2 ring-[var(--color-ink)]" : "opacity-85 hover:opacity-100"
                        }`}
                      onClick={() => setVariant(exVal)}
                    >
                      {currentEx.img ? (
                        <img
                          src={currentEx.img}
                          className="w-full h-auto object-contain bg-white border-[2px] border-[var(--color-ink)]"
                          alt={currentEx.name}
                        />
                      ) : (
                        <div className={`w-full ${aspectClass} bg-white border-[2px] border-[var(--color-ink)] flex flex-col justify-around p-1 gap-0.5`}>
                          {Array.from({ length: LAYOUTS.find(l => l.id === selectedLayout)?.totalPhotos ?? 1 }).map((_, i) => (
                            <div key={i} className="w-full flex-1 bg-[var(--color-ink)] opacity-10" />
                          ))}
                        </div>
                      )}
                    </button>

                    <span className="pixel text-[7px] font-bold text-yellow-600 text-center leading-tight truncate w-full">{currentEx.name}</span>

                    {/* Dots only (no prev/next buttons to save space — swipe with dots) */}
                    {exclusiveTemplates.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {exclusiveTemplates.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setExSlideIdx(i)}
                            className={`rounded-full transition-all ${i === safeIdx ? "w-3 h-3 bg-yellow-500 scale-110" : "w-2 h-2 bg-yellow-300"
                              }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Regular frames — touch scrollable, shows 4+ at once */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="pixel text-[7px] font-bold opacity-40 text-center">▫ FRAME REGULER</div>
                    {regularTemplates.length > 0 ? (
                      <>
                        <div
                          ref={regularScrollRef}
                          onScroll={handleRegularScroll}
                          className="w-full overflow-x-auto flex flex-row flex-nowrap gap-2 items-end pb-1 no-scrollbar"
                          style={{
                            scrollbarWidth: "none",
                            WebkitOverflowScrolling: "touch",
                            touchAction: "pan-x",
                            scrollSnapType: "x mandatory",
                          }}
                        >
                          {regularTemplates.map(t => (
                            <div key={t.id} style={{ scrollSnapAlign: "start", width: "calc((100% - 24px) / 4)", flexShrink: 0 }}>
                              {renderThumb(t, "100%")}
                            </div>
                          ))}
                        </div>
                        {/* Dots — only show if more than 4 frames */}
                        {regularTemplates.length > 4 && (
                          <div className="flex justify-center gap-1">
                            {regularTemplates.map((_, idx) => (
                              <div key={idx} className={`rounded-full transition-all ${idx === regularScrollIndex ? "w-2 h-2 bg-[var(--color-ink)]" : "w-1.5 h-1.5 bg-[var(--color-ink)]/20"
                                }`} />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-30 pixel text-[7px]">—</div>
                    )}
                  </div>
                </div>
              );
            }

            // Fallback: no exclusive frames → full-width touch scroll
            return (
              <>
                <div
                  ref={regularScrollRef}
                  onScroll={handleRegularScroll}
                  className="w-full overflow-x-auto flex flex-row flex-nowrap gap-2 items-end pb-1 no-scrollbar"
                  style={{
                    scrollbarWidth: "none",
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-x",
                    scrollSnapType: "x mandatory",
                  }}
                >
                  {enabledTemplates.map(t => (
                    <div key={t.id} style={{ scrollSnapAlign: "start", width: "calc((100% - 24px) / 4)", flexShrink: 0 }}>
                      {renderThumb(t, "100%")}
                    </div>
                  ))}
                </div>
                {enabledTemplates.length > 4 && (
                  <div className="flex justify-center gap-1 mt-1">
                    {enabledTemplates.map((_, idx) => (
                      <div key={idx} className={`rounded-full transition-all ${idx === regularScrollIndex ? "w-2 h-2 bg-[var(--color-ink)]" : "w-1.5 h-1.5 bg-[var(--color-ink)]/20"
                        }`} />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-4 w-full">
          <button
            className="pixel-btn-powder flex-1"
            onClick={onBack}
          >
            ◀ KEMBALI
          </button>
          <button
            className="pixel-btn-sage flex-1"
            onClick={onNext}
            disabled={enabledTemplates.length === 0}
          >
            LANJUT ▶
          </button>
        </div>
      </div>
    </div>
  );
}

function LayoutPreview({ layout }: { layout: LayoutId }) {
  const layoutConfig = LAYOUTS.find((l) => l.id === layout) || LAYOUTS[0];
  const { cols, totalPhotos } = layoutConfig;

  return (
    <div className="w-full flex justify-center mb-2">
      <div
        className="border-2 border-[#3A2A40] bg-white p-1.5 flex flex-col justify-between"
        style={{
          width: cols === 2 ? "72px" : "48px",
          height: "85px",
          boxShadow: "2px 2px 0 0 rgba(58, 42, 64, 0.15)",
        }}
      >
        <div className="w-full h-0.5 bg-[#3A2A40]/10 mb-1" />
        <div className={`grid gap-1 flex-1 items-center justify-center ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {[...Array(totalPhotos)].map((_, i) => (
            <div key={i} className="aspect-[4/3] w-full border border-[#3A2A40] bg-[#F1E9E3] relative">
              <span className="absolute w-[1px] h-[1px] bg-[#3A2A40] top-0 left-0" />
              <span className="absolute w-[1px] h-[1px] bg-[#3A2A40] top-0 right-0" />
              <span className="absolute w-[1px] h-[1px] bg-[#3A2A40] bottom-0 left-0" />
              <span className="absolute w-[1px] h-[1px] bg-[#3A2A40] bottom-0 right-0" />
            </div>
          ))}
        </div>
        <div className="mt-1 flex flex-col gap-0.5 items-center justify-center opacity-30">
          <div className="w-4/5 h-[1px] bg-[#3A2A40]" />
          <div className="w-3/5 h-[1px] bg-[#3A2A40]" />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Filter (Live Preview) ───────────────────────── */

function FilterScreen({
  selectedFilter,
  setSelectedFilter,
  onBack,
  onNext,
}: {
  selectedFilter: string;
  setSelectedFilter: (f: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFilter = PHOTO_FILTERS.find(f => f.id === selectedFilter) || PHOTO_FILTERS[0];

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const selectedDeviceId = localStorage.getItem("yodha_camera_device_id");
        let stream: MediaStream;
        try {
          const videoConstraints: MediaTrackConstraints = selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } };
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        } catch (e1) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setError("Kamera tidak dapat diakses. Izinkan akses kamera pada browser Anda.");
      }
    }
    init();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="w-full max-w-4xl flex flex-col items-center gap-4 sm:gap-6">
      <div className="text-center space-y-1">
        <h2 className="pixel text-lg sm:text-2xl text-[var(--color-ink)]">
          PILIH FILTER KAMERA ✨
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-sans">
          Pratinjau langsung tampilan wajah Anda sebelum sesi pemotretan dimulai.
        </p>
      </div>

      {/* Live Viewfinder Box - Much Larger */}
      <div className="relative w-full max-w-3xl aspect-[4/3] max-h-[58vh] rounded-3xl overflow-hidden border-4 border-[#3A2A40] bg-black shadow-[10px_10px_0_0_rgba(58,42,64,0.25)] flex items-center justify-center">
        {!error && (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover transition-all duration-300"
            style={{
              transform: "scaleX(-1)",
              filter: activeFilter.css,
            }}
          />
        )}

        {error && (
          <div className="text-center p-6 text-white space-y-2">
            <span className="text-4xl">📵</span>
            <p className="text-xs text-red-400 font-bold">{error}</p>
          </div>
        )}

        {/* Live Filter Indicator Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-sans">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">{activeFilter.emoji} {activeFilter.name}</span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-sans">
          <span className="text-slate-200 text-xs">{activeFilter.desc}</span>
          <span className="text-[10px] text-amber-300 font-bold tracking-wider uppercase">Live View</span>
        </div>
      </div>

      {/* Horizontal Circular Filters ("lingkaran memanjang") */}
      <div className="w-full max-w-3xl flex flex-row items-center justify-center gap-3 sm:gap-6 overflow-x-auto py-2 px-2 no-scrollbar">
        {PHOTO_FILTERS.map((f) => {
          const isSelected = f.id === selectedFilter;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer shrink-0 transition-transform active:scale-95"
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? "border-4 border-[#3A2A40] bg-[var(--color-butter)] shadow-[0_0_0_3px_#3A2A40] scale-110 -translate-y-1"
                    : "border-2 border-slate-300 bg-white hover:border-[#3A2A40] hover:scale-105 shadow-sm"
                }`}
              >
                <span className="text-2xl sm:text-3xl select-none group-hover:scale-110 transition-transform">
                  {f.emoji}
                </span>
              </div>
              <span
                className={`pixel text-[8px] sm:text-[9px] text-center font-bold tracking-tight max-w-[85px] truncate transition-colors ${
                  isSelected ? "text-[#3A2A40]" : "text-slate-500 group-hover:text-slate-800"
                }`}
              >
                {f.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between w-full max-w-3xl pt-1">
        <button
          onClick={onBack}
          className="pixel-btn-powder flex items-center gap-2"
          style={{ fontSize: "0.8rem", padding: "0.6rem 1.2rem" }}
        >
          ← PILIH BINGKAI
        </button>

        <button
          onClick={onNext}
          className="pixel-btn flex items-center gap-2"
          style={{
            fontSize: "0.85rem",
            padding: "0.7rem 1.6rem",
            background: "var(--color-ink)",
            color: "white",
          }}
        >
          MULAI FOTO 📸 →
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Shoot ───────────────────────── */

function ShootScreen({
  frame, layout, variant, selectedFilter = "normal", photos, setPhotos, onPhotosCaptured, onBack, isFullscreen, onToggleFullscreen, templates,
}: {
  frame: FrameId;
  layout: LayoutId;
  variant: string;
  selectedFilter?: string;
  photos: string[];
  setPhotos: (p: string[]) => void;
  onPhotosCaptured: (captured: string[], capturedVideos: string[]) => void;
  onBack: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  templates: Template[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const layoutConfig = LAYOUTS.find((l) => l.id === layout) || LAYOUTS[0];
  const total = layoutConfig.totalPhotos;

  const activeTemplate = templates.find(t => t.id === (layout + "_" + variant) || t.id === variant);
  const effectivePreset = activeTemplate?.presetId || variant;
  const variantConfig = getVariantHoleConfig(layout, effectivePreset);
  // All frames now stored directly in template img field; no legacy fallback needed
  const overlaySrc = activeTemplate?.img || "";

  const [detectedHoles, setDetectedHoles] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  const [overlayDimensions, setOverlayDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAndDetect() {
      if (!overlaySrc) return;
      try {
        const img = await loadImg(overlaySrc);
        if (!active) return;
        const holes = detectHolesFromImage(img);
        if (holes.length > 0) {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const pctHoles = holes.map(hole => ({
            left: (hole.x / w) * 100,
            top: (hole.y / h) * 100,
            width: (hole.w / w) * 100,
            height: (hole.h / h) * 100
          }));
          setDetectedHoles(pctHoles);
          setOverlayDimensions({ w, h });
        } else {
          setDetectedHoles([]);
          setOverlayDimensions(null);
        }
      } catch (e) {
        console.error("Failed to detect overlay holes for preview:", e);
        setDetectedHoles([]);
        setOverlayDimensions(null);
      }
    }
    loadAndDetect();
    return () => {
      active = false;
    };
  }, [overlaySrc]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const selectedDeviceId = localStorage.getItem("yodha_camera_device_id");
        let stream: MediaStream;
        try {
          const videoConstraints: MediaTrackConstraints = selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } };
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch (err) {
          console.warn("Gagal membuka kamera pilihan, kembali ke kamera default:", err);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
              audio: false,
            });
          } catch (err2) {
            console.warn("Gagal dengan resolusi ideal, mencoba kamera video basic:", err2);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
        }
      } catch (e) {
        setError("Kamera tidak bisa diakses. Izinkan akses kamera di pengaturan browser, lalu muat ulang halaman.");
      }
    }
    init();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const takeShot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;

    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.translate(w, 0); ctx.scale(-1, 1);
    const filterObj = PHOTO_FILTERS.find(f => f.id === selectedFilter);
    if (filterObj && filterObj.css && filterObj.css !== "none") {
      ctx.filter = filterObj.css;
    }
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.95);
  }, [selectedFilter]);

  const runSequence = useCallback(async () => {
    if (shooting) return;
    setShooting(true);
    const captured: string[] = [];
    const capturedVideos: string[] = [];

    for (let i = 0; i < total; i++) {
      // Start recording 5-second live clip for this pose during countdown
      const recordPromise = streamRef.current
        ? recordLiveClip(streamRef.current, 5000)
        : Promise.resolve("");

      for (let n = 5; n >= 1; n--) {
        setCountdown(n);
        await wait(1000); // 5 seconds total countdown
      }
      setCountdown(null);
      setFlashing(true);
      const shot = takeShot();
      if (shot) captured.push(shot);
      setPhotos([...captured]);
      await wait(450);
      setFlashing(false);

      const clip = await recordPromise;
      if (clip) capturedVideos.push(clip);

      await wait(400);
    }
    setShooting(false);
    setProcessing(true);
    await wait(300);
    setProcessing(false);
    onPhotosCaptured(captured, capturedVideos);
  }, [shooting, takeShot, setPhotos, onPhotosCaptured, total]);

  const statusText = () => {
    if (error) return "OOPS!";
    if (processing) return "Sedang Memproses...";
    if (countdown) return `Bersiap... ${countdown}`;
    if (shooting) return "SENYUM! 😄";
    return `${photos.length}/${total} foto · Tekan Jepret!`;
  };

  // Template info migrated to top of component to support dynamic hole detection hooks


  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "#000" }}>
      {/* ── Video background fills entire screen ── */}
      {!error && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: "scaleX(-1)",
            filter: PHOTO_FILTERS.find(f => f.id === selectedFilter)?.css || "none",
          }}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center" style={{ background: "var(--color-card)" }}>
          <div>
            <div className="text-6xl mb-4">📵</div>
            <p className="pixel text-sm mb-2">Kamera Tidak Tersedia</p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "1.3rem" }}>{error}</p>
          </div>
        </div>
      )}



      {/* Flash */}
      {flashing && <div className="absolute inset-0 bg-white flash pointer-events-none z-30" />}
      {flashing && (
        <>
          {[...Array(12)].map((_, i) => (
            <span key={i} className="absolute sparkle pixel z-30" style={{
              top: `${10 + Math.random() * 80}%`, left: `${10 + Math.random() * 80}%`,
              color: i % 2 ? "var(--color-butter)" : "white", fontSize: "18px",
              animationDelay: `${Math.random() * 200}ms`,
            }}>✦</span>
          ))}
        </>
      )}

      {/* Countdown */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="pixel countdown-number" style={{
            fontSize: "clamp(8rem, 25vw, 20rem)", color: "white",
            textShadow: "0 0 60px rgba(0,0,0,0.9), 6px 6px 0 rgba(0,0,0,0.7)", lineHeight: 1,
          }}>{countdown}</div>
        </div>
      )}

      {/* Processing overlay */}
      {processing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="pixel text-white text-base mb-6 flex items-center gap-3">
            <span className="walk inline-block">🐰</span> Memproses Foto...
          </div>
          <div className="w-72 h-6 border-4" style={{ borderColor: "white", background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full loading-bar" style={{ background: "var(--color-sage)" }} />
          </div>
        </div>
      )}

      {/* ── TOP-LEFT: Live + status ── */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
            <span className="w-2.5 h-2.5 bg-red-500 heart-blink rounded-full" />
            <span className="pixel text-white text-[9px]">LIVE</span>
          </div>
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh (F11)" : "Layar Penuh (F11)"}
            className="px-3 py-1.5 rounded text-white text-[9px] pixel flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            <span>{isFullscreen ? "⊠" : "⊡"}</span>
            <span>{isFullscreen ? "KELUAR PENUH" : "LAYAR PENUH"}</span>
          </button>
        </div>
        <div className="px-3 py-1.5 rounded w-fit" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
          <span className="pixel text-white text-[9px]">{statusText()}</span>
        </div>
      </div>

      {/* ── TOP-RIGHT: Preview strip ── */}
      <div
        className={`absolute top-4 right-4 z-20 rounded overflow-hidden ${layoutConfig.cols === 2 ? "w-40" : "w-28"}`}
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", padding: "8px" }}
      >
        <div className="pixel text-white text-[9px] text-center mb-2">PRATINJAU</div>
        <div className="relative">
          {detectedHoles.length > 0 ? (
            <div className="relative w-full overflow-hidden" style={{
              aspectRatio: overlayDimensions ? `${overlayDimensions.w} / ${overlayDimensions.h}` : `${variantConfig?.w || 1} / ${variantConfig?.h || 1}`,
              background: "#1a1a2e"
            }}>
              <img src={overlaySrc} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20" alt="" />
              {detectedHoles.map((h, i) => {
                const photoIndex = layout === "4x2" ? Math.floor(i / 2) : i;
                return (
                  <div key={i} className="absolute overflow-hidden z-10 flex items-center justify-center" style={{
                    left: `${h.left}%`, top: `${h.top}%`, width: `${h.width}%`, height: `${h.height}%`, background: "#2a2a4a"
                  }}>
                    {photos[photoIndex] ? <img src={photos[photoIndex]} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} alt="" /> : <span className="pixel text-white opacity-25 text-xs">{photoIndex + 1}</span>}
                  </div>
                );
              })}
            </div>
          ) : variantConfig ? (
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${variantConfig.w} / ${variantConfig.h}`, background: "#1a1a2e" }}>
              <img src={overlaySrc} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20" alt="" />
              {variantConfig.holes.map((h, i) => {
                const photoIndex = layout === "4x2" ? Math.floor(i / 2) : i;
                return (
                  <div key={i} className="absolute overflow-hidden z-10 flex items-center justify-center" style={{
                    left: `${h.left}%`, top: `${h.top}%`, width: `${h.width}%`, height: `${h.height}%`, background: "#2a2a4a"
                  }}>
                    {photos[photoIndex] ? <img src={photos[photoIndex]} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} alt="" /> : <span className="pixel text-white opacity-25 text-xs">{photoIndex + 1}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`grid gap-1 ${layoutConfig.cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {[...Array(total)].map((_, i) => (
                <div key={i} className="aspect-[4/3] flex items-center justify-center overflow-hidden" style={{ background: "#2a2a4a" }}>
                  {photos[i] ? <img src={photos[i]} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} alt="" /> : <span className="pixel text-white opacity-25 text-xs">{i + 1}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-2">
          {[...Array(total)].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < photos.length ? "#86efac" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      </div>

      {/* ── BOTTOM: Controls bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
      >
        <button
          className="pixel-btn-powder"
          onClick={onBack}
          disabled={shooting || processing}
          style={{ fontSize: "0.7rem", padding: "10px 18px" }}
        >
          ◀ Kembali
        </button>

        {/* Shutter button */}
        <button
          id="shutter-btn"
          onClick={runSequence}
          disabled={shooting || processing || !!error}
          style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: shooting || processing ? "rgba(255,255,255,0.3)" : "white",
            border: "5px solid rgba(255,255,255,0.85)",
            boxShadow: "0 0 0 8px rgba(255,255,255,0.2), 0 6px 24px rgba(0,0,0,0.5)",
            cursor: shooting || processing || !!error ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", transition: "transform 120ms ease",
            opacity: shooting || processing || !!error ? 0.5 : 1,
          }}
          onMouseDown={e => { if (!shooting && !processing) (e.currentTarget as HTMLElement).style.transform = "scale(0.88)"; }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          📸
        </button>

        <div className="pixel text-white text-center" style={{ fontSize: "0.65rem" }}>
          <div style={{ fontSize: "1.4rem", fontFamily: "var(--font-body)" }}>{photos.length}/{total}</div>
          <div className="opacity-60 text-[9px]">FOTO</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Review & Retake Per Photo ───────────────────────── */

function ReviewScreen({
  photos,
  setPhotos,
  liveVideos,
  setLiveVideos,
  layout,
  variant,
  selectedFilter,
  templates,
  onBack,
  onFinish,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  liveVideos: string[];
  setLiveVideos: (v: string[]) => void;
  layout: LayoutId;
  variant: string;
  selectedFilter: string;
  templates: Template[];
  onBack: () => void;
  onFinish: (finalStrip: string) => Promise<void> | void;
}) {
  const [retakeIdx, setRetakeIdx] = useState<number | null>(null);
  const [retakeCountdown, setRetakeCountdown] = useState<number | null>(null);
  const [retakeFlashing, setRetakeFlashing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const retakeVideoRef = useRef<HTMLVideoElement | null>(null);
  const retakeStreamRef = useRef<MediaStream | null>(null);

  const activeFilter = PHOTO_FILTERS.find((f) => f.id === selectedFilter) || PHOTO_FILTERS[0];

  // Open camera when retakeIdx is set
  useEffect(() => {
    if (retakeIdx === null) return;
    let cancelled = false;

    async function startRetakeCamera() {
      try {
        const selectedDeviceId = localStorage.getItem("yodha_camera_device_id");
        let stream: MediaStream;
        try {
          const videoConstraints: MediaTrackConstraints = selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
            : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } };
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        } catch (e1) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        retakeStreamRef.current = stream;
        if (retakeVideoRef.current) {
          retakeVideoRef.current.srcObject = stream;
          await retakeVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("Failed opening camera for retake:", err);
      }
    }

    startRetakeCamera();

    return () => {
      cancelled = true;
      retakeStreamRef.current?.getTracks().forEach((t) => t.stop());
      retakeStreamRef.current = null;
    };
  }, [retakeIdx]);

  const snapRetake = async () => {
    if (retakeIdx === null || !retakeVideoRef.current) return;
    const recordPromise = retakeStreamRef.current
      ? recordLiveClip(retakeStreamRef.current, 5000)
      : Promise.resolve("");

    for (let n = 5; n >= 1; n--) {
      setRetakeCountdown(n);
      await wait(1000);
    }
    setRetakeCountdown(null);
    setRetakeFlashing(true);

    const video = retakeVideoRef.current;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      if (activeFilter.css && activeFilter.css !== "none") {
        ctx.filter = activeFilter.css;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const newShot = canvas.toDataURL("image/jpeg", 0.95);

      const updated = [...photos];
      updated[retakeIdx] = newShot;
      setPhotos(updated);

      const newClip = await recordPromise;
      if (newClip) {
        const vUpdated = [...liveVideos];
        vUpdated[retakeIdx] = newClip;
        setLiveVideos(vUpdated);
      }
    }

    await wait(400);
    setRetakeFlashing(false);
    setRetakeIdx(null);
  };

  const handleFinish = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const activeTemplate = templates.find((t) => t.id === `${layout}_${variant}` || t.id === variant);
      const customImg = activeTemplate?.img;
      const presetId = activeTemplate?.presetId || variant;

      let stripResult: string;
      if (customImg) {
        stripResult = await composeTemplateFrame(photos, variant, customImg, presetId, layout);
      } else if (layout === "3x2") {
        stripResult = await compose3x2Frame(photos, variant, customImg, presetId);
      } else if (layout === "3x1" && variant !== "default") {
        stripResult = await compose3x1Variant(photos, variant, customImg, presetId);
      } else if (layout === "2x1" && variant !== "default") {
        stripResult = await compose2x1Variant(photos, variant, customImg, presetId);
      } else {
        stripResult = await composeStrip(photos, "template", layout);
      }

      await onFinish(stripResult);
    } catch (e) {
      console.error("Failed composing strip:", e);
      alert("Gagal menyusun bingkai foto. Coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center gap-6">
      <div className="text-center space-y-1">
        <h2 className="pixel text-lg sm:text-2xl text-[var(--color-ink)]">
          PRATINJAU HASIL FOTO 📸
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-sans">
          Klik foto yang ingin diulang (retake), atau klik <strong>Selesai & Cetak</strong> jika sudah puas!
        </p>
      </div>

      {/* Grid of photos */}
      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-2 gap-4">
        {photos.map((photo, i) => (
          <div
            key={i}
            onClick={() => setRetakeIdx(i)}
            className="group relative aspect-[4/3] rounded-2xl overflow-hidden border-4 border-[#3A2A40] bg-slate-900 shadow-[6px_6px_0_0_rgba(58,42,64,0.2)] cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />

            {/* Badge top-left */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/20 text-white text-[10px] font-sans font-bold flex items-center gap-1">
              <span>Foto #{i + 1}</span>
            </div>

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[2px]">
              <span className="text-2xl">↻</span>
              <span className="pixel text-[10px] font-bold">KLIK FOTO ULANG</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between w-full max-w-2xl pt-2">
        <button
          onClick={onBack}
          className="pixel-btn-powder flex items-center gap-2"
          style={{ fontSize: "0.8rem", padding: "0.6rem 1.2rem" }}
        >
          ← ULANG SEMUA
        </button>

        <button
          onClick={handleFinish}
          disabled={isProcessing}
          className="pixel-btn flex items-center gap-2"
          style={{
            fontSize: "0.9rem",
            padding: "0.75rem 1.8rem",
            background: "var(--color-sage)",
            color: "#1f2937",
          }}
        >
          {isProcessing ? "MEMPROSES... ⏳" : "SELESAI & CETAK ➔"}
        </button>
      </div>

      {/* Retake Modal */}
      {retakeIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border-4 border-[#3A2A40] shadow-2xl flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="pixel text-base text-[#3A2A40]">
                FOTO ULANG (FOTO #{retakeIdx + 1})
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Bersiap di depan kamera, lalu tekan tombol jepret di bawah.
              </p>
            </div>

            {/* Viewfinder */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[#3A2A40] bg-black flex items-center justify-center">
              <video
                ref={retakeVideoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  transform: "scaleX(-1)",
                  filter: activeFilter.css,
                }}
              />

              {retakeFlashing && (
                <div className="absolute inset-0 bg-white flash pointer-events-none z-30" />
              )}

              {retakeCountdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div
                    className="pixel countdown-number"
                    style={{
                      fontSize: "6rem",
                      color: "white",
                      textShadow: "0 0 40px rgba(0,0,0,0.9), 4px 4px 0 rgba(0,0,0,0.7)",
                      lineHeight: 1,
                    }}
                  >
                    {retakeCountdown}
                  </div>
                </div>
              )}
            </div>

            {/* Retake Modal Actions */}
            <div className="flex items-center justify-between w-full pt-1">
              <button
                type="button"
                onClick={() => setRetakeIdx(null)}
                className="pixel-btn-powder text-xs px-4 py-2"
              >
                BATAL
              </button>

              <button
                type="button"
                onClick={snapRetake}
                disabled={retakeCountdown !== null}
                className="pixel-btn text-xs px-6 py-2.5 flex items-center gap-2"
                style={{ background: "var(--color-ink)", color: "white" }}
              >
                📸 JEPRET SEKARANG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute w-3 h-3 bg-foreground";
  const map: Record<string, string> = { tl: "top-0 left-0", tr: "top-0 right-0", bl: "bottom-0 left-0", br: "bottom-0 right-0" };
  return <span className={`${base} ${map[pos]}`} />;
}

/* ───────────────────────── Result ───────────────────────── */

function ResultScreen({
  photos,
  liveVideos = [],
  frame,
  layout,
  variant,
  strip,
  setStrip,
  onRetake,
  onHome,
  templates,
}: {
  photos: string[];
  liveVideos?: string[];
  frame: FrameId;
  layout: LayoutId;
  variant: string;
  strip: string;
  setStrip: (s: string) => void;
  onRetake: () => void;
  onHome: () => void;
  templates: Template[];
}) {
  const [sessionCode] = useState(() => `YODHA-${Date.now().toString().slice(-6)}`);



  const [customText, setCustomText] = useState(() => {
    if (frame === "template") return "";
    return "★ YODHA-PHOTOBOOTH · " + new Date().toLocaleDateString() + " ★";
  });
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading_db" | "generating_gif" | "uploading_raw" | "success" | "error" | "demo">("idle");
  const [autoResetSec, setAutoResetSec] = useState(AUTO_RESET_SECONDS);
  const [printCopies, setPrintCopies] = useState(1);

  // Customer download portal URL (passes key if configured so customer HP connects seamlessly)
  const currentAnonKey = getSupabaseAnonKey();
  const currentSupabaseUrl = getSupabaseUrl();
  const keyQueryParam = currentAnonKey ? `&k=${encodeURIComponent(currentAnonKey)}` : "";
  const urlQueryParam = currentSupabaseUrl && !currentSupabaseUrl.includes("your-project-ref")
    ? `&u=${encodeURIComponent(currentSupabaseUrl)}`
    : "";

  // Check if running on localhost or local dev environment
  const isLocalHost = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".test") ||
    window.location.hostname.endsWith(".local")
  );

  const savedPublicDomain = typeof window !== "undefined" ? localStorage.getItem("yodha_public_portal_url") : null;
  const baseUrl = (savedPublicDomain && savedPublicDomain.trim())
    ? savedPublicDomain.trim().replace(/\/$/, "")
    : isLocalHost
      ? "https://yodhaphotobooth.vercel.app"
      : typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "")
        : "https://yodhaphotobooth.vercel.app";

  const portalUrl = `${baseUrl}/?session=${sessionCode}${keyQueryParam}${urlQueryParam}`;
  const [qrCodeData, setQrCodeData] = useState(portalUrl);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(qrCodeData, { width: 300, margin: 1 })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Error generating QR code:", err));
  }, [qrCodeData]);

  const uploadedRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<"strip" | "gif">("strip");
  const [gifPhotoIdx, setGifPhotoIdx] = useState(0);

  useEffect(() => {
    if (viewMode !== "gif" || photos.length === 0) return;
    const interval = setInterval(() => {
      setGifPhotoIdx(prev => (prev + 1) % photos.length);
    }, 450);
    return () => clearInterval(interval);
  }, [viewMode, photos]);

  const activeTemplate = templates.find(t => t.id === (layout + "_" + variant) || t.id === variant);
  const overlaySrc = activeTemplate?.img || "";

  const [detectedHoles, setDetectedHoles] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  const [overlayDimensions, setOverlayDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAndDetect() {
      if (!overlaySrc) return;
      try {
        const img = await loadImg(overlaySrc);
        if (!active) return;
        const holes = detectHolesFromImage(img);
        if (holes.length > 0) {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const pctHoles = holes.map(hole => ({
            left: (hole.x / w) * 100,
            top: (hole.y / h) * 100,
            width: (hole.w / w) * 100,
            height: (hole.h / h) * 100
          }));
          setDetectedHoles(pctHoles);
          setOverlayDimensions({ w, h });
        }
      } catch (e) {
        console.error("Failed to detect overlay holes for GIF preview:", e);
      }
    }
    loadAndDetect();
    return () => { active = false; };
  }, [overlaySrc]);

  const printInfo = PRINT_SIZES[layout];

  // ── Auto-reset countdown (starts only after upload finishes) ─────────
  useEffect(() => {
    const isReady = uploadStatus === "success" || uploadStatus === "demo" || uploadStatus === "error";
    if (!isReady) return;

    setAutoResetSec(AUTO_RESET_SECONDS);
    const interval = setInterval(() => {
      setAutoResetSec(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [uploadStatus, onHome]);

  // ── Upload to Supabase Database & Storage ───────────
  useEffect(() => {
    let active = true;
    if (!strip || uploadedRef.current === strip) return;

    async function uploadAndPersist() {
      uploadedRef.current = strip; // prevent duplicate uploads
      let finalStripUrl = strip;
      const sessionDB = new SessionDB();
      let dbSaved = false;

      // 1. Try Supabase Cloud Database & Storage
      if (isSupabaseConfigured()) {
        try {
          if (active) setUploadStatus("uploading_db");

          // 1. Upload photostrip terkompresi (cepat ~350KB)
          const uploadStripPromise = (async () => {
            const path = `photos/${sessionCode}_strip.jpg`;
            try {
              const compressedBlob = await compressDataUrlToJpegBlob(strip, 0.92, 1800);
              return await uploadToStorage(compressedBlob, path, "image/jpeg");
            } catch (sErr) {
              console.warn("Storage strip upload fallback:", sErr);
              return strip;
            }
          })();

          // 2. Upload raw photos secara paralel (dengan fallback foto aman jika storage terkendala)
          const uploadRawPromise = Promise.all(
            photos.map(async (p, i) => {
              try {
                const compressed = await compressDataUrlToJpegBlob(p, 0.90, 1280);
                return await uploadToStorage(compressed, `photos/${sessionCode}_raw_${i + 1}.jpg`, "image/jpeg");
              } catch (err) {
                console.warn(`Raw photo ${i + 1} fallback:`, err);
                return p;
              }
            })
          );

          // 3. Upload live videos secara paralel (format MP4 HD dengan fallback aman)
          const uploadVideosPromise = Promise.all(
            (liveVideos || []).map(async (v, i) => {
              if (!v) return "";
              try {
                return await uploadToStorage(v, `photos/${sessionCode}_live_${i + 1}.mp4`, "video/mp4");
              } catch (err) {
                console.warn(`Live video ${i + 1} fallback:`, err);
                return v;
              }
            })
          );

          // 4. Generate & upload GIF 12s (foto murni tanpa frame, rasio asli kamera)
          const uploadGifPromise = (async () => {
            try {
              const gifBase64 = await generateGifFromPhotos(photos, 640, 500, 12000);
              if (gifBase64) {
                try {
                  return await uploadToStorage(gifBase64, `photos/${sessionCode}_animation.gif`, "image/gif");
                } catch {
                  return gifBase64;
                }
              }
            } catch (gifErr) {
              console.warn("GIF generation error:", gifErr);
            }
            return undefined;
          })();

          // Jalankan seluruh upload secara paralel (selesai dalam 1-2 detik!)
          const [finalStripUrl, uploadedRawUrls, uploadedVideoUrls, finalGifUrl] = await Promise.all([
            uploadStripPromise,
            uploadRawPromise,
            uploadVideosPromise,
            uploadGifPromise,
          ]);

          // 5. Composite live video frame jika template overlay ada (format MP4 HD)
          let framedLiveVideoUrl = uploadedVideoUrls[0] || undefined;
          if (liveVideos && liveVideos.length > 0 && overlaySrc) {
            try {
              const framedVideoData = await composeLiveVideoFrame(overlaySrc, liveVideos, layout);
              if (framedVideoData) {
                try {
                  framedLiveVideoUrl = await uploadToStorage(framedVideoData, `photos/${sessionCode}_framed_live.mp4`, "video/mp4");
                } catch {
                  framedLiveVideoUrl = framedVideoData;
                }
              }
            } catch (lvErr) {
              console.warn("Framed live video error:", lvErr);
            }
          }

          const cleanTemplateUrl = overlaySrc && !overlaySrc.startsWith("data:") ? overlaySrc : undefined;

          // SIMPAN SELURUH DATA LENGKAP (FOTO ASLI, LIVE VIDEO, GIF, STRIP) DALAM 1 ATOMIC INSERT!
          await sessionDB.saveSession({
            session_code: sessionCode,
            layout,
            variant,
            template_url: cleanTemplateUrl,
            strip_url: finalStripUrl,
            gif_url: finalGifUrl,
            live_photo_url: framedLiveVideoUrl,
            live_videos: uploadedVideoUrls.filter(Boolean),
            raw_photos: uploadedRawUrls.filter(Boolean),
            total_photos: photos.length,
          });

          dbSaved = true;
          if (active) setUploadStatus("success");
        } catch (dbErr) {
          console.warn("Supabase upload/save warning, fallback to local:", dbErr);
        }
      }

      // 2. Fallback: Save session to local database cache if offline or not configured
      if (!dbSaved) {
        let fallbackGif: string | undefined = undefined;
        try {
          fallbackGif = await generateGifFromPhotos(photos, 640, 500, 12000);
        } catch {}

        await sessionDB.saveSession({
          session_code: sessionCode,
          layout,
          variant,
          template_url: overlaySrc && !overlaySrc.startsWith("data:") ? overlaySrc : undefined,
          strip_url: strip,
          gif_url: fallbackGif,
          live_photo_url: liveVideos[0] || photos[0],
          live_videos: liveVideos || [],
          raw_photos: photos,
          total_photos: photos.length,
        });
        if (active) setUploadStatus("demo");
      }
    }

    uploadAndPersist();
    return () => { active = false; };
  }, [strip, photos, layout, variant, sessionCode]);

  const download = () => {
    const a = document.createElement("a");
    a.href = strip; a.download = `yodha-photobooth-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  // ── Print with correct physical dimensions ────────────────────────
  const printPhoto = () => {
    const { sheets, w, h } = printInfo;
    const sheetWidth = (layout === "3x1" || layout === "2x1") ? w * 2 : w;
    const sheetHeight = h;

    // Convert base64 data URL to Blob URL to ensure fast loading/rendering
    const blob = dataURLtoBlob(strip);
    const blobUrl = URL.createObjectURL(blob);

    let pagesContent = "";

    if (layout === "3x1" || layout === "2x1") {
      // Untuk strip 5cm: cetak sesuai jumlah rangkap (printCopies) di mana satu lembar 10x15cm memuat maksimal 2 strip
      const totalSheets = Math.ceil(printCopies / 2);
      let remainingCopies = printCopies;

      for (let s = 0; s < totalSheets; s++) {
        if (remainingCopies >= 2) {
          pagesContent += `
            <div class="page">
              <div class="print-container">
                <img src="${blobUrl}" style="width:50%;height:100%;display:block;object-fit:contain;" />
                <img src="${blobUrl}" style="width:50%;height:100%;display:block;object-fit:contain;" />
              </div>
            </div>
          `;
          remainingCopies -= 2;
        } else {
          // Hanya ada 1 rangkap tersisa untuk lembar ini: taruh di sebelah kanan agar sejajar baki kertas printer
          pagesContent += `
            <div class="page">
              <div class="print-container">
                <div style="width:50%; height:100%;"></div>
                <img src="${blobUrl}" style="width:50%;height:100%;display:block;object-fit:contain;" />
              </div>
            </div>
          `;
          remainingCopies -= 1;
        }
      }
    } else {
      // Untuk 3x2 (grid) dan 1x1 (foto tunggal): cetak 1 gambar per halaman (lebar 10cm, tinggi 15cm)
      for (let c = 0; c < printCopies; c++) {
        pagesContent += `
          <div class="page">
            <div class="print-container">
              <img src="${blobUrl}" style="width:100%;height:100%;display:block;object-fit:contain;" />
            </div>
          </div>
        `;
      }
    }

    // Create container element in the main document for printing
    const printDiv = document.createElement("div");
    printDiv.id = "yodha-print-section";
    printDiv.innerHTML = pagesContent;
    document.body.appendChild(printDiv);

    // Inject print styles dynamically
    const printStyle = document.createElement("style");
    printStyle.id = "yodha-print-style";
    printStyle.innerHTML = `
      @media print {
        body > *:not(#yodha-print-section) {
          display: none !important;
        }
        html, body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #yodha-print-section {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        @page {
          size: ${sheetWidth}cm ${sheetHeight}cm;
          margin: 0;
        }
        .page {
          width: 100vw !important;
          height: 100vh !important;
          position: relative !important;
          page-break-after: always !important;
          break-after: page !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: white !important;
        }
        .page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .print-container {
          position: absolute !important;
          top: 0 !important;
          right: 0 !important;
          width: ${sheetWidth}cm !important;
          height: ${sheetHeight}cm !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          padding: 0.25cm !important;
          box-sizing: border-box !important;
        }
        img {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(printStyle);

    // Function to cleanup print elements and styles
    const cleanup = () => {
      if (document.getElementById("yodha-print-section")) {
        document.body.removeChild(printDiv);
      }
      if (document.getElementById("yodha-print-style")) {
        document.head.removeChild(printStyle);
      }
      URL.revokeObjectURL(blobUrl);
    };

    // Wait for the images to decode and yield thread before printing
    const imgs = Array.from(printDiv.querySelectorAll("img"));
    if (imgs.length === 0) {
      window.print();
      cleanup();
    } else {
      let loadedCount = 0;
      const triggerPrint = () => {
        loadedCount++;
        if (loadedCount === imgs.length) {
          Promise.all(imgs.map(img => {
            if (img.decode) {
              return img.decode().catch(() => {});
            }
            return Promise.resolve();
          })).then(() => {
            // Give 500ms for browser to render
            setTimeout(() => {
              window.print();
              cleanup();
            }, 500);
          });
        }
      };

      imgs.forEach(img => {
        if (img.complete) {
          triggerPrint();
        } else {
          img.onload = triggerPrint;
          img.onerror = triggerPrint;
        }
      });
    }
  };

  // Progress bar width
  const progressPct = (autoResetSec / AUTO_RESET_SECONDS) * 100;

  return (
    <div className="w-full space-y-6">

      <div className="w-full grid md:grid-cols-2 gap-8 items-start">
        {/* Strip preview */}
        <div className="flex flex-col items-center">
          <div className="pixel-box p-4 overflow-hidden w-full max-w-[320px]" style={{ background: "var(--color-blush)" }}>
            <div className="pixel text-[10px] text-center mb-3">★ FOTO STRIP ★</div>
            <div className="overflow-hidden relative flex justify-center" style={{ background: "var(--color-ink)", padding: "6px" }}>
              <img
                src={strip}
                alt="strip foto"
                className="slot-out block w-full max-w-[260px] object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="pixel text-[9px] text-center mt-3">YODHA-PHOTOBOOTH ©</div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col items-center justify-center space-y-5">
          {/* Print size info */}
          <div className="pixel-box p-3 w-full flex items-center gap-3" style={{ background: "var(--color-butter)" }}>
            <span className="text-2xl">🖨️</span>
            <div>
              <div className="pixel text-[10px] font-bold">Ukuran Cetak</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}>{printInfo.label}</div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="pixel-box p-4 flex flex-col items-center gap-3 w-full" style={{ background: "var(--color-card)" }}>
            {uploadStatus !== "success" && uploadStatus !== "demo" && uploadStatus !== "error" ? (
              /* Loading State Before QR appears */
              <div className="w-52 h-52 rounded-2xl bg-white/70 border-2 border-dashed border-[#3A2A40]/40 flex flex-col items-center justify-center p-4 text-center gap-3 shadow-inner">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="absolute text-sm">📸</span>
                </div>
                <div className="space-y-1">
                  <span className="pixel text-[9px] text-[#3A2A40] block font-bold">
                    MENYIMPAN FOTO...
                  </span>
                  <span className="text-[10px] text-slate-500 block font-sans leading-tight">
                    {uploadStatus === "uploading_db" && "Mengunggah strip foto..."}
                    {uploadStatus === "uploading_raw" && "Mengunggah foto mentah..."}
                    {uploadStatus === "generating_gif" && "Menyiapkan animasi GIF..."}
                    {uploadStatus === "idle" && "Menyiapkan penyimpanan cloud..."}
                  </span>
                </div>
                <span className="pixel text-[8px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                  QR akan muncul otomatis
                </span>
              </div>
            ) : (
              /* QR Code Appears After Upload Finishes */
              <>
                <div className="pixel-box p-2 bg-white border-2 border-[#3A2A40] shadow-[3px_3px_0_0_rgba(0,0,0,0.15)] flex items-center justify-center shrink-0 animate-in fade-in zoom-in duration-300">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR Code Unduh Foto"
                      className="w-44 h-44"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs font-bold text-slate-400">
                      Memuat QR...
                    </div>
                  )}
                </div>
                <span className="pixel text-[10px] font-bold text-center text-[#3A2A40]">
                  SCAN QR UNTUK SIMPAN FOTO & GIF
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Sesi: {sessionCode}
                </span>

                {uploadStatus === "success" && (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="pixel text-[9px] text-emerald-600 font-bold">
                      ✅ Foto, GIF & Foto Asli tersimpan!
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      Scan QR di atas dengan kamera HP Anda
                    </span>
                  </div>
                )}
                {uploadStatus === "error" && (
                  <span className="pixel text-[9px] text-rose-600 text-center font-bold">
                    ⚠️ Menggunakan penyimpanan sesi lokal
                  </span>
                )}
                {uploadStatus === "demo" && (
                  <div className="w-full bg-amber-50 border border-amber-300 rounded-xl p-2 text-center text-amber-900 space-y-1 mt-1">
                    <span className="pixel text-[9px] text-amber-700 block font-bold">
                      ⚠️ Supabase Belum Terhubung
                    </span>
                    <span className="text-[10px] text-amber-800 block font-sans leading-tight">
                      Foto tersimpan di laptop ini. Masukkan Supabase Anon Key di Dashboard Admin agar foto dapat di-scan dari HP.
                    </span>
                  </div>
                )}

                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>↗ Buka Portal Unduh di Tab Baru</span>
                </a>
              </>
            )}
          </div>

          {/* Print Copies Selector */}
          <div className="pixel-box p-3 w-full flex items-center justify-between gap-3" style={{ background: "var(--color-lavender)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <span className="pixel text-[9px] font-bold">Jumlah Cetak (Rangkap)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="pixel-btn-powder flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ width: "32px", height: "32px", padding: 0, fontSize: "1.2rem" }}
                onClick={() => setPrintCopies(prev => Math.max(1, prev - 1))}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="99"
                value={printCopies}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPrintCopies(isNaN(val) || val < 1 ? 1 : val);
                }}
                className="w-12 h-8 text-center border-2 border-[var(--color-ink)] bg-white font-bold"
                style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}
              />
              <button
                type="button"
                className="pixel-btn-powder flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{ width: "32px", height: "32px", padding: 0, fontSize: "1.2rem" }}
                onClick={() => setPrintCopies(prev => Math.min(99, prev + 1))}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 w-full">
            <button
              id="print-btn"
              className="pixel-btn flex items-center gap-2"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', background: "var(--color-ink)", color: "var(--color-card)" }}
              onClick={printPhoto}
            >
              🖨️ Cetak Foto
            </button>
            <button className="pixel-btn" style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }} onClick={download}>⬇ Simpan Foto</button>
          </div>
          <div className="flex flex-wrap justify-center gap-3 w-full">
            <button className="pixel-btn-sage" style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }} onClick={onRetake}>↻ Foto Ulang</button>
            <button className="pixel-btn-powder" style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }} onClick={onHome}>⌂ Beranda</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function detectHolesFromImage(frameImg: HTMLImageElement): { x: number; y: number; w: number; h: number }[] {
  // Scale down to max 400px for speed — holes will be scaled back up
  const SCALE_MAX = 400;
  const origW = frameImg.naturalWidth || frameImg.width;
  const origH = frameImg.naturalHeight || frameImg.height;
  const scale = Math.min(1, SCALE_MAX / Math.max(origW, origH));
  const width = Math.round(origW * scale);
  const height = Math.round(origH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(frameImg, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const isTransparent = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      isTransparent[i / 4] = 1;
    }
  }

  const visited = new Uint8Array(width * height);
  const holes: { x: number; y: number; w: number; h: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isTransparent[idx] && !visited[idx]) {
        let minX = x, maxX = x;
        let minY = y, maxY = y;

        const queue: [number, number][] = [[x, y]];
        visited[idx] = 1;

        let head = 0;
        while (head < queue.length) {
          const [cx, cy] = queue[head++];

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (isTransparent[nidx] && !visited[nidx]) {
                visited[nidx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const area = w * h;
        if (w >= width * 0.10 && h >= height * 0.04 && area >= (width * height) * 0.012 && w < width * 0.98 && h < height * 0.98) {
          // Scale back up to original resolution
          holes.push({
            x: Math.round(minX / scale),
            y: Math.round(minY / scale),
            w: Math.round(w / scale),
            h: Math.round(h / scale)
          });
        }
      }
    }
  }

  holes.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 20) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return holes;
}

async function composeTemplateFrame(photos: string[], variant: string = "default", customImg?: string, presetId?: string, layout?: string): Promise<string> {
  const effectivePreset = presetId || variant;

  if (!customImg) throw new Error("Template image is missing!");
  const frameImg = await loadImg(customImg);

  const FRAME_W = frameImg.width;
  const FRAME_H = frameImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Fill white background for canvas
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);

  let holes = detectHolesFromImage(frameImg);

  if (holes.length > 0) {
    // Draw each photo into its corresponding detected hole
    for (let i = 0; i < holes.length; i++) {
      const photoIndex = layout === "4x2" ? Math.floor(i / 2) : i;
      if (!photos[photoIndex]) break;
      const hole = holes[i];
      try {
        const img = await loadImg(photos[photoIndex]);
        const holeRatio = hole.w / hole.h;
        const imgRatio = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > holeRatio) {
          sw = img.height * holeRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / holeRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, hole.x, hole.y, hole.w, hole.h);
      } catch (e) {
        console.error(`Gagal menggambar foto ${i} pada hole`, e);
        ctx.fillStyle = "#0D3B59";
        ctx.fillRect(hole.x, hole.y, hole.w, hole.h);
      }
    }
  } else {
    // Fallback: draw photos[0] over the entire background if no holes are detected
    if (photos.length > 0) {
      try {
        const img = await loadImg(photos[0]);
        const holeRatio = FRAME_W / FRAME_H;
        const imgRatio = img.width / img.height;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > holeRatio) {
          sw = img.height * holeRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / holeRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, FRAME_W, FRAME_H);
      } catch (e) {
        ctx.fillStyle = "#0D3B59";
        ctx.fillRect(0, 0, FRAME_W, FRAME_H);
      }
    } else {
      ctx.fillStyle = "#0D3B59";
      ctx.fillRect(0, 0, FRAME_W, FRAME_H);
    }
  }

  try {
    ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H);
  } catch (e) {
    console.error("Gagal memuat frame overlay", e);
  }

  return canvas.toDataURL("image/png");
}

async function compose2x1Variant(photos: string[], variant: string, customImg?: string, presetId?: string): Promise<string> {
  const effectivePreset = presetId || variant;
  
  if (!customImg) throw new Error("Template image is missing!");
  const frameImg = await loadImg(customImg);
  const FRAME_W = frameImg.width;
  const FRAME_H = frameImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let holes = detectHolesFromImage(frameImg);
  if (holes.length !== 2) {
    const config = getVariantHoleConfig("2x1", effectivePreset);
    if (config) {
      holes = config.holes.map(h => ({
        x: (h.left / 100) * FRAME_W,
        y: (h.top / 100) * FRAME_H,
        w: (h.width / 100) * FRAME_W,
        h: (h.height / 100) * FRAME_H,
      }));
    }
  }

  for (let i = 0; i < photos.length; i++) {
    if (!holes[i]) break;
    const hole = holes[i];
    try {
      const img = await loadImg(photos[i]);
      const holeRatio = hole.w / hole.h;
      const imgRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > holeRatio) {
        sw = img.height * holeRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / holeRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, hole.x, hole.y, hole.w, hole.h);
    } catch (e) {
      ctx.fillStyle = "#3A2A40";
      ctx.fillRect(hole.x, hole.y, hole.w, hole.h);
    }
  }

  ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H);

  return canvas.toDataURL("image/png");
}

async function compose3x2Frame(photos: string[], variant: string = "default", customImg?: string, presetId?: string): Promise<string> {
  const effectivePreset = presetId || variant;
  
  if (!customImg) throw new Error("Template image is missing!");
  const frameImg = await loadImg(customImg);
  const w = frameImg.width;
  const h = frameImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);

  let holes = detectHolesFromImage(frameImg);

  if (holes.length !== 6) {
    const rw = w / 1333;
    const rh = h / 2000;

    if (effectivePreset === "default") {
      const rH_old = h / 1999;
      holes = [
        { x: 125 * rw, y: 552 * rH_old, w: 419 * rw, h: 316 * rH_old },
        { x: 781 * rw, y: 560 * rH_old, w: 420 * rw, h: 316 * rH_old },
        { x: 125 * rw, y: 1019 * rH_old, w: 419 * rw, h: 316 * rH_old },
        { x: 781 * rw, y: 1028 * rH_old, w: 420 * rw, h: 315 * rH_old },
        { x: 125 * rw, y: 1487 * rH_old, w: 419 * rw, h: 316 * rH_old },
        { x: 781 * rw, y: 1495 * rH_old, w: 420 * rw, h: 316 * rH_old }
      ];
    } else if (effectivePreset === "frame2") {
      holes = [
        { x: 31 * rw, y: 64 * rh, w: 605 * rw, h: 546 * rh },
        { x: 698 * rw, y: 65 * rh, w: 606 * rw, h: 546 * rh },
        { x: 31 * rw, y: 641 * rh, w: 605 * rw, h: 554 * rh },
        { x: 698 * rw, y: 642 * rh, w: 606 * rw, h: 553 * rh },
        { x: 31 * rw, y: 1226 * rh, w: 605 * rw, h: 573 * rh },
        { x: 697 * rw, y: 1226 * rh, w: 607 * rw, h: 573 * rh }
      ];
    } else if (effectivePreset === "frame3") {
      holes = [
        { x: 78 * rw, y: 60 * rh, w: 545 * rw, h: 520 * rh },
        { x: 707 * rw, y: 60 * rh, w: 546 * rw, h: 520 * rh },
        { x: 78 * rw, y: 660 * rh, w: 545 * rw, h: 520 * rh },
        { x: 707 * rw, y: 660 * rh, w: 546 * rw, h: 520 * rh },
        { x: 78 * rw, y: 1259 * rh, w: 546 * rw, h: 520 * rh },
        { x: 707 * rw, y: 1259 * rh, w: 546 * rw, h: 520 * rh }
      ];
    } else if (effectivePreset === "frame4") {
      holes = [
        { x: 49 * rw, y: 79 * rh, w: 569 * rw, h: 481 * rh },
        { x: 707 * rw, y: 139 * rh, w: 592 * rw, h: 396 * rh },
        { x: 49 * rw, y: 674 * rh, w: 569 * rw, h: 481 * rh },
        { x: 715 * rw, y: 640 * rh, w: 572 * rw, h: 439 * rh },
        { x: 49 * rw, y: 1269 * rh, w: 569 * rw, h: 480 * rh },
        { x: 720 * rw, y: 1166 * rh, w: 544 * rw, h: 456 * rh }
      ];
    } else if (effectivePreset === "frame5") {
      holes = [
        { x: 89 * rw, y: 168 * rh, w: 483 * rw, h: 399 * rh },
        { x: 755 * rw, y: 168 * rh, w: 484 * rw, h: 399 * rh },
        { x: 112 * rw, y: 726 * rh, w: 451 * rw, h: 384 * rh },
        { x: 779 * rw, y: 726 * rh, w: 450 * rw, h: 384 * rh },
        { x: 103 * rw, y: 1267 * rh, w: 446 * rw, h: 401 * rh },
        { x: 770 * rw, y: 1267 * rh, w: 446 * rw, h: 401 * rh }
      ];
    } else if (effectivePreset === "frame6") {
      holes = [
        { x: 35 * rw, y: 126 * rh, w: 597 * rw, h: 422 * rh },
        { x: 701 * rw, y: 126 * rh, w: 598 * rw, h: 422 * rh },
        { x: 39 * rw, y: 629 * rh, w: 588 * rw, h: 451 * rh },
        { x: 706 * rw, y: 629 * rh, w: 588 * rh, h: 451 * rh },
        { x: 53 * rw, y: 1159 * rh, w: 559 * rw, h: 475 * rh },
        { x: 720 * rw, y: 1159 * rh, w: 559 * rw, h: 475 * rh }
      ];
    } else if (effectivePreset === "frame7") {
      holes = [
        { x: 31 * rw, y: 57 * rh, w: 599 * rw, h: 523 * rh },
        { x: 703 * rw, y: 57 * rh, w: 599 * rw, h: 523 * rh },
        { x: 28 * rw, y: 631 * rh, w: 602 * rw, h: 522 * rh },
        { x: 703 * rw, y: 631 * rh, w: 602 * rw, h: 522 * rh },
        { x: 29 * rw, y: 1206 * rh, w: 600 * rw, h: 520 * rh },
        { x: 704 * rw, y: 1206 * rh, w: 601 * rw, h: 520 * rh }
      ];
    } else if (effectivePreset === "frame8") {
      holes = [
        { x: 108 * rw, y: 82 * rh, w: 511 * rw, h: 512 * rh },
        { x: 715 * rw, y: 82 * rh, w: 510 * rw, h: 512 * rh },
        { x: 108 * rw, y: 676 * rh, w: 511 * rw, h: 512 * rh },
        { x: 714 * rw, y: 676 * rh, w: 511 * rw, h: 512 * rh },
        { x: 107 * rw, y: 1270 * rh, w: 513 * rw, h: 513 * rh },
        { x: 714 * rw, y: 1270 * rh, w: 512 * rw, h: 514 * rh }
      ];
    } else if (effectivePreset === "frame9") {
      holes = [
        { x: 53 * rw, y: 53 * rh, w: 561 * rw, h: 560 * rh },
        { x: 720 * rw, y: 53 * rh, w: 560 * rw, h: 560 * rh },
        { x: 53 * rw, y: 660 * rh, w: 561 * rw, h: 560 * rh },
        { x: 720 * rw, y: 660 * rh, w: 560 * rw, h: 560 * rh },
        { x: 53 * rw, y: 1267 * rh, w: 561 * rw, h: 560 * rh },
        { x: 720 * rw, y: 1267 * rh, w: 560 * rw, h: 560 * rh }
      ];
    }
  }

  for (let i = 0; i < 6; i++) {
    if (photos[i] && holes[i]) {
      try {
        const img = await loadImg(photos[i]);
        const hole = holes[i];
        const imgRatio = img.width / img.height;
        const cellRatio = hole.w / hole.h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > cellRatio) {
          sw = img.height * cellRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / cellRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, hole.x, hole.y, hole.w, hole.h);
      } catch (e) {
        console.error("Gagal memuat foto untuk frame 3x2", e);
      }
    }
  }

  ctx.drawImage(frameImg, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

async function compose3x1Variant(photos: string[], variant: string, customImg?: string, presetId?: string): Promise<string> {
  const effectivePreset = presetId || variant;
  if (!customImg) throw new Error("Template image is missing!");
  const assetUrl = customImg;

  const frameImg = await loadImg(assetUrl);
  const w = frameImg.width;
  const h = frameImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);

  let holes = detectHolesFromImage(frameImg);

  if (holes.length !== 3) {
    const rw = w / (effectivePreset === "frame1" ? 600 : 724);
    const rh = h / (effectivePreset === "frame1" ? 1800 : 2172);

    if (effectivePreset === "frame1") {
      holes = [
        { x: 78 * rw, y: 478 * rh, w: 440 * rw, h: 275 * rh },
        { x: 78 * rw, y: 863 * rh, w: 440 * rw, h: 275 * rh },
        { x: 78 * rw, y: 1248 * rh, w: 440 * rw, h: 275 * rh },
      ];
    } else if (effectivePreset === "frame2") {
      holes = [
        { x: 49 * rw, y: 68 * rh, w: 632 * rw, h: 530 * rh },
        { x: 56 * rw, y: 670 * rh, w: 627 * rw, h: 536 * rh },
        { x: 52 * rw, y: 1265 * rh, w: 625 * rw, h: 542 * rh },
      ];
    } else if (effectivePreset === "frame3") {
      holes = [
        { x: 63 * rw, y: 157 * rh, w: 594 * rw, h: 414 * rh },
        { x: 63 * rw, y: 746 * rh, w: 594 * rw, h: 413 * rh },
        { x: 63 * rw, y: 1334 * rh, w: 594 * rw, h: 414 * rh },
      ];
    } else if (effectivePreset === "frame4") {
      holes = [
        { x: 56 * rw, y: 192 * rh, w: 612 * rw, h: 541 * rh },
        { x: 56 * rw, y: 790 * rh, w: 612 * rw, h: 541 * rh },
        { x: 56 * rw, y: 1388 * rh, w: 612 * rw, h: 541 * rh },
      ];
    } else if (effectivePreset === "frame5") {
      holes = [
        { x: 89 * rw, y: 82 * rh, w: 546 * rw, h: 545 * rh },
        { x: 89 * rw, y: 747 * rh, w: 546 * rw, h: 546 * rh },
        { x: 89 * rw, y: 1412 * rh, w: 546 * rw, h: 545 * rh },
      ];
    }
  }

  for (let i = 0; i < 3; i++) {
    if (photos[i] && holes[i]) {
      try {
        const img = await loadImg(photos[i]);
        const hole = holes[i];
        const imgRatio = img.width / img.height;
        const cellRatio = hole.w / hole.h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > cellRatio) {
          sw = img.height * cellRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / cellRatio;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, hole.x, hole.y, hole.w, hole.h);
      } catch (e) {
        console.error("Gagal memuat foto untuk frame 3x1", e);
      }
    }
  }

  ctx.drawImage(frameImg, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

async function composeStrip(
  photos: string[],
  frame: FrameId,
  layout: LayoutId,
  footerText: string = "★ YODHA-PHOTOBOOTH · " + new Date().toLocaleDateString() + " ★"
): Promise<string> {
  const layoutConfig = LAYOUTS.find((l) => l.id === layout) || LAYOUTS[0];
  const { cols, rows } = layoutConfig;

  const SCALE = 3;
  const W = (cols === 2 ? 760 : 480) * SCALE;
  const pad = 20 * SCALE;
  const border = 20 * SCALE;
  const gap = 14 * SCALE;

  const w = cols === 2 ? (W - (pad + border) * 2 - gap) / 2 : W - (pad + border) * 2;
  const h = w * 3 / 4;

  const headerH = 80 * SCALE;
  const footerH = 140 * SCALE;
  const H = headerH + rows * h + (rows - 1) * gap + footerH + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const palette: Record<FrameId, { bg: string; accent: string; title: string }> = {
    template: { bg: "#0D3B59", accent: "#F89E1B", title: "★ RESMI ★" },
    cafe: { bg: "#F6CFCB", accent: "#3A2A40", title: "☕ COZY CAFE ☕" },
    gameboy: { bg: "#CFE3CB", accent: "#3A2A40", title: "▶ GAMEBOY MODE" },
    bedroom: { bg: "#CFDDF0", accent: "#3A2A40", title: "♡ RETRO ROOM ♡" },
  };
  const p = palette[frame];

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, W, 8 * SCALE);
  ctx.fillRect(0, H - 8 * SCALE, W, 8 * SCALE);
  ctx.fillRect(0, 0, 8 * SCALE, H);
  ctx.fillRect(W - 8 * SCALE, 0, 8 * SCALE, H);

  ctx.fillStyle = p.accent;
  ctx.font = `bold ${Math.round(22 * SCALE)}px 'Press Start 2P', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.title, W / 2, pad + headerH / 2);

  const imgs = await Promise.all(photos.map(loadImg));
  imgs.forEach((img, i) => {
    const colIndex = i % cols;
    const rowIndex = Math.floor(i / cols);
    const x = pad + border + colIndex * (w + gap);
    const y = pad + headerH + rowIndex * (h + gap);

    ctx.fillStyle = p.accent;
    ctx.fillRect(x - 6 * SCALE, y - 6 * SCALE, w + 12 * SCALE, h + 12 * SCALE);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, w, h);

    const slotRatio = w / h;
    const imgRatio = img.width / img.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > slotRatio) {
      sw = img.height * slotRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / slotRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);

    [[x, y], [x + w - 8 * SCALE, y], [x, y + h - 8 * SCALE], [x + w - 8 * SCALE, y + h - 8 * SCALE]].forEach(([cx, cy]) => {
      ctx.fillStyle = p.accent; ctx.fillRect(cx, cy, 8 * SCALE, 8 * SCALE);
    });
  });

  ctx.fillStyle = p.accent;
  ctx.font = `${Math.round(14 * SCALE)}px 'Press Start 2P', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(footerText, W / 2, H - pad - footerH + 40 * SCALE);

  const decY = H - pad - 45 * SCALE;
  if (frame === "gameboy") {
    const dpadX = pad + 50 * SCALE;
    ctx.fillStyle = p.accent;
    ctx.fillRect(dpadX - 18 * SCALE, decY - 6 * SCALE, 36 * SCALE, 12 * SCALE);
    ctx.fillRect(dpadX - 6 * SCALE, decY - 18 * SCALE, 12 * SCALE, 36 * SCALE);

    const selectX = W / 2 - 35 * SCALE;
    const startX = W / 2 + 15 * SCALE;
    const pillY = decY + 15 * SCALE;

    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.translate(selectX, pillY);
    ctx.rotate(-28 * Math.PI / 180);
    ctx.fillRect(-12 * SCALE, -2.5 * SCALE, 24 * SCALE, 5 * SCALE);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.translate(startX, pillY);
    ctx.rotate(-28 * Math.PI / 180);
    ctx.fillRect(-12 * SCALE, -2.5 * SCALE, 24 * SCALE, 5 * SCALE);
    ctx.restore();

    const buttonY = decY;
    const btnAX = W - pad - 50 * SCALE;
    const btnBX = W - pad - 90 * SCALE;

    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(btnBX, buttonY + 6 * SCALE, 11 * SCALE, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E63946";
    ctx.beginPath(); ctx.arc(btnBX, buttonY + 6 * SCALE, 8 * SCALE, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.arc(btnAX, buttonY - 6 * SCALE, 11 * SCALE, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E63946";
    ctx.beginPath(); ctx.arc(btnAX, buttonY - 6 * SCALE, 8 * SCALE, 0, Math.PI * 2); ctx.fill();
  } else if (frame === "cafe") {
    ctx.font = `${Math.round(24 * SCALE)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("☕", pad + 50 * SCALE, decY);
    ctx.fillText("🍩", W - pad - 50 * SCALE, decY);
  } else if (frame === "bedroom") {
    ctx.font = `${Math.round(24 * SCALE)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🐱", pad + 50 * SCALE, decY);
    ctx.fillText("🌙", W - pad - 50 * SCALE, decY);

  }

  try {
    const ydLogo = await loadImg(yodhaLogo);
    const logoH = 36 * SCALE;
    const logoW = (ydLogo.width / ydLogo.height) * logoH;
    ctx.drawImage(ydLogo, pad + 4 * SCALE, pad + (headerH - logoH) / 2, logoW, logoH);
  } catch (e) {
    console.error("Gagal memuat logo header", e);
  }

  return canvas.toDataURL("image/png");
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
