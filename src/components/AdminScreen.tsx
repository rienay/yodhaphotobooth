import React, { useState, useRef, useEffect } from "react";
import yodhaLogo from "@/assets/yodha.png";
import { CustomTemplate, SessionDB, PhotoboothSession, SettingsDB } from "../lib/db";
import { isSupabaseConfigured, testSupabaseConnection, getSupabaseUrl, getSupabaseAnonKey, saveSupabaseCredentials } from "../lib/supabase";
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
  Undo,
  Redo,
  RotateCcw,
  Paintbrush,
  Scissors,
  Square,
  Move,
  Lock,
} from "lucide-react";

export interface Template {
  id: string;
  name: string;
  layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2";
  img: string;
  isCustom: boolean;
  enabled: boolean;
  presetId: string;
  photoBoxes?: PhotoBox[];
}

export interface PhotoBox {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  w: number; // percentage (0 - 100)
  h: number; // percentage (0 - 100)
}

function getDefaultBoxesForLayout(layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2"): PhotoBox[] {
  switch (layout) {
    case "1x1":
      return [{ id: "box_1", x: 8, y: 8, w: 84, h: 84 }];
    case "2x1":
      return [
        { id: "box_1", x: 10, y: 8, w: 80, h: 40 },
        { id: "box_2", x: 10, y: 52, w: 80, h: 40 },
      ];
    case "3x1":
      return [
        { id: "box_1", x: 10, y: 5, w: 80, h: 27 },
        { id: "box_2", x: 10, y: 36, w: 80, h: 27 },
        { id: "box_3", x: 10, y: 67, w: 80, h: 27 },
      ];
    case "2x2":
      return [
        { id: "box_1", x: 6, y: 6, w: 42, h: 42 },
        { id: "box_2", x: 52, y: 6, w: 42, h: 42 },
        { id: "box_3", x: 6, y: 52, w: 42, h: 42 },
        { id: "box_4", x: 52, y: 52, w: 42, h: 42 },
      ];
    case "3x2":
      return [
        { id: "box_1", x: 6, y: 5, w: 42, h: 27 },
        { id: "box_2", x: 52, y: 5, w: 42, h: 27 },
        { id: "box_3", x: 6, y: 36, w: 42, h: 27 },
        { id: "box_4", x: 52, y: 36, w: 42, h: 27 },
        { id: "box_5", x: 6, y: 67, w: 42, h: 27 },
        { id: "box_6", x: 52, y: 67, w: 42, h: 27 },
      ];
    case "4x2":
      return [
        { id: "box_1", x: 6, y: 4, w: 42, h: 20 },
        { id: "box_2", x: 52, y: 4, w: 42, h: 20 },
        { id: "box_3", x: 6, y: 28, w: 42, h: 20 },
        { id: "box_4", x: 52, y: 28, w: 42, h: 20 },
        { id: "box_5", x: 6, y: 52, w: 42, h: 20 },
        { id: "box_6", x: 52, y: 52, w: 42, h: 20 },
        { id: "box_7", x: 6, y: 76, w: 42, h: 20 },
        { id: "box_8", x: 52, y: 76, w: 42, h: 20 },
      ];
    default:
      return [{ id: "box_1", x: 10, y: 10, w: 80, h: 80 }];
  }
}

interface AdminScreenProps {
  templates: Template[];
  onToggleTemplate: (id: string, enabled: boolean) => void;
  onAddTemplate: (
    name: string,
    layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2",
    presetId: string,
    base64Img: string,
    photoBoxes?: PhotoBox[]
  ) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onLaunchBooth: () => void;
  onLogout: () => void;
}

const LAYOUT_LABELS: Record<string, string> = {
  "2x2": "Grid 4 Foto (2x2 / Custom 4 Lubang)",
  "3x1": "Strip Vertikal (3x1 / 3 Foto)",
  "3x2": "Grid 6 Foto (3x2 / 6 Foto)",
  "2x1": "Strip Pendek (2x1 / 2 Foto)",
  "1x1": "Foto Tunggal (1x1)",
  "4x2": "Grid 8 Foto (4x2 / 8 Foto)",
};

const HOLE_PRESETS: Record<string, { id: string; label: string }[]> = {
  "2x2": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Full Overlap)" },
  ],
  "3x1": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "frame1", label: "Pink (Preset 1)" },
    { id: "frame2", label: "Biru (Preset 2)" },
    { id: "frame3", label: "Frame 1 (Preset 3)" },
    { id: "frame4", label: "Frame 2 (Preset 4)" },
    { id: "frame5", label: "Frame 3 (Preset 5)" },
  ],
  "2x1": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "frame1", label: "Frame 1 (Preset 1)" },
    { id: "frame2", label: "Frame 2 (Preset 2)" },
    { id: "frame3", label: "Frame 3 (Preset 3)" },
    { id: "frame4", label: "Frame 4 (Preset 4)" },
    { id: "frame5", label: "Frame 5 (Preset 5)" },
    { id: "frame6", label: "Frame 6 (Preset 6)" },
  ],
  "3x2": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
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
  "1x1": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Full Overlap)" },
  ],
  "4x2": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Full Overlap)" },
  ],
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

  // Frame Editor & Chroma Key / Magic Wand state
  const [rawBase64Img, setRawBase64Img] = useState("");
  const [activeCanvasData, setActiveCanvasData] = useState("");
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [chromaTolerance, setChromaTolerance] = useState(25); // 5 - 70%
  const [chromaColor, setChromaColor] = useState("#FFFFFF");
  const [toolMode, setToolMode] = useState<"wand" | "global" | "restore">("wand");
  const [brushSize, setBrushSize] = useState(30); // 10 - 100px
  const [isRestoring, setIsRestoring] = useState(false);
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const lastRestorePosRef = useRef<{ x: number; y: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<"erase" | "boxes">("erase");
  const [previewTab, setPreviewTab] = useState<"checkerboard" | "photos">("checkerboard");
  const [detectedHoles, setDetectedHoles] = useState<{ x: number; y: number; w: number; h: number }[]>([]);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [actionStatus, setActionStatus] = useState<string>("");
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);

  // Photo Box Block Editor State
  const [photoBoxes, setPhotoBoxes] = useState<PhotoBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    type: "move" | "resize";
    boxId: string;
    handle?: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
    startX: number;
    startY: number;
    initBox: PhotoBox;
  } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

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

  // Supabase Credentials Form State
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(getSupabaseUrl());
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState(getSupabaseAnonKey());
  const [supabaseSavedMsg, setSupabaseSavedMsg] = useState("");
  const [showAnonKey, setShowAnonKey] = useState(false);

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

  // Photo Box Drag & Resize Listeners
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

      setPhotoBoxes((prev) =>
        prev.map((box) => {
          if (box.id !== dragState.boxId) return box;
          const init = dragState.initBox;

          if (dragState.type === "move") {
            const newX = Math.max(0, Math.min(100 - init.w, init.x + deltaX));
            const newY = Math.max(0, Math.min(100 - init.h, init.y + deltaY));
            return {
              ...box,
              x: Math.round(newX * 10) / 10,
              y: Math.round(newY * 10) / 10,
            };
          } else if (dragState.type === "resize") {
            let { x, y, w, h } = init;
            const handle = dragState.handle;

            if (handle?.includes("e")) {
              w = Math.max(4, Math.min(100 - x, init.w + deltaX));
            }
            if (handle?.includes("s")) {
              h = Math.max(4, Math.min(100 - y, init.h + deltaY));
            }
            if (handle?.includes("w")) {
              const rawW = init.w - deltaX;
              if (rawW >= 4) {
                const newX = Math.max(0, init.x + deltaX);
                w = init.x + init.w - newX;
                x = newX;
              }
            }
            if (handle?.includes("n")) {
              const rawH = init.h - deltaY;
              if (rawH >= 4) {
                const newY = Math.max(0, init.y + deltaY);
                h = init.y + init.h - newY;
                y = newY;
              }
            }

            return {
              ...box,
              x: Math.round(x * 10) / 10,
              y: Math.round(y * 10) / 10,
              w: Math.round(w * 10) / 10,
              h: Math.round(h * 10) / 10,
            };
          }
          return box;
        })
      );
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

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

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supabaseUrlInput.trim(), supabaseAnonKeyInput.trim());
    const configured = isSupabaseConfigured();
    setDbConfigured(configured);
    setSupabaseSavedMsg("✅ Kredensial Supabase berhasil disimpan!");
    setTimeout(() => setSupabaseSavedMsg(""), 4000);
    handleTestDB();
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
    if (isNaN(num)) return { r: 255, g: 255, b: 255 };
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
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  // Hole detection from working canvas
  const detectHolesFromCanvas = (canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number }[] => {
    try {
      const SCALE_MAX = 300;
      const origW = canvas.width;
      const origH = canvas.height;
      if (!origW || !origH) return [];
      const scale = Math.min(1, SCALE_MAX / Math.max(origW, origH));
      const width = Math.max(10, Math.round(origW * scale));
      const height = Math.max(10, Math.round(origH * scale));

      const sCanvas = document.createElement("canvas");
      sCanvas.width = width;
      sCanvas.height = height;
      const sCtx = sCanvas.getContext("2d", { willReadFrequently: true });
      if (!sCtx) return [];
      sCtx.drawImage(canvas, 0, 0, width, height);

      const imgData = sCtx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const isTransparent = new Uint8Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 120) {
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
            // Filter realistic photo holes (min 10% width or 4% height, min 1% area)
            if (w >= width * 0.10 && h >= height * 0.04 && area >= (width * height) * 0.012 && w < width * 0.98 && h < height * 0.98) {
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
        if (Math.abs(a.y - b.y) > 25) {
          return a.y - b.y;
        }
        return a.x - b.x;
      });

      return holes;
    } catch (err) {
      console.error("detectHoles error", err);
      return [];
    }
  };

  const applyHolesToLayout = (holes: { x: number; y: number; w: number; h: number }[]) => {
    setDetectedHoles(holes);
    if (holes.length === 4) {
      setNewLayout("2x2");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 4 lubang foto! Layout otomatis disetel ke Grid 4 Foto (2x2 Auto).");
    } else if (holes.length === 3) {
      setNewLayout("3x1");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 3 lubang foto! Layout otomatis disetel ke Strip 3 Foto (3x1 Auto).");
    } else if (holes.length === 6) {
      setNewLayout("3x2");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 6 lubang foto! Layout otomatis disetel ke Grid 6 Foto (3x2 Auto).");
    } else if (holes.length === 2) {
      setNewLayout("2x1");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 2 lubang foto! Layout otomatis disetel ke Strip 2 Foto (2x1 Auto).");
    } else if (holes.length === 1) {
      setNewLayout("1x1");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 1 lubang foto! Layout otomatis disetel ke Foto Tunggal (1x1 Auto).");
    } else if (holes.length === 8) {
      setNewLayout("4x2");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 8 lubang foto! Layout otomatis disetel ke Grid 8 Foto (4x2 Auto).");
    } else if (holes.length > 0) {
      setNewPreset("auto");
      setActionStatus(`✨ Terdeteksi ${holes.length} lubang foto pada bingkai.`);
    }
  };

  // Magic Wand: Flood fill erase contiguous region starting at (startX, startY)
  const floodFillErase = (
    canvas: HTMLCanvasElement,
    startX: number,
    startY: number,
    tolerance: number
  ): { dataUrl: string; holes: { x: number; y: number; w: number; h: number }[] } => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { dataUrl: canvas.toDataURL("image/png"), holes: [] };

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIdx = (startY * width + startX) * 4;
    const sr = data[startIdx];
    const sg = data[startIdx + 1];
    const sb = data[startIdx + 2];
    const sa = data[startIdx + 3];

    if (sa === 0) {
      return { dataUrl: canvas.toDataURL("image/png"), holes: detectHolesFromCanvas(canvas) };
    }

    const maxDist = 441.67;
    const threshold = (tolerance / 100) * maxDist;

    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height * 2);
    let head = 0;
    let tail = 0;

    queue[tail++] = startX;
    queue[tail++] = startY;
    visited[startY * width + startX] = 1;

    while (head < tail) {
      const cx = queue[head++];
      const cy = queue[head++];
      const idx = (cy * width + cx) * 4;

      data[idx + 3] = 0; // Erase to transparent

      const neighbors = [
        cx + 1, cy,
        cx - 1, cy,
        cx, cy + 1,
        cx, cy - 1,
      ];

      for (let i = 0; i < 8; i += 2) {
        const nx = neighbors[i];
        const ny = neighbors[i + 1];

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const pIdx = ny * width + nx;
          if (!visited[pIdx]) {
            visited[pIdx] = 1;
            const nDataIdx = pIdx * 4;
            const nr = data[nDataIdx];
            const ng = data[nDataIdx + 1];
            const nb = data[nDataIdx + 2];
            const na = data[nDataIdx + 3];

            if (na > 0) {
              const dr = nr - sr;
              const dg = ng - sg;
              const db = nb - sb;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist <= threshold) {
                queue[tail++] = nx;
                queue[tail++] = ny;
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const holes = detectHolesFromCanvas(canvas);
    return { dataUrl, holes };
  };

  // Global color erase across the entire canvas
  const globalEraseColor = (
    canvas: HTMLCanvasElement,
    targetHex: string,
    tolerance: number
  ): { dataUrl: string; holes: { x: number; y: number; w: number; h: number }[] } => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { dataUrl: canvas.toDataURL("image/png"), holes: [] };

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const { r: tr, g: tg, b: tb } = hexToRgb(targetHex);
    const maxDist = 441.67;
    const threshold = (tolerance / 100) * maxDist;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - tr;
      const dg = g - tg;
      const db = b - tb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= threshold) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const holes = detectHolesFromCanvas(canvas);
    return { dataUrl, holes };
  };

  // Bounded Chroma Erase: Erase color ONLY inside a specific photo box
  const eraseColorInBox = (
    canvas: HTMLCanvasElement,
    box: PhotoBox,
    targetHex: string,
    tolerance: number
  ): { dataUrl: string; holes: { x: number; y: number; w: number; h: number }[] } => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { dataUrl: canvas.toDataURL("image/png"), holes: [] };

    // Calculate clamped box pixel bounds
    const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
    const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
    const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
    const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

    const imgData = ctx.getImageData(bx, by, bw, bh);
    const data = imgData.data;

    const { r: tr, g: tg, b: tb } = hexToRgb(targetHex);
    const maxDist = 441.67;
    const threshold = (tolerance / 100) * maxDist;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - tr;
      const dg = g - tg;
      const db = b - tb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= threshold) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imgData, bx, by);
    const dataUrl = canvas.toDataURL("image/png");
    const holes = detectHolesFromCanvas(canvas);
    return { dataUrl, holes };
  };

  // Punch Box Hole: 100% clean transparent cutout inside the box
  const punchBoxHole = (
    canvas: HTMLCanvasElement,
    box: PhotoBox
  ): { dataUrl: string; holes: { x: number; y: number; w: number; h: number }[] } => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { dataUrl: canvas.toDataURL("image/png"), holes: [] };

    const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
    const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
    const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
    const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

    ctx.clearRect(bx, by, bw, bh);
    const dataUrl = canvas.toDataURL("image/png");
    const holes = detectHolesFromCanvas(canvas);
    return { dataUrl, holes };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Berkas harus berupa gambar (PNG, JPG, WEBP)!");
      return;
    }

    setUploadError("");
    setActionStatus("Sedang memproses gambar...");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        setImageMeta({ width: w, height: h });

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const initialData = canvas.toDataURL("image/png");
          setRawBase64Img(initialData);
          setActiveCanvasData(initialData);
          setHistoryStack([]);
          workingCanvasRef.current = canvas;

          const holes = detectHolesFromCanvas(canvas);
          applyHolesToLayout(holes);
          if (holes.length > 0) {
            const boxes: PhotoBox[] = holes.map((h, i) => ({
              id: `box_${i + 1}`,
              x: Math.round((h.x / w) * 1000) / 10,
              y: Math.round((h.y / h) * 1000) / 10,
              w: Math.round((h.w / w) * 1000) / 10,
              h: Math.round((h.h / h) * 1000) / 10,
            }));
            setPhotoBoxes(boxes);
            setSelectedBoxId(boxes[0]?.id || null);
          } else {
            const defaultBoxes = getDefaultBoxesForLayout(newLayout);
            setPhotoBoxes(defaultBoxes);
            setSelectedBoxId(defaultBoxes[0]?.id || null);
            setActionStatus("💡 Kotak foto siap diedit. Geser/ubah ukuran kotak, lalu lubangi atau hapus warna chroma.");
          }
        }
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setUploadError("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  // 1-Click: Erase White Photo Boxes
  const handleEraseWhite = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);
    const res = globalEraseColor(workingCanvasRef.current, "#FFFFFF", chromaTolerance);
    setActiveCanvasData(res.dataUrl);
    applyHolesToLayout(res.holes);
    setActionStatus("Warna putih berhasil dihapus!");
  };

  // 1-Click: Erase Green Screen Background
  const handleEraseGreen = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);
    const res = globalEraseColor(workingCanvasRef.current, "#00FF00", chromaTolerance);
    setActiveCanvasData(res.dataUrl);
    applyHolesToLayout(res.holes);
    setActionStatus("Warna hijau (green screen) berhasil dihapus!");
  };

  // 1-Click: Erase Selected Custom Color
  const handleEraseChosenColor = (hex: string) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);
    const res = globalEraseColor(workingCanvasRef.current, hex, chromaTolerance);
    setActiveCanvasData(res.dataUrl);
    applyHolesToLayout(res.holes);
    setActionStatus(`Warna ${hex} berhasil dihapus!`);
  };

  // Interactive Click on Preview Canvas / Image
  const handlePreviewImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!workingCanvasRef.current || !activeCanvasData || !originalImageRef.current) return;
    if (toolMode === "restore") return; // Handled by pointer down/move for restoration

    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const canvas = workingCanvasRef.current;
    const naturalX = Math.floor(xRatio * canvas.width);
    const naturalY = Math.floor(yRatio * canvas.height);

    // Save history for Undo
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    if (toolMode === "wand") {
      // Erase only clicked contiguous box
      const res = floodFillErase(canvas, naturalX, naturalY, chromaTolerance);
      setActiveCanvasData(res.dataUrl);
      applyHolesToLayout(res.holes);
      setActionStatus("Area kotak yang diklik berhasil dihapus!");
    } else {
      // Global erase matching color of the clicked pixel
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const p = ctx.getImageData(naturalX, naturalY, 1, 1).data;
        const hex = rgbToHex(p[0], p[1], p[2]);
        setChromaColor(hex);
        const res = globalEraseColor(canvas, hex, chromaTolerance);
        setActiveCanvasData(res.dataUrl);
        applyHolesToLayout(res.holes);
        setActionStatus(`Warna ${hex} pada seluruh gambar berhasil dihapus!`);
      }
    }
  };

  // Restore original pixels at point (x, y) with smooth interpolation
  const restoreAtPoint = (canvasX: number, canvasY: number, prevCanvasX?: number, prevCanvasY?: number) => {
    const canvas = workingCanvasRef.current;
    if (!canvas || !originalImageRef.current || !previewContainerRef.current) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = previewContainerRef.current.getBoundingClientRect();
    const scale = rect.width > 0 ? canvas.width / rect.width : 1;
    const radius = Math.max(3, (brushSize / 2) * scale);
    const img = originalImageRef.current;

    if (prevCanvasX !== undefined && prevCanvasY !== undefined) {
      const dist = Math.hypot(canvasX - prevCanvasX, canvasY - prevCanvasY);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.4)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = prevCanvasX + (canvasX - prevCanvasX) * t;
        const y = prevCanvasY + (canvasY - prevCanvasY) * t;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode !== "erase" || !workingCanvasRef.current || !activeCanvasData || !originalImageRef.current) return;
    if (toolMode === "restore") {
      const rect = e.currentTarget.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      const canvas = workingCanvasRef.current;
      const naturalX = Math.floor(xRatio * canvas.width);
      const naturalY = Math.floor(yRatio * canvas.height);

      setIsRestoring(true);
      setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
      setRedoStack([]);
      lastRestorePosRef.current = { x: naturalX, y: naturalY };
      restoreAtPoint(naturalX, naturalY);
      setActiveCanvasData(canvas.toDataURL("image/png"));
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode !== "erase") return;
    const rect = e.currentTarget.getBoundingClientRect();

    if (toolMode === "restore") {
      setBrushCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      });

      if (isRestoring && workingCanvasRef.current && originalImageRef.current) {
        const xRatio = (e.clientX - rect.left) / rect.width;
        const yRatio = (e.clientY - rect.top) / rect.height;
        const canvas = workingCanvasRef.current;
        const naturalX = Math.floor(xRatio * canvas.width);
        const naturalY = Math.floor(yRatio * canvas.height);
        const prev = lastRestorePosRef.current;
        restoreAtPoint(naturalX, naturalY, prev?.x, prev?.y);
        lastRestorePosRef.current = { x: naturalX, y: naturalY };
        setActiveCanvasData(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleCanvasPointerUp = () => {
    if (isRestoring && workingCanvasRef.current) {
      setIsRestoring(false);
      lastRestorePosRef.current = null;
      const canvas = workingCanvasRef.current;
      const finalData = canvas.toDataURL("image/png");
      setActiveCanvasData(finalData);
      const holes = detectHolesFromCanvas(canvas);
      applyHolesToLayout(holes);
      setActionStatus("Bagian gambar berhasil dipulihkan dari gambar asli.");
    }
  };

  const handleCanvasPointerLeave = () => {
    setBrushCursor((prev) => ({ ...prev, visible: false }));
    handleCanvasPointerUp();
  };

  // Punch hole in selected box
  const handlePunchSelectedBox = () => {
    if (!workingCanvasRef.current || !activeCanvasData || !selectedBoxId) return;
    const box = photoBoxes.find((b) => b.id === selectedBoxId);
    if (!box) return;

    setHistoryStack((prev) => [...prev.slice(-9), activeCanvasData]);
    const res = punchBoxHole(workingCanvasRef.current, box);
    setActiveCanvasData(res.dataUrl);
    applyHolesToLayout(res.holes);
    const idx = photoBoxes.findIndex((b) => b.id === selectedBoxId);
    setActionStatus(`✂️ Kotak Foto #${idx + 1} berhasil dilubangi transparan 100%!`);
  };

  // Punch hole in all boxes
  const handlePunchAllBoxes = () => {
    if (!workingCanvasRef.current || !activeCanvasData || photoBoxes.length === 0) return;
    setHistoryStack((prev) => [...prev.slice(-9), activeCanvasData]);
    let lastRes = { dataUrl: activeCanvasData, holes: detectedHoles };
    photoBoxes.forEach((box) => {
      if (workingCanvasRef.current) {
        lastRes = punchBoxHole(workingCanvasRef.current, box);
      }
    });
    setActiveCanvasData(lastRes.dataUrl);
    applyHolesToLayout(lastRes.holes);
    setActionStatus(`✂️ Semua (${photoBoxes.length}) kotak foto berhasil dilubangi transparan!`);
  };

  // Bounded chroma erase in selected box
  const handleEraseChromaInSelectedBox = () => {
    if (!workingCanvasRef.current || !activeCanvasData || !selectedBoxId) return;
    const box = photoBoxes.find((b) => b.id === selectedBoxId);
    if (!box) return;

    setHistoryStack((prev) => [...prev.slice(-9), activeCanvasData]);
    const res = eraseColorInBox(workingCanvasRef.current, box, chromaColor, chromaTolerance);
    setActiveCanvasData(res.dataUrl);
    applyHolesToLayout(res.holes);
    const idx = photoBoxes.findIndex((b) => b.id === selectedBoxId);
    setActionStatus(`🔒 Warna ${chromaColor} berhasil dihapus di dalam Kotak #${idx + 1} (area luar tetap utuh)!`);
  };

  // Bounded chroma erase in all boxes
  const handleEraseChromaInAllBoxes = () => {
    if (!workingCanvasRef.current || !activeCanvasData || photoBoxes.length === 0) return;
    setHistoryStack((prev) => [...prev.slice(-9), activeCanvasData]);
    let lastRes = { dataUrl: activeCanvasData, holes: detectedHoles };
    photoBoxes.forEach((box) => {
      if (workingCanvasRef.current) {
        lastRes = eraseColorInBox(workingCanvasRef.current, box, chromaColor, chromaTolerance);
      }
    });
    setActiveCanvasData(lastRes.dataUrl);
    applyHolesToLayout(lastRes.holes);
    setActionStatus(`🔒 Warna ${chromaColor} berhasil dihapus di dalam semua (${photoBoxes.length}) kotak foto (area luar tetap utuh)!`);
  };

  // Set aspect ratio of selected box
  const setBoxRatio = (ratio: "1:1" | "3:4" | "4:3" | "9:16" | "2:3") => {
    if (!selectedBoxId) return;
    const aspectMultipliers: Record<string, number> = {
      "1:1": 1,
      "3:4": 4 / 3,
      "4:3": 3 / 4,
      "9:16": 16 / 9,
      "2:3": 3 / 2,
    };
    const targetHOverW = aspectMultipliers[ratio] || 1;
    const frameRatio = imageMeta ? imageMeta.width / imageMeta.height : 2 / 3;

    setPhotoBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== selectedBoxId) return box;
        let newH = Math.round(box.w * frameRatio * targetHOverW * 10) / 10;
        let newW = box.w;
        if (newH + box.y > 100) {
          newH = Math.min(95, 100 - box.y);
          newW = Math.round((newH / (frameRatio * targetHOverW)) * 10) / 10;
        }
        return { ...box, w: Math.max(5, newW), h: Math.max(5, newH) };
      })
    );
    setActionStatus(`Rasio kotak diubah ke ${ratio}`);
  };

  // Add a new photo box
  const handleAddBox = () => {
    const nextNum = photoBoxes.length + 1;
    const newBox: PhotoBox = {
      id: `box_${Date.now()}`,
      x: 15,
      y: Math.min(70, 10 + ((nextNum * 12) % 60)),
      w: 45,
      h: 25,
    };
    const updated = [...photoBoxes, newBox];
    setPhotoBoxes(updated);
    setSelectedBoxId(newBox.id);

    // Auto sync layout to box count
    if (updated.length === 1) setNewLayout("1x1");
    else if (updated.length === 2) setNewLayout("2x1");
    else if (updated.length === 3) setNewLayout("3x1");
    else if (updated.length === 4) setNewLayout("2x2");
    else if (updated.length === 6) setNewLayout("3x2");
    else if (updated.length === 8) setNewLayout("4x2");
    setActionStatus(`Ditambahkan Kotak Foto #${nextNum}`);
  };

  // Delete a box
  const handleDeleteBox = (boxId: string) => {
    const updated = photoBoxes.filter((b) => b.id !== boxId);
    setPhotoBoxes(updated);
    if (selectedBoxId === boxId) {
      setSelectedBoxId(updated[0]?.id || null);
    }
    // Auto sync layout to box count
    if (updated.length === 1) setNewLayout("1x1");
    else if (updated.length === 2) setNewLayout("2x1");
    else if (updated.length === 3) setNewLayout("3x1");
    else if (updated.length === 4) setNewLayout("2x2");
    else if (updated.length === 6) setNewLayout("3x2");
    else if (updated.length === 8) setNewLayout("4x2");
    setActionStatus(`Kotak foto dihapus.`);
  };

  // Undo last erase or restore action
  const handleUndo = () => {
    if (historyStack.length === 0 || !workingCanvasRef.current) return;
    const prevData = historyStack[historyStack.length - 1];
    const newHist = historyStack.slice(0, -1);
    setHistoryStack(newHist);
    setRedoStack((prev) => [...prev, activeCanvasData]);
    setActiveCanvasData(prevData);

    const img = new Image();
    img.onload = () => {
      const ctx = workingCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (ctx && workingCanvasRef.current) {
        ctx.clearRect(0, 0, workingCanvasRef.current.width, workingCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        const holes = detectHolesFromCanvas(workingCanvasRef.current);
        applyHolesToLayout(holes);
        setActionStatus("Berhasil kembali ke langkah sebelumnya (Undo).");
      }
    };
    img.src = prevData;
  };

  // Redo / Pulihkan langkah yang baru saja di-undo
  const handleRedo = () => {
    if (redoStack.length === 0 || !workingCanvasRef.current) return;
    const nextData = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    setRedoStack(newRedo);
    setHistoryStack((prev) => [...prev, activeCanvasData]);
    setActiveCanvasData(nextData);

    const img = new Image();
    img.onload = () => {
      const ctx = workingCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (ctx && workingCanvasRef.current) {
        ctx.clearRect(0, 0, workingCanvasRef.current.width, workingCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        const holes = detectHolesFromCanvas(workingCanvasRef.current);
        applyHolesToLayout(holes);
        setActionStatus("Langkah berhasil dipulihkan (Redo).");
      }
    };
    img.src = nextData;
  };

  // Reset / Pulihkan seluruh bingkai ke gambar asli
  const handleResetOriginal = () => {
    if (!rawBase64Img || !originalImageRef.current) return;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);
    setActiveCanvasData(rawBase64Img);

    const canvas = workingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImageRef.current, 0, 0);
        const holes = detectHolesFromCanvas(canvas);
        applyHolesToLayout(holes);
        setActionStatus("Seluruh bingkai berhasil dipulihkan ke gambar asli.");
      }
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setNewName("");
    setRawBase64Img("");
    setActiveCanvasData("");
    setHistoryStack([]);
    setDetectedHoles([]);
    setPhotoBoxes([]);
    setSelectedBoxId(null);
    setUploadError("");
    setActionStatus("");
    setImageMeta(null);
    workingCanvasRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setUploadError("Nama template bingkai harus diisi!");
      return;
    }
    if (!activeCanvasData && !rawBase64Img) {
      setUploadError("Gambar frame wajib diunggah!");
      return;
    }

    const finalImg = workingCanvasRef.current?.toDataURL("image/png") || activeCanvasData || rawBase64Img;

    setIsSubmitting(true);
    try {
      await onAddTemplate(newName.trim(), newLayout, "auto", finalImg, photoBoxes);
      handleCloseUploadModal();
      alert("✅ Bingkai berhasil ditambahkan!");
    } catch (err) {
      console.error(err);
      setUploadError("Gagal menyimpan template bingkai.");
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
                        {s.raw_photos && s.raw_photos.length > 0 && (
                          <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            📸 {s.raw_photos.length} Foto Asli (Raw)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                        <div className="flex gap-2">
                          <a
                            href={s.strip_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            Unduh Strip
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
                        <a
                          href={`/?session=${s.session_code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full text-center py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition-all border border-slate-200/80"
                        >
                          Buka Portal Pengunjung ↗
                        </a>
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
              {/* Status Card */}
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
                      {dbConfigured ? "Terhubung ke Supabase Cloud" : "Mode Offline / Supabase Belum Aktif"}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {dbConfigured
                        ? "Foto strip, animasi GIF, dan foto asli tersimpan di Supabase Cloud & Storage photobooth."
                        : "Supabase Anon Key belum diisi. Foto hanya tersimpan di perangkat booth ini dan belum dapat dibuka di HP pengunjung."}
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

              {/* Configuration Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kredensial Supabase Cloud</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan URL dan Anon Public Key dari proyek Supabase Anda. Kunci ini otomatis tersimpan dan disertakan dalam QR Code agar pengunjung HP dapat langsung mengunduh fotonya.
                  </p>
                </div>

                <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      value={supabaseUrlInput}
                      onChange={(e) => setSupabaseUrlInput(e.target.value)}
                      placeholder="https://your-project-ref.supabase.co"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-slate-50/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Supabase Anon Key (Public Key)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAnonKey((prev) => !prev)}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        {showAnonKey ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </div>
                    <textarea
                      value={supabaseAnonKeyInput}
                      onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      rows={showAnonKey ? 4 : 2}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-slate-50/50 resize-none break-all"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Anon key adalah kunci publik aman yang digunakan klien/HP untuk membaca hasil foto sesi mereka.
                    </p>
                  </div>

                  {supabaseSavedMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                      {supabaseSavedMsg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Simpan & Hubungkan
                    </button>
                    <button
                      type="button"
                      onClick={handleTestDB}
                      disabled={dbTestResult.testing}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {dbTestResult.testing ? "Menguji..." : "Uji Koneksi"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Instructions Guide Card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Cara Mengambil Anon Key dari Supabase Dashboard</span>
                </h4>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Buka project Supabase Anda di{" "}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline font-semibold"
                    >
                      supabase.com/dashboard
                    </a>
                  </li>
                  <li>
                    Masuk ke menu <strong>Project Settings</strong> (ikon gerigi di sidebar kiri bawah) &gt; pilih tab <strong>API</strong>.
                  </li>
                  <li>
                    Di bagian <strong>Project API keys</strong>, cari baris <strong>anon public</strong> lalu klik <strong>Copy</strong>.
                  </li>
                  <li>
                    Tempelkan kuncinya ke kolom <strong>Supabase Anon Key</strong> di atas lalu klik <strong>Simpan & Hubungkan</strong>.
                  </li>
                  <li>
                    Pastikan tabel database sudah terbuat dengan mengeksekusi kode dari file <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">supabase_schema.sql</code> pada menu <strong>SQL Editor</strong> Supabase.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── MODAL UNGGAH & KONFIGURASI FRAME BARU ──────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-blue-600" />
                  <span>Studio Unggah & Konfigurasi Bingkai</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload file bingkai (PNG/JPG). Hapus kotak foto atau warna latar dengan 1 klik agar foto pengunjung masuk pas ke lubang bingkai.
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
              {/* ─────── LEFT COLUMN: Form Inputs & Eraser Controls ─────── */}
              <div className="lg:col-span-6 p-6 space-y-4">
                <form onSubmit={handleSaveTemplate} id="frame-upload-form" className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Nama Template Bingkai</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Contoh: Cute Pink Bears (4 Foto)"
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
                        <option value="2x2">Grid 4 Foto (2x2 / Custom 4 Lubang)</option>
                        <option value="3x1">Strip Vertikal (3x1 / 3 Foto)</option>
                        <option value="3x2">Grid 6 Foto (3x2 / 6 Foto)</option>
                        <option value="2x1">Strip Pendek (2x1 / 2 Foto)</option>
                        <option value="1x1">Foto Tunggal (1x1)</option>
                        <option value="4x2">Grid 8 Foto (4x2 / 8 Foto)</option>
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
                      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                        activeCanvasData
                          ? "border-blue-400 bg-blue-50/20 hover:bg-blue-50/40"
                          : "border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30"
                      }`}
                    >
                      {activeCanvasData ? (
                        <div className="flex items-center justify-center gap-3">
                          <img
                            src={activeCanvasData}
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
                          <span className="text-xs font-semibold text-slate-700 block">Pilih Gambar Frame (PNG / JPG / WEBP)</span>
                          <span className="text-[10px] text-slate-400 block">Bisa berupa gambar transparan atau gambar dengan kotak putih / latar hijau</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─────── 1. ALAT PENGHAPUS & PEMULIH BINGKAI (MANDIRI) ─────── */}
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Wand2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            Alat Hapus & Pulihkan Background
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Hapus background atau pulihkan kembali gambar asli
                          </span>
                        </div>
                      </div>

                      {/* Undo, Redo & Pulihkan Asli Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={historyStack.length === 0}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                          title="Batal langkah terakhir (Undo)"
                        >
                          <Undo className="w-3 h-3 text-slate-600" />
                          <span>Undo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRedo}
                          disabled={redoStack.length === 0}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                          title="Ulangi langkah (Redo)"
                        >
                          <Redo className="w-3 h-3 text-slate-600" />
                          <span>Redo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetOriginal}
                          disabled={!rawBase64Img || (historyStack.length === 0 && redoStack.length === 0)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                          title="Pulihkan seluruh gambar ke kondisi awal"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-600" />
                          <span>Pulihkan Asli</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Erase & Restore Tool Buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setToolMode("wand");
                          setInteractionMode("erase");
                          setPreviewTab("checkerboard");
                        }}
                        disabled={!activeCanvasData}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer border ${
                          toolMode === "wand" && interactionMode === "erase"
                            ? "bg-blue-600 text-white border-blue-700 shadow-blue-500/20"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Wand2 className={`w-4 h-4 ${toolMode === "wand" && interactionMode === "erase" ? "text-white" : "text-blue-600"}`} />
                        <span className="text-[11px] font-bold leading-tight text-center">Magic Wand</span>
                        <span className={`text-[9px] ${toolMode === "wand" && interactionMode === "erase" ? "text-blue-100" : "text-slate-400"}`}>
                          Hapus Klik
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToolMode("restore");
                          setInteractionMode("erase");
                          setPreviewTab("checkerboard");
                        }}
                        disabled={!activeCanvasData}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer border ${
                          toolMode === "restore" && interactionMode === "erase"
                            ? "bg-amber-600 text-white border-amber-700 shadow-amber-500/20"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Paintbrush className={`w-4 h-4 ${toolMode === "restore" && interactionMode === "erase" ? "text-white" : "text-amber-600"}`} />
                        <span className="text-[11px] font-bold leading-tight text-center">Pulihkan</span>
                        <span className={`text-[9px] ${toolMode === "restore" && interactionMode === "erase" ? "text-amber-100" : "text-slate-400"}`}>
                          Kuas Usap
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEraseWhite}
                        disabled={!activeCanvasData}
                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:border-blue-400 cursor-pointer disabled:opacity-50"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white shadow-xs"></div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight text-center">Hapus Putih</span>
                        <span className="text-[9px] text-slate-400">1-Klik Semua</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEraseGreen}
                        disabled={!activeCanvasData}
                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs hover:border-emerald-400 cursor-pointer disabled:opacity-50"
                      >
                        <div className="w-4 h-4 rounded-full border border-emerald-400 bg-[#00FF00] shadow-xs"></div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight text-center">Hapus Hijau</span>
                        <span className="text-[9px] text-slate-400">Green Screen</span>
                      </button>
                    </div>

                    {/* Sub-panel when Kuas Pulihkan is active */}
                    {toolMode === "restore" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <Paintbrush className="w-3.5 h-3.5 text-amber-600" />
                            Kuas Pulihkan (Kembalikan Gambar Asli)
                          </span>
                          <span className="font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                            {brushSize}px
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-tight">
                          Gosok atau usap kuas pada area gambar yang bolong/transparan di sebelah kanan untuk memulihkan gambar aslinya.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-amber-800 font-semibold shrink-0">Ukuran Kuas:</span>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-full accent-amber-600 h-1.5 bg-amber-200 rounded-lg cursor-pointer"
                          />
                          <div
                            className="shrink-0 rounded-full border border-amber-500 bg-amber-400/40"
                            style={{
                              width: `${Math.min(24, Math.max(8, brushSize / 3.5))}px`,
                              height: `${Math.min(24, Math.max(8, brushSize / 3.5))}px`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Custom Chroma Color & Tolerance (Shown when not in restore mode) */}
                    {toolMode !== "restore" && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">Toleransi Kepekaan Warna:</span>
                          <span className="font-mono font-bold text-blue-600">{chromaTolerance}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="65"
                          value={chromaTolerance}
                          onChange={(e) => setChromaTolerance(Number(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-600 font-medium">Hapus Warna Tertentu:</span>
                            <input
                              type="color"
                              value={chromaColor}
                              onChange={(e) => setChromaColor(e.target.value)}
                              className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0.5"
                              title="Pilih warna kustom"
                            />
                            <span className="text-[10px] font-mono text-slate-500">{chromaColor}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEraseChosenColor(chromaColor)}
                            disabled={!activeCanvasData}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Hapus Warna Ini
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action status message */}
                    {actionStatus && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium animate-in fade-in flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{actionStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* ─────── 2. PENANDA POSISI FOTO PENGUNJUNG (SLOT FOTO) ─────── */}
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Square className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            Penanda Posisi Foto ({photoBoxes.length} Kotak)
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Menandai letak & rasio foto pengunjung saat sesi foto booth
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddBox}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Kotak</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-indigo-900/80 bg-white/80 p-2 rounded-lg border border-indigo-100 leading-relaxed">
                      💡 <strong>Catatan:</strong> Kotak ini hanya sebagai penanda (slot) posisi foto pengunjung di booth. Kotak ini <u>tidak memotong</u> atau merusak hiasan bingkai Anda.
                    </p>

                    {/* Box Selector Pills */}
                    {photoBoxes.length > 0 ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                          {photoBoxes.map((box, idx) => {
                            const isSelected = (selectedBoxId || photoBoxes[0]?.id) === box.id;
                            return (
                              <button
                                key={box.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBoxId(box.id);
                                  setInteractionMode("boxes");
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <span>Kotak #{idx + 1}</span>
                                <span className="text-[10px] opacity-75">
                                  ({Math.round(box.w)}% × {Math.round(box.h)}%)
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Box Controls: Ratio Presets & Delete */}
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              Atur Rasio untuk Kotak #{photoBoxes.findIndex((b) => b.id === (selectedBoxId || photoBoxes[0]?.id)) + 1}:
                            </span>
                            {photoBoxes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBox(selectedBoxId || photoBoxes[0]?.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Hapus kotak penanda ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Kotak</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-1.5">
                            {(["1:1", "3:4", "4:3", "9:16", "2:3"] as const).map((ratio) => (
                              <button
                                key={ratio}
                                type="button"
                                onClick={() => setBoxRatio(ratio)}
                                className="px-2 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-lg text-[11px] font-bold text-slate-700 transition-all text-center cursor-pointer"
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white/70 rounded-xl text-center text-xs text-slate-400">
                        Belum ada kotak foto. Klik "Tambah Kotak" untuk memulai.
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

              {/* ─────── RIGHT COLUMN: Interactive Live Preview & Mode Switcher ─────── */}
              <div className="lg:col-span-6 p-6 bg-slate-50/50 flex flex-col justify-between space-y-4">
                {/* Mode Switcher Tabs Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setToolMode("wand");
                        setInteractionMode("erase");
                        setPreviewTab("checkerboard");
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        toolMode === "wand" && interactionMode === "erase" && previewTab === "checkerboard"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>1. Hapus (Wand)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setToolMode("restore");
                        setInteractionMode("erase");
                        setPreviewTab("checkerboard");
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        toolMode === "restore" && interactionMode === "erase" && previewTab === "checkerboard"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>2. Pulihkan (Kuas)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInteractionMode("boxes");
                        setPreviewTab("checkerboard");
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        interactionMode === "boxes" && previewTab === "checkerboard"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>3. Atur Posisi Foto ({photoBoxes.length})</span>
                    </button>
                  </div>

                  {/* Mode switcher: Checkerboard vs Realistic Photos */}
                  <button
                    type="button"
                    onClick={() => setPreviewTab(previewTab === "photos" ? "checkerboard" : "photos")}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      previewTab === "photos"
                        ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Simulasi Foto</span>
                  </button>
                </div>

                {/* Dimension & Aspect Ratio info pill */}
                {imageMeta && (
                  <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 font-medium">
                    <span>Ukuran Frame: <strong className="font-mono text-slate-700">{imageMeta.width} × {imageMeta.height} px</strong></span>
                    <span className="font-mono text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full text-[10px]">
                      Rasio {Math.round((imageMeta.width / imageMeta.height) * 100) / 100} : 1
                    </span>
                  </div>
                )}

                {/* Live Preview Canvas Outer Centering Container */}
                <div className="w-full flex-1 flex items-center justify-center min-h-[320px] max-h-[500px] overflow-hidden">
                  <div
                    ref={previewContainerRef}
                    onClick={interactionMode === "erase" && toolMode !== "restore" ? handlePreviewImageClick : undefined}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerLeave}
                    style={{
                      aspectRatio: imageMeta ? `${imageMeta.width} / ${imageMeta.height}` : "2 / 3",
                      width: imageMeta && imageMeta.height > 0
                        ? `min(100%, calc(480px * ${imageMeta.width} / ${imageMeta.height}))`
                        : "100%",
                      maxHeight: "480px",
                    }}
                    className={`relative max-w-full rounded-2xl overflow-hidden border border-slate-300 shadow-sm flex items-center justify-center select-none ${
                      toolMode === "restore" && interactionMode === "erase"
                        ? "cursor-none touch-none"
                        : interactionMode === "erase" && activeCanvasData
                        ? "cursor-crosshair"
                        : "cursor-default"
                    } ${
                      previewTab === "checkerboard"
                        ? "bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] bg-[length:14px_14px]"
                        : "bg-slate-900"
                    }`}
                  >
                    {/* Circular Brush Cursor in Restore Mode */}
                    {toolMode === "restore" && interactionMode === "erase" && brushCursor.visible && (
                      <div
                        className="absolute pointer-events-none rounded-full border-2 border-amber-500 bg-amber-400/25 shadow-xs -translate-x-1/2 -translate-y-1/2 z-40"
                        style={{
                          left: `${brushCursor.x}px`,
                          top: `${brushCursor.y}px`,
                          width: `${brushSize}px`,
                          height: `${brushSize}px`,
                        }}
                      />
                    )}
                    {/* Photo Simulation Layer: Render sample photos inside photo boxes */}
                    {previewTab === "photos" && (
                      <div className="absolute inset-0 z-0 pointer-events-none">
                        {photoBoxes.map((box, i) => {
                          const colors = [
                            "from-sky-400 to-indigo-600",
                            "from-pink-400 to-rose-600",
                            "from-amber-400 to-orange-500",
                            "from-emerald-400 to-teal-600",
                            "from-purple-500 to-indigo-600",
                            "from-cyan-400 to-blue-600",
                            "from-fuchsia-400 to-pink-600",
                            "from-yellow-400 to-amber-600",
                          ];
                          const colorClass = colors[i % colors.length];

                          return (
                            <div
                              key={box.id}
                              className={`absolute rounded-lg bg-gradient-to-tr ${colorClass} flex flex-col items-center justify-center text-white shadow-inner opacity-95`}
                              style={{
                                left: `${box.x}%`,
                                top: `${box.y}%`,
                                width: `${box.w}%`,
                                height: `${box.h}%`,
                              }}
                            >
                              <Camera className="w-5 h-5 mb-0.5 opacity-90" />
                              <span className="text-[10px] font-bold">Foto #{i + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Frame Image Layer */}
                    {activeCanvasData ? (
                      <div className="relative w-full h-full z-10 flex items-center justify-center pointer-events-none">
                        <img
                          ref={previewImgRef}
                          src={activeCanvasData}
                          alt="Frame Preview"
                          className="w-full h-full block object-fill"
                        />
                      </div>
                    ) : (
                      <div className="p-6 text-center space-y-2 text-slate-400 z-10">
                        <ImageIcon className="w-12 h-12 mx-auto opacity-40" />
                        <p className="text-xs font-semibold text-slate-600">Belum ada gambar dipilih</p>
                        <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                          Pilih berkas frame di sebelah kiri untuk melihat pratinjau dan mengatur kotak foto
                        </p>
                      </div>
                    )}

                  {/* Photo Boxes Guides & Interactive Overlay */}
                  {activeCanvasData && (
                    <div className={`absolute inset-0 z-20 ${interactionMode === "boxes" ? "pointer-events-auto" : "pointer-events-none"}`}>
                      {photoBoxes.map((box, idx) => {
                        const isSelected = (selectedBoxId || photoBoxes[0]?.id) === box.id;
                        return (
                          <div
                            key={box.id}
                            onClick={(e) => {
                              if (interactionMode !== "boxes") return;
                              e.stopPropagation();
                              setSelectedBoxId(box.id);
                            }}
                            onPointerDown={(e) => {
                              if (interactionMode !== "boxes") return;
                              e.stopPropagation();
                              setSelectedBoxId(box.id);
                              setDragState({
                                type: "move",
                                boxId: box.id,
                                startX: e.clientX,
                                startY: e.clientY,
                                initBox: { ...box },
                              });
                            }}
                            style={{
                              left: `${box.x}%`,
                              top: `${box.y}%`,
                              width: `${box.w}%`,
                              height: `${box.h}%`,
                            }}
                            className={`absolute select-none rounded-lg flex flex-col items-center justify-between p-1.5 transition-all ${
                              interactionMode === "boxes"
                                ? isSelected
                                  ? "cursor-move border-2 border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-400/60 shadow-lg z-30"
                                  : "cursor-move border-2 border-indigo-400/80 bg-indigo-500/10 hover:border-indigo-400 z-20"
                                : "border-2 border-dashed border-indigo-400/40 bg-indigo-500/5 z-10"
                            }`}
                          >
                            {/* Header Badge */}
                            <div className="w-full flex items-center justify-between pointer-events-none">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold text-[9px] shadow-xs">
                                #{idx + 1}
                              </span>
                              {isSelected && interactionMode === "boxes" && (
                                <span className="text-[8px] bg-slate-900/80 text-white px-1 py-0.5 rounded font-mono">
                                  {Math.round(box.w)}% × {Math.round(box.h)}%
                                </span>
                              )}
                            </div>

                            {/* Center label */}
                            <div className="pointer-events-none text-center">
                              <Camera className={`w-3.5 h-3.5 mx-auto ${isSelected && interactionMode === "boxes" ? "text-indigo-700" : "text-slate-500"}`} />
                              <span className={`text-[9px] font-bold ${isSelected && interactionMode === "boxes" ? "text-indigo-800" : "text-slate-600"}`}>
                                Foto #{idx + 1}
                              </span>
                            </div>

                            <div className="w-full h-1" />

                            {/* Resize Handles when selected in boxes mode */}
                            {isSelected && interactionMode === "boxes" && (
                              <>
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setDragState({
                                      type: "resize",
                                      boxId: box.id,
                                      handle: "nw",
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      initBox: { ...box },
                                    });
                                  }}
                                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-40 shadow-xs"
                                  title="Tarik sudut untuk ubah ukuran"
                                />
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setDragState({
                                      type: "resize",
                                      boxId: box.id,
                                      handle: "ne",
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      initBox: { ...box },
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-40 shadow-xs"
                                  title="Tarik sudut untuk ubah ukuran"
                                />
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setDragState({
                                      type: "resize",
                                      boxId: box.id,
                                      handle: "sw",
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      initBox: { ...box },
                                    });
                                  }}
                                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-40 shadow-xs"
                                  title="Tarik sudut untuk ubah ukuran"
                                />
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setDragState({
                                      type: "resize",
                                      boxId: box.id,
                                      handle: "se",
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      initBox: { ...box },
                                    });
                                  }}
                                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-40 shadow-xs"
                                  title="Tarik sudut untuk ubah ukuran"
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Mode Banner / Instruction Tooltip */}
                  {activeCanvasData && (
                    <div className="absolute bottom-2 left-2 right-2 z-30 pointer-events-none">
                      {interactionMode === "erase" ? (
                        <div className="bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-lg text-center">
                          🪄 <strong>Mode Magic Wand:</strong> Klik pada area gambar (misal bagian putih di dalam pigura) untuk melubanginya menjadi transparan.
                        </div>
                      ) : (
                        <div className="bg-indigo-900/85 backdrop-blur-xs text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-lg text-center">
                          📐 <strong>Mode Penanda Foto:</strong> Geser kotak atau tarik sudutnya untuk menandai letak & ukuran foto pengunjung.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

                {/* Helper / Status Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md font-semibold border border-indigo-200">
                      <Move className="w-3.5 h-3.5" />
                      <span>{photoBoxes.length} Slot Foto Terpasang</span>
                    </span>
                  </div>

                  <span className="text-slate-500 font-semibold">
                    {LAYOUT_LABELS[newLayout] || newLayout}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer: Action Buttons */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                {photoBoxes.length > 0 ? (
                  <span className="text-emerald-700 font-semibold">
                    ✅ Siap! Foto pengunjung akan masuk pas ke dalam {photoBoxes.length} posisi yang sudah ditandai.
                  </span>
                ) : (
                  <span className="text-slate-500">
                    💡 Tip: Lubangi pigura foto dengan Magic Wand lalu atur penanda foto.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                  disabled={isSubmitting || !newName || (!activeCanvasData && !rawBase64Img)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan ke Cloud..." : "Simpan Bingkai"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
