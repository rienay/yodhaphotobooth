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
  Pipette,
  Wand2,
  Eye,
  Layers,
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

  // Chroma Key / Auto Background Remover state
  const [rawBase64Img, setRawBase64Img] = useState("");
  const [enableChromaKey, setEnableChromaKey] = useState(false);
  const [chromaColor, setChromaColor] = useState("#00FF00"); // default bright green
  const [chromaTolerance, setChromaTolerance] = useState(30); // 1 - 80%
  const [chromaFeather, setChromaFeather] = useState(8); // 0 - 20%
  const [isProcessingChroma, setIsProcessingChroma] = useState(false);
  const [previewTab, setPreviewTab] = useState<"checkerboard" | "photos">("checkerboard");
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; isAutoGreen?: boolean } | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);

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

  // Helper: Convert HEX to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    let clean = hex.replace("#", "").trim();
    if (clean.length === 3) {
      clean = clean.split("").map((c) => c + c).join("");
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return { r: 0, g: 255, b: 0 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  // Helper: Convert RGB to HEX
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Helper: Detect if image contains green screen background
  const detectIfGreenOrSolid = (img: HTMLImageElement): { isGreen: boolean; suggestedColor: string } => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { isGreen: false, suggestedColor: "#00FF00" };
      ctx.drawImage(img, 0, 0, 40, 40);
      const data = ctx.getImageData(0, 0, 40, 40).data;
      let greenCount = 0;
      const totalPixels = 40 * 40;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 130 && g > r * 1.25 && g > b * 1.25) {
          greenCount++;
        }
      }
      if (greenCount / totalPixels > 0.05) {
        return { isGreen: true, suggestedColor: "#00FF00" };
      }
    } catch (e) {
      console.warn("Chroma detection error:", e);
    }
    return { isGreen: false, suggestedColor: "#00FF00" };
  };

  // Chroma Key Algorithm: Euclidean distance in RGB color space
  const applyChromaKey = (
    srcImg: HTMLImageElement,
    colorHex: string,
    tolerance: number,
    feather: number
  ): string => {
    const canvas = document.createElement("canvas");
    const width = srcImg.naturalWidth || srcImg.width || 1200;
    const height = srcImg.naturalHeight || srcImg.height || 1800;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return srcImg.src;

    ctx.drawImage(srcImg, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const { r: tr, g: tg, b: tb } = hexToRgb(colorHex);

    // Max Euclidean distance in RGB: sqrt(255^2 * 3) ≈ 441.67
    const maxDist = 441.67;
    const thresholdDist = (tolerance / 100) * maxDist;
    const featherDist = (feather / 100) * maxDist;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - tr;
      const dg = g - tg;
      const db = b - tb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= thresholdDist) {
        data[i + 3] = 0; // completely transparent
      } else if (featherDist > 0 && dist < thresholdDist + featherDist) {
        const factor = (dist - thresholdDist) / featherDist;
        data[i + 3] = Math.round(a * factor); // soft edge
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  // Re-process image whenever chroma key settings or raw image change
  useEffect(() => {
    if (!rawBase64Img) {
      setBase64Img("");
      return;
    }

    if (!enableChromaKey) {
      setBase64Img(rawBase64Img);
      return;
    }

    setIsProcessingChroma(true);
    const timer = setTimeout(() => {
      const img = originalImageRef.current;
      if (!img) {
        const tempImg = new Image();
        tempImg.onload = () => {
          originalImageRef.current = tempImg;
          const result = applyChromaKey(tempImg, chromaColor, chromaTolerance, chromaFeather);
          setBase64Img(result);
          setIsProcessingChroma(false);
        };
        tempImg.src = rawBase64Img;
      } else {
        const result = applyChromaKey(img, chromaColor, chromaTolerance, chromaFeather);
        setBase64Img(result);
        setIsProcessingChroma(false);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [rawBase64Img, enableChromaKey, chromaColor, chromaTolerance, chromaFeather]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Berkas harus berupa gambar (PNG, JPG, WEBP)!");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRawBase64Img(dataUrl);

      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        const detection = detectIfGreenOrSolid(img);
        setImageMeta({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          isAutoGreen: detection.isGreen,
        });

        if (detection.isGreen) {
          setChromaColor(detection.suggestedColor);
          setEnableChromaKey(true);
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setUploadError("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  // Eyedropper: Sample color by clicking directly on preview image
  const handlePreviewImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rawBase64Img || !originalImageRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const img = originalImageRef.current;
    const naturalX = Math.floor(xRatio * (img.naturalWidth || img.width));
    const naturalY = Math.floor(yRatio * (img.naturalHeight || img.height));

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 1;
    sampleCanvas.height = 1;
    const sCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sCtx) return;

    sCtx.drawImage(img, naturalX, naturalY, 1, 1, 0, 0, 1, 1);
    const p = sCtx.getImageData(0, 0, 1, 1).data;
    const sampledHex = rgbToHex(p[0], p[1], p[2]);
    setChromaColor(sampledHex);
    setEnableChromaKey(true);
    setIsEyedropperActive(false);
  };

  const handleNativeEyeDropper = async () => {
    if ("EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          setChromaColor(result.sRGBHex);
          setEnableChromaKey(true);
        }
      } catch (err) {
        // User cancelled picker
      }
    } else {
      setIsEyedropperActive((prev) => !prev);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setNewName("");
    setRawBase64Img("");
    setBase64Img("");
    setEnableChromaKey(false);
    setUploadError("");
    setIsEyedropperActive(false);
    setImageMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setUploadError("Nama template harus diisi!");
      return;
    }
    const finalImg = enableChromaKey ? base64Img : (base64Img || rawBase64Img);
    if (!finalImg) {
      setUploadError("Gambar frame wajib diunggah!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTemplate(newName.trim(), newLayout, newPreset, finalImg);
      handleCloseUploadModal();
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

      {/* ──────────────── MODAL UNGGAH & KONFIGURASI FRAME BARU ──────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-blue-600" />
                  <span>Unggah & Konfigurasi Bingkai Baru</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload file PNG transparan atau gambar dengan warna latar (hijau/putih) untuk dihapus otomatis
                </p>
              </div>
              <button
                onClick={handleCloseUploadModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* ─────── LEFT COLUMN: Form Inputs & Chroma Key Controls ─────── */}
              <div className="lg:col-span-6 p-6 space-y-4">
                <form onSubmit={handleSaveTemplate} id="frame-upload-form" className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Nama Template Bingkai</label>
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
                      <label className="block text-xs font-semibold text-slate-700">Tata Letak (Layout)</label>
                      <select
                        value={newLayout}
                        onChange={(e) => handleLayoutChange(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                      <label className="block text-xs font-semibold text-slate-700">Preset Lubang Foto</label>
                      <select
                        value={newPreset}
                        onChange={(e) => setNewPreset(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {HOLE_PRESETS[newLayout].map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* File Upload Box */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">Berkas Frame (PNG, JPG, WEBP)</label>
                      {imageMeta && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {imageMeta.width} × {imageMeta.height} px
                        </span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-colors ${
                        rawBase64Img
                          ? "border-blue-400 bg-blue-50/20 hover:bg-blue-50/40"
                          : "border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30"
                      }`}
                    >
                      {rawBase64Img ? (
                        <div className="flex items-center justify-center gap-3">
                          <img
                            src={base64Img || rawBase64Img}
                            alt="Thumbnail"
                            className="w-10 h-10 object-contain rounded border border-slate-200 bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] bg-[length:6px_6px]"
                          />
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-800 block">Gambar Berhasil Dimuat</span>
                            <span className="text-[11px] text-blue-600 font-medium hover:underline">Klik untuk ganti gambar</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 space-y-1">
                          <Plus className="w-5 h-5 text-slate-400 mx-auto" />
                          <span className="text-xs font-semibold text-slate-700 block">Pilih Gambar Frame (PNG, JPG, WEBP)</span>
                          <span className="text-[10px] text-slate-400 block">Dapat berupa gambar transparan atau gambar dengan latar hijau/polos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─────── CHROMA KEY / AUTO BACKGROUND REMOVER PANEL ─────── */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            Hapus Background Warna
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Chroma Key otomatis untuk latar hijau / warna lain
                          </span>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableChromaKey}
                          onChange={(e) => setEnableChromaKey(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {enableChromaKey && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                        {/* Quick Presets & Color Picker */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-700">Warna yang Dihapus:</label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setChromaColor("#00FF00")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                chromaColor.toUpperCase() === "#00FF00"
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF00] border border-black/20"></span>
                              <span>Hijau</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setChromaColor("#FFFFFF")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                chromaColor.toUpperCase() === "#FFFFFF"
                                  ? "bg-slate-800 text-white border-slate-900 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300"></span>
                              <span>Putih</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setChromaColor("#0000FF")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                chromaColor.toUpperCase() === "#0000FF"
                                  ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-[#0000FF] border border-black/20"></span>
                              <span>Biru</span>
                            </button>

                            {/* Native Eyedropper or Canvas Pipet */}
                            <button
                              type="button"
                              onClick={handleNativeEyeDropper}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                isEyedropperActive
                                  ? "bg-purple-600 text-white border-purple-700 ring-2 ring-purple-400/40"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                              title="Klik untuk memilih warna langsung dari gambar"
                            >
                              <Pipette className="w-3.5 h-3.5 text-purple-600" />
                              <span>{isEyedropperActive ? "Klik Gambar" : "Pipet Warna"}</span>
                            </button>

                            {/* Color Picker input */}
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 ml-auto">
                              <input
                                type="color"
                                value={chromaColor}
                                onChange={(e) => setChromaColor(e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border-none bg-transparent p-0"
                              />
                              <span className="font-mono text-[10px] text-slate-600 uppercase font-bold">{chromaColor}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sliders: Tolerance & Feather */}
                        <div className="space-y-2 pt-1">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">Toleransi Warna (Threshold)</span>
                              <span className="font-mono font-bold text-blue-600">{chromaTolerance}%</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="75"
                              value={chromaTolerance}
                              onChange={(e) => setChromaTolerance(Number(e.target.value))}
                              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">Kehalusan Tepi (Feather)</span>
                              <span className="font-mono font-bold text-blue-600">{chromaFeather}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={chromaFeather}
                              onChange={(e) => setChromaFeather(Number(e.target.value))}
                              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-100 text-[10px] text-blue-700 font-medium">
                          💡 <strong>Tip Praktis:</strong> Anda juga bisa mengklik langsung pada warna hijau di gambar pratinjau samping untuk memilih warna yang ingin dijadikan transparan.
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
                      {uploadError}
                    </p>
                  )}
                </form>
              </div>

              {/* ─────── RIGHT COLUMN: Interactive Live Preview ─────── */}
              <div className="lg:col-span-6 p-6 bg-slate-50/50 flex flex-col justify-between space-y-4">
                {/* Preview Controls Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pratinjau Live Frame</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {enableChromaKey ? "Mode Transparansi Aktif" : "Pratinjau Asli"}
                    </span>
                  </div>

                  {/* Mode switcher: Checkerboard vs Realistic Photos */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("checkerboard")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        previewTab === "checkerboard"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Transparansi
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("photos")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        previewTab === "photos"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Simulasi Foto
                    </button>
                  </div>
                </div>

                {/* Live Preview Display Box */}
                <div
                  onClick={handlePreviewImageClick}
                  className={`relative w-full aspect-[2/3] max-h-[380px] mx-auto rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm flex items-center justify-center select-none ${
                    isEyedropperActive ? "cursor-crosshair ring-2 ring-purple-500" : rawBase64Img ? "cursor-pointer" : ""
                  } ${
                    previewTab === "checkerboard"
                      ? "bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] bg-[length:14px_14px]"
                      : "bg-slate-900"
                  }`}
                  title={rawBase64Img ? "Klik di bagian warna untuk mengambil warna pipet" : undefined}
                >
                  {/* Sample Photo Placeholder Layer (Behind the frame) */}
                  {previewTab === "photos" && (
                    <div className="absolute inset-0 z-0 p-3 pointer-events-none">
                      {newLayout === "3x1" && (
                        <div className="w-full h-full flex flex-col gap-2 justify-between">
                          {[1, 2, 3].map((num) => (
                            <div key={num} className="flex-1 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex flex-col items-center justify-center text-white shadow-inner opacity-90">
                              <Camera className="w-5 h-5 mb-0.5 opacity-80" />
                              <span className="text-[10px] font-bold">Foto #{num}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {newLayout === "3x2" && (
                        <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <div key={num} className="rounded-lg bg-gradient-to-tr from-pink-400 to-rose-600 flex flex-col items-center justify-center text-white shadow-inner opacity-90">
                              <Camera className="w-4 h-4 opacity-80" />
                              <span className="text-[8px] font-bold">#{num}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {newLayout === "2x2" && (
                        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
                          {[1, 2, 3, 4].map((num) => (
                            <div key={num} className="rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex flex-col items-center justify-center text-white shadow-inner opacity-90">
                              <Camera className="w-5 h-5 mb-0.5 opacity-80" />
                              <span className="text-[10px] font-bold">Foto #{num}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {newLayout === "2x1" && (
                        <div className="w-full h-full flex flex-col gap-3 justify-between">
                          {[1, 2].map((num) => (
                            <div key={num} className="flex-1 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-600 flex flex-col items-center justify-center text-white shadow-inner opacity-90">
                              <Camera className="w-6 h-6 mb-1 opacity-80" />
                              <span className="text-[11px] font-bold">Foto #{num}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {newLayout === "1x1" && (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex flex-col items-center justify-center text-white shadow-inner opacity-90">
                          <Camera className="w-10 h-10 mb-2 opacity-80" />
                          <span className="text-xs font-bold">Foto Tunggal 1x1</span>
                        </div>
                      )}
                      {newLayout === "4x2" && (
                        <div className="w-full h-full grid grid-cols-2 grid-rows-4 gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <div key={num} className="rounded bg-gradient-to-tr from-blue-400 to-cyan-500 flex flex-col items-center justify-center text-white shadow-inner opacity-90">
                              <Camera className="w-3.5 h-3.5 opacity-80" />
                              <span className="text-[8px] font-bold">#{num}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Frame Image Layer (Overlaid on top) */}
                  {rawBase64Img ? (
                    <div className="relative w-full h-full z-10 flex items-center justify-center">
                      <img
                        ref={previewImgRef}
                        src={enableChromaKey ? base64Img : rawBase64Img}
                        alt="Frame Preview"
                        className="w-full h-full object-contain pointer-events-none"
                      />

                      {/* Processing Indicator */}
                      {isProcessingChroma && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      )}

                      {/* Pipette Active Overlay Hint */}
                      {isEyedropperActive && (
                        <div className="absolute top-2 left-2 right-2 bg-purple-900/90 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-md text-center">
                          🎯 Mode Pipet: Klik pada warna gambar yang ingin dihapus
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-2 text-slate-400 z-10">
                      <ImageIcon className="w-12 h-12 mx-auto opacity-40" />
                      <p className="text-xs font-semibold text-slate-600">Belum ada gambar dipilih</p>
                      <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                        Pilih berkas frame di sebelah kiri untuk melihat hasil pratinjau langsung
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview Meta / Status */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    {enableChromaKey ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Background ({chromaColor}) Dihapus</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Gambar Utuh (Tanpa Hapus Warna)</span>
                    )}
                  </div>

                  <span className="text-slate-400 font-medium">
                    {newLayout} • {HOLE_PRESETS[newLayout].find((p) => p.id === newPreset)?.label || newPreset}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer: Action Buttons */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="frame-upload-form"
                disabled={isSubmitting || !newName || (!base64Img && !rawBase64Img)}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Menyimpan ke Cloud..." : "Simpan Bingkai"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
