import React, { useState, useRef, useEffect } from "react";
import yodhaLogo from "@/assets/yodha.png";
import { CustomTemplate, SessionDB, PhotoboothSession, SettingsDB } from "../lib/db";
import { isSupabaseConfigured, testSupabaseConnection } from "../lib/supabase";
import { logoutAdmin, getAdminPin, setAdminPin, createBoothSession } from "../lib/auth";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Frame,
  Camera,
  Monitor,
  Settings,
  Database,
  LogOut,
  ExternalLink,
  Plus,
  Search,
  Check,
  X,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  SidebarClose,
  SidebarOpen,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export interface Template {
  id: string;
  name: string;
  layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2";
  img: string;
  isCustom: boolean;
  enabled: boolean;
  presetId: string;
}

interface AdminScreenProps {
  templates: Template[];
  onToggleTemplate: (id: string, enabled: boolean) => void;
  onAddTemplate: (
    name: string,
    layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2",
    presetId: string,
    base64Img: string
  ) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onLaunchBooth: () => void;
  onLogout: () => void;
}

const LAYOUT_LABELS: Record<string, string> = {
  "3x1": "Strip Vertikal (3x1)",
  "3x2": "Grid 6 Foto (3x2)",
  "2x2": "Grid 2x2 (2x2)",
  "2x1": "Strip Pendek (2x1)",
  "1x1": "Foto Tunggal (1x1)",
  "4x2": "Grid 8 Foto (4x2)",
};

const HOLE_PRESETS: Record<string, { id: string; label: string }[]> = {
  "3x1": [
    { id: "frame1", label: "Pink (Preset 1)" },
    { id: "frame2", label: "Biru (Preset 2)" },
    { id: "frame3", label: "Frame 1 (Preset 3)" },
    { id: "frame4", label: "Frame 2 (Preset 4)" },
    { id: "frame5", label: "Frame 3 (Preset 5)" },
  ],
  "2x1": [
    { id: "frame1", label: "Frame 1 (Preset 1)" },
    { id: "frame2", label: "Frame 2 (Preset 2)" },
    { id: "frame3", label: "Frame 3 (Preset 3)" },
    { id: "frame4", label: "Frame 4 (Preset 4)" },
    { id: "frame5", label: "Frame 5 (Preset 5)" },
    { id: "frame6", label: "Frame 6 (Preset 6)" },
  ],
  "3x2": [
    { id: "default", label: "Default (Preset 1)" },
    { id: "frame2", label: "Frame 2 (Preset 2)" },
    { id: "frame3", label: "Frame 3 (Preset 3)" },
    { id: "frame4", label: "Frame 4 (Preset 4)" },
    { id: "frame5", label: "Frame 5 (Preset 5)" },
    { id: "frame6", label: "Frame 6 (Preset 6)" },
    { id: "frame7", label: "Frame 7 (Preset 7)" },
    { id: "frame8", label: "Frame 8 (Preset 8)" },
    { id: "frame9", label: "Frame 9 (Preset 9)" },
  ],
  "1x1": [{ id: "default", label: "Default (Full Overlap)" }],
  "2x2": [{ id: "default", label: "Default (Full Overlap)" }],
  "4x2": [{ id: "default", label: "Default (Full Overlap)" }],
};

const settingsDB = new SettingsDB();
const sessionDB = new SessionDB();

export function AdminScreen({
  templates,
  onToggleTemplate,
  onAddTemplate,
  onDeleteTemplate,
  onLaunchBooth,
  onLogout,
}: AdminScreenProps) {
  const [activeNav, setActiveNav] = useState<"dashboard" | "frames" | "gallery" | "devices" | "settings" | "database">("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Frames filter & upload
  const [activeLayoutFilter, setActiveLayoutFilter] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLayout, setNewLayout] = useState<"3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2">("3x1");
  const [newPreset, setNewPreset] = useState("frame1");
  const [uploadError, setUploadError] = useState("");
  const [base64Img, setBase64Img] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Device & Camera settings
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Database status
  const [dbConfigured, setDbConfigured] = useState<boolean>(isSupabaseConfigured());
  const [dbTestResult, setDbTestResult] = useState<{ testing: boolean; message: string; success?: boolean }>({
    testing: false,
    message: "",
  });

  // Recent Sessions
  const [recentSessions, setRecentSessions] = useState<PhotoboothSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // PIN management
  const [currentPin, setCurrentPinState] = useState("1234");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinChangeMsg, setPinChangeMsg] = useState("");

  // Load initial data
  useEffect(() => {
    // Media devices
    navigator.mediaDevices?.getUserMedia?.({ video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((deviceList) => {
        const videoDevs = deviceList.filter((d) => d.kind === "videoinput");
        setDevices(videoDevs);
      })
      .catch(() => {
        navigator.mediaDevices?.enumerateDevices?.().then((deviceList) => {
          const videoDevs = deviceList.filter((d) => d.kind === "videoinput");
          setDevices(videoDevs);
        });
      });

    // Camera setting
    settingsDB.getSetting<string>("camera_device_id", "").then((val) => {
      setSelectedDevice(val || localStorage.getItem("yodha_camera_device_id") || "");
    });

    // Admin PIN
    getAdminPin().then((pin) => setCurrentPinState(pin));

    // Sessions
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await sessionDB.getRecentSessions(40);
      setRecentSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Camera preview in Devices tab
  useEffect(() => {
    if (activeNav === "devices") {
      const constraints: MediaStreamConstraints = {
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      };
      navigator.mediaDevices?.getUserMedia(constraints)
        .then((stream) => {
          setCameraStream(stream);
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.warn("Preview camera error:", err));

      return () => {
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
        }
      };
    } else if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [activeNav, selectedDevice]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    settingsDB.saveSetting("camera_device_id", deviceId);
    if (deviceId) {
      localStorage.setItem("yodha_camera_device_id", deviceId);
    } else {
      localStorage.removeItem("yodha_camera_device_id");
    }
  };

  const handleTestDB = async () => {
    setDbTestResult({ testing: true, message: "Sedang menguji koneksi ke Supabase..." });
    const res = await testSupabaseConnection();
    setDbTestResult({ testing: false, message: res.message, success: res.success });
    setDbConfigured(isSupabaseConfigured());
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      setPinChangeMsg("PIN minimal harus 4 karakter!");
      return;
    }
    await setAdminPin(newPinInput.trim());
    setCurrentPinState(newPinInput.trim());
    setNewPinInput("");
    setPinChangeMsg("✅ PIN Admin berhasil diperbarui!");
    setTimeout(() => setPinChangeMsg(""), 4000);
  };

  const handleLaunchInNewTab = () => {
    createBoothSession();
    const url = `${window.location.origin}${window.location.pathname}?mode=booth`;
    window.open(url, "_blank");
  };

  const handleLayoutChange = (layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2") => {
    setNewLayout(layout);
    setNewPreset(HOLE_PRESETS[layout][0].id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Berkas harus berupa gambar PNG transparan!");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setBase64Img(event.target?.result as string);
    };
    reader.onerror = () => {
      setUploadError("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setUploadError("Nama template harus diisi!");
      return;
    }
    if (!base64Img) {
      setUploadError("Gambar frame (.png) transparan wajib diunggah!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTemplate(newName.trim(), newLayout, newPreset, base64Img);
      setNewName("");
      setBase64Img("");
      setUploadError("");
      setShowUploadModal(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      alert("Template bingkai berhasil ditambahkan ke Database!");
    } catch (err) {
      console.error(err);
      setUploadError("Gagal menyimpan template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesLayout = activeLayoutFilter === "all" || t.layout === activeLayoutFilter;
    const matchesQuery = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLayout && matchesQuery;
  });

  const activeTemplatesCount = templates.filter((t) => t.enabled).length;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* ────────────────── LEFT SIDEBAR (DEAMBOOTH STYLE) ────────────────── */}
      <aside
        className={`bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen select-none transition-all duration-300 z-30 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <img src={yodhaLogo} alt="Yodha Logo" className="h-8 object-contain" />
              <div>
                <h1 className="text-sm font-extrabold text-blue-600 tracking-tight leading-none">
                  Yodha Booth
                </h1>
                <span className="text-[10px] text-slate-400 font-medium">Portal Admin</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mx-auto cursor-pointer"
            title={sidebarCollapsed ? "Buka Sidebar" : "Ciutkan Sidebar"}
          >
            {sidebarCollapsed ? <SidebarOpen className="w-4 h-4" /> : <SidebarClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu Groups */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Group 1: OPERASI */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                OPERASI
              </p>
            )}
            <button
              onClick={() => setActiveNav("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "dashboard"
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Dasbor & Analitik"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-blue-600" />
              {!sidebarCollapsed && <span>Dasbor Utama</span>}
            </button>

            <button
              onClick={() => setActiveNav("gallery")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "gallery"
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Galeri Foto Sesi"
            >
              <ImageIcon className="w-4 h-4 shrink-0 text-indigo-500" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Galeri Foto</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                    {recentSessions.length}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Group 2: PENGELOLAAN BOOTH */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                PENGELOLAAN
              </p>
            )}
            <button
              onClick={() => setActiveNav("frames")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "frames"
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Manajemen Bingkai & Template"
            >
              <Frame className="w-4 h-4 shrink-0 text-blue-500" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Bingkai Frame</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                    {activeTemplatesCount} Aktif
                  </span>
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveNav("devices")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "devices"
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Kamera & Perangkat"
            >
              <Monitor className="w-4 h-4 shrink-0 text-purple-500" />
              {!sidebarCollapsed && <span>Kamera & Perangkat</span>}
            </button>
          </div>

          {/* Group 3: SISTEM & DATABASE */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                SISTEM
              </p>
            )}
            <button
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "settings"
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Keamanan & PIN Admin"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              {!sidebarCollapsed && <span>Keamanan & PIN</span>}
            </button>

            <button
              onClick={() => setActiveNav("database")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "database"
                  ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Supabase Database & Storage"
            >
              <Database className="w-4 h-4 shrink-0 text-sky-500" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Database Cloud</span>
                  <span className={`w-2 h-2 rounded-full ${dbConfigured ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  AD
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate leading-none">Admin Yodha</p>
                  <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">Operator Kiosk</span>
                </div>
              </div>
              <button
                onClick={() => {
                  logoutAdmin();
                  onLogout();
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                logoutAdmin();
                onLogout();
              }}
              className="w-full p-2.5 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ────────────────── MAIN CONTENT AREA ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                Yodha Photobooth
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  Dasbor Admin
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Kelola frame, pantau sesi foto, dan luncurkan Web Photobooth
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex items-center relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              placeholder="Cari frame atau layout..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Right: Live Cloud Status & Kiosk CTA */}
          <div className="flex items-center gap-3">
            {/* Live Database status */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              dbConfigured ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${dbConfigured ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`}></span>
              <span>{dbConfigured ? "Supabase: Online" : "Mode Offline"}</span>
            </div>

            {/* DEAMBOOTH-STYLE KIOSK MODE BUTTON */}
            <button
              onClick={handleLaunchInNewTab}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Buka Web Photobooth untuk pengunjung di tab baru"
            >
              <Monitor className="w-4 h-4" />
              <span>Buka Mode Kiosk (Tab Baru)</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* ──────────────── TAB 1: DASBOR UTAMA ──────────────── */}
          {activeNav === "dashboard" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sesi Foto</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{recentSessions.length}</h3>
                    <span className="text-[11px] text-emerald-600 font-medium">Tersimpan di Cloud</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Template Aktif</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{activeTemplatesCount}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">Dari {templates.length} total bingkai</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Frame className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Cloud</p>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{dbConfigured ? "Supabase PostgreSQL" : "Local IndexedDB"}</h3>
                    <span className={`text-[11px] font-medium ${dbConfigured ? "text-emerald-600" : "text-amber-600"}`}>
                      {dbConfigured ? "Terhubung & Siap" : "Koneksi Lokal"}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kamera Terpilih</p>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5 truncate max-w-[140px]">
                      {devices.find((d) => d.deviceId === selectedDevice)?.label || "Kamera Utama"}
                    </h3>
                    <span className="text-[11px] text-blue-600 font-medium">Siap untuk Jepret</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Launch Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left">
                  <h2 className="text-lg font-bold">Siap Menggunakan Web Photobooth untuk Pengunjung?</h2>
                  <p className="text-xs text-blue-100 max-w-xl">
                    Buka photobooth di tab baru untuk layar sentuh / kiosk. Anda tetap bisa membuka halaman admin ini untuk mengelola template atau memantau hasil foto tanpa mengganggu layar pengunjung.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleLaunchInNewTab}
                    className="px-5 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Kiosk (Tab Baru)</span>
                  </button>
                  <button
                    onClick={onLaunchBooth}
                    className="px-4 py-3 rounded-xl bg-blue-500/30 hover:bg-blue-500/50 text-white font-semibold text-xs border border-white/20 transition-colors cursor-pointer"
                  >
                    Buka di Layar Ini
                  </button>
                </div>
              </div>

              {/* Recent Sessions Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Sesi Foto Terbaru</h3>
                    <p className="text-xs text-slate-500">Hasil jepretan pengunjung yang baru saja tersimpan</p>
                  </div>
                  <button
                    onClick={() => setActiveNav("gallery")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lihat Semua Galeri</span>
                    <span>→</span>
                  </button>
                </div>

                {recentSessions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ImageIcon className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="text-xs font-medium">Belum ada sesi foto terbaru.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {recentSessions.slice(0, 6).map((s, idx) => (
                      <div key={s.id || idx} className="bg-slate-50 rounded-xl border border-slate-200/80 p-2 space-y-1.5">
                        <div className="aspect-[2/3] bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative">
                          {s.strip_url ? (
                            <img src={s.strip_url} alt="Strip" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-400">No Img</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 truncate">{s.session_code}</p>
                        <a
                          href={s.strip_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-center py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold hover:bg-blue-100 transition-colors"
                        >
                          Unduh
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: MANAJEMEN BINGKAI / TEMPLATES ──────────────── */}
          {activeNav === "frames" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header with Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Manajemen Bingkai Frame</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola template frame untuk photobooth, atur layout lubang, atau tambahkan frame baru.
                  </p>
                </div>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Bingkai Baru</span>
                </button>
              </div>

              {/* Layout Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveLayoutFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeLayoutFilter === "all"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  Semua ({templates.length})
                </button>
                {(["3x1", "3x2", "2x2", "2x1", "1x1", "4x2"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setActiveLayoutFilter(l)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeLayoutFilter === l
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    {l} ({templates.filter((t) => t.layout === l).length})
                  </button>
                ))}
              </div>

              {/* Frames Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`bg-white rounded-2xl border p-4 flex flex-col justify-between space-y-4 shadow-xs transition-all ${
                      template.enabled ? "border-slate-200/90" : "border-slate-200/60 bg-slate-50/70 opacity-60"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Frame Preview container */}
                      <div className="aspect-[3/4] bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                        {template.img ? (
                          <img
                            src={template.img}
                            alt={template.name}
                            className="max-h-full max-w-full object-contain bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:8px_8px] rounded"
                          />
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Polos</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{template.name}</h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                            template.isCustom ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {template.layout}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Preset: {template.presetId}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => onToggleTemplate(template.id, !template.enabled)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          template.enabled
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {template.enabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>{template.enabled ? "Aktif" : "Nonaktif"}</span>
                      </button>

                      {template.isCustom && (
                        <button
                          onClick={() => {
                            if (confirm(`Hapus template frame "${template.name}"?`)) {
                              onDeleteTemplate(template.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Frame"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: GALERI FOTO SESI ──────────────── */}
          {activeNav === "gallery" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Galeri Riwayat Sesi Foto</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hasil pemotretan pengunjung yang tersimpan secara aman di Cloud Storage Supabase
                  </p>
                </div>
                <button
                  onClick={loadSessions}
                  disabled={loadingSessions}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {recentSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-medium">Belum ada riwayat foto yang tersimpan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {recentSessions.map((s, idx) => (
                    <div key={s.id || idx} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
                      <div className="aspect-[2/3] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                        {s.strip_url ? (
                          <img src={s.strip_url} alt="Strip foto" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs text-slate-400">Tidak ada gambar</span>
                        )}
                        {s.gif_url && (
                          <span className="absolute top-2 right-2 text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded shadow">
                            GIF
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{s.session_code || `Sesi #${idx + 1}`}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                            {s.layout}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {s.created_at ? new Date(s.created_at).toLocaleString("id-ID") : "Baru saja"}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <a
                          href={s.strip_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          Unduh Foto
                        </a>
                        {s.gif_url && (
                          <a
                            href={s.gif_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            Unduh GIF
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 4: PERANGKAT & KAMERA ──────────────── */}
          {activeNav === "devices" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Konfigurasi Kamera Photobooth</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih webcam atau kamera eksternal yang akan aktif otomatis saat kiosk dibuka.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Pilih Kamera Default</label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Default (Kamera Utama Laptop / Kiosk)</option>
                    {devices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Video Preview Box */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-700 block">Pratinjau Langsung (Live Viewfinder):</span>
                  <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-800 shadow-inner">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live Stream</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 5: KEAMANAN & PIN ──────────────── */}
          {activeNav === "settings" && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Keamanan & PIN Akses Admin</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    PIN ini digunakan untuk masuk ke portal admin dan mencegah pengunjung keluar dari mode Kiosk.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-slate-600 block">PIN Admin Aktif:</span>
                  <p className="text-xl font-mono font-black text-blue-600 tracking-widest">{currentPin}</p>
                </div>

                <form onSubmit={handleSavePin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Ubah PIN Baru</label>
                    <input
                      type="password"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="Masukkan 4 digit PIN baru"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {pinChangeMsg && (
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      {pinChangeMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!newPinInput}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Simpan Perubahan PIN
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 6: DATABASE CLOUD ──────────────── */}
          {activeNav === "database" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Status Koneksi Supabase</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Penyimpanan cloud untuk custom templates dan hasil foto pengunjung
                    </p>
                  </div>
                  <button
                    onClick={handleTestDB}
                    disabled={dbTestResult.testing}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {dbTestResult.testing ? "Menguji..." : "Uji Koneksi"}
                  </button>
                </div>

                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  dbConfigured ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
                }`}>
                  {dbConfigured ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />}
                  <div>
                    <p className="text-xs font-bold">
                      {dbConfigured ? "Terhubung ke Supabase Cloud" : "Mode Offline / Local Fallback"}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {dbConfigured
                        ? "Seluruh data dan gambar tersimpan otomatis di PostgreSQL & Storage Bucket."
                        : "Kunci Supabase belum disetel di Vercel. Data disimpan sementara di IndexedDB lokal."}
                    </p>
                  </div>
                </div>

                {dbTestResult.message && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${
                    dbTestResult.success ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {dbTestResult.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── MODAL UNGGAH FRAME BARU ──────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Unggah Frame Bingkai Baru</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Nama Template</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Frame Event Wisuda 2026"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Layout</label>
                  <select
                    value={newLayout}
                    onChange={(e) => handleLayoutChange(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="3x1">Strip Vertikal (3x1)</option>
                    <option value="3x2">Grid 6 Foto (3x2)</option>
                    <option value="2x2">Grid 2x2 (2x2)</option>
                    <option value="2x1">Strip Pendek (2x1)</option>
                    <option value="1x1">Foto Tunggal (1x1)</option>
                    <option value="4x2">Grid 8 Foto (4x2)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Preset Lubang</label>
                  <select
                    value={newPreset}
                    onChange={(e) => setNewPreset(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {HOLE_PRESETS[newLayout].map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Berkas Frame PNG</label>
                <input
                  type="file"
                  accept=".png,image/png"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition-colors"
                >
                  {base64Img ? (
                    <div className="space-y-1">
                      <img
                        src={base64Img}
                        alt="Preview"
                        className="max-h-24 mx-auto object-contain bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:8px_8px] rounded"
                      />
                      <span className="text-[11px] text-blue-600 font-medium block">Ganti gambar</span>
                    </div>
                  ) : (
                    <div className="py-3 space-y-1">
                      <Plus className="w-6 h-6 text-slate-400 mx-auto" />
                      <span className="text-xs font-semibold text-slate-700 block">Pilih file PNG transparan</span>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                  {uploadError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newName || !base64Img}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Bingkai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
