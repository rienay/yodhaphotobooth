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
  Clock,
  Pencil,
  Copy,
  Printer,
  Volume2,
  VolumeX,
  Download,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Receipt,
  DollarSign,
  CreditCard,
  QrCode,
  EyeOff,
} from "lucide-react";
import { printPhotoStrip, PRINT_SIZES } from "../lib/printHelper";
import {
  FinanceDB,
  FinanceTransaction,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  ALL_CATEGORIES,
  PAYMENT_METHODS,
  formatRupiah,
  getCategoryInfo,
  getPaymentMethodInfo,
} from "../lib/finance";
import {
  getXenditConfig,
  saveXenditConfig,
  testXenditConnection,
  XenditConfig,
  isTestApiKey,
} from "../lib/xendit";
import {
  CameraFilter,
  FilterSliderSettings,
  DEFAULT_SLIDER_SETTINGS,
  DEFAULT_PHOTO_FILTERS,
  generateFilterCss,
  parseFilterCss,
  loadLocalFilters,
  saveLocalFilters,
} from "../lib/filters";
import {
  AiEffect,
  AiProviderSettings,
  DEFAULT_AI_EFFECTS,
  DEFAULT_AI_PROVIDER_SETTINGS,
  loadLocalAiEffects,
  saveLocalAiEffects,
  loadAiProviderSettings,
  saveAiProviderSettings,
  applyAiStylization,
  testAiProviderConnection,
} from "../lib/aiEffects";

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

const FILTER_PRESETS: { name: string; emoji: string; desc: string; sliders: FilterSliderSettings }[] = [
  {
    name: "Alami (Natural)",
    emoji: "✨",
    desc: "Warna natural jernih tanpa efek modifikasi",
    sliders: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Clarendon",
    emoji: "📸",
    desc: "Highlight cerah, kontras tegas, dan warna pop segar",
    sliders: { brightness: 110, contrast: 120, saturate: 125, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Gingham Vintage",
    emoji: "📻",
    desc: "Nuansa vintage lembut ala foto analog berkesan hangat",
    sliders: { brightness: 110, contrast: 90, saturate: 100, sepia: 30, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Moon (Dreamy B&W)",
    emoji: "🌙",
    desc: "Hitam putih lembut bercahaya dengan bayangan halus elegan",
    sliders: { brightness: 115, contrast: 90, saturate: 100, sepia: 0, grayscale: 100, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Polaroid 70s",
    emoji: "📷",
    desc: "Warna khas kamera instan Polaroid tahun 70-an yang otentik",
    sliders: { brightness: 110, contrast: 115, saturate: 125, sepia: 20, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Kodachrome Analog",
    emoji: "📽️",
    desc: "Karakter legendaris film 1935 dengan nada warna hangat kaya",
    sliders: { brightness: 108, contrast: 125, saturate: 140, sepia: 15, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Technicolor Classic",
    emoji: "🎬",
    desc: "Warna sinema 3-strip Hollywood tempo dulu yang cerah",
    sliders: { brightness: 110, contrast: 135, saturate: 160, sepia: 0, grayscale: 0, hueRotate: 350, blur: 0, invert: 0 },
  },
  {
    name: "Brownie 1900",
    emoji: "🕰️",
    desc: "Foto kuno bersejarah awal abad ke-20 ala kamera Kodak Brownie",
    sliders: { brightness: 95, contrast: 115, saturate: 115, sepia: 65, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Vintage Pinhole",
    emoji: "🕳️",
    desc: "Kesan foto lofi kamera lubang jarum antik berkarakter",
    sliders: { brightness: 90, contrast: 130, saturate: 85, sepia: 40, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Film Noir Desaturate",
    emoji: "🕵️",
    desc: "Hitam putih dramatis kontras tinggi dengan bayangan pekat",
    sliders: { brightness: 95, contrast: 140, saturate: 100, sepia: 0, grayscale: 100, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Vintage Hangat 90-an",
    emoji: "🎞️",
    desc: "Kesan nostalgia hangat ala foto film analog 90-an",
    sliders: { brightness: 102, contrast: 105, saturate: 115, sepia: 35, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Soft Barbie Glow",
    emoji: "🌸",
    desc: "Cerah segar merona dengan kelembutan bercahaya",
    sliders: { brightness: 110, contrast: 105, saturate: 125, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Sunset Golden Hour",
    emoji: "🌅",
    desc: "Kilau sinar matahari senja keemasan yang mempesona",
    sliders: { brightness: 106, contrast: 108, saturate: 135, sepia: 22, grayscale: 0, hueRotate: 345, blur: 0, invert: 0 },
  },
  {
    name: "Cool Sinematik",
    emoji: "❄️",
    desc: "Warna sejuk misterius khas adegan film layar lebar",
    sliders: { brightness: 100, contrast: 110, saturate: 90, sepia: 0, grayscale: 0, hueRotate: 185, blur: 0, invert: 0 },
  },
  {
    name: "Retro Cyberpunk",
    emoji: "⚡",
    desc: "Kontras tajam dan saturasi tinggi gaya neon futuristik",
    sliders: { brightness: 104, contrast: 130, saturate: 145, sepia: 0, grayscale: 0, hueRotate: 0, blur: 0, invert: 0 },
  },
  {
    name: "Spectrum Hue Shift",
    emoji: "🌈",
    desc: "Efek spektrum warna psychedelic 180 derajat yang unik",
    sliders: { brightness: 100, contrast: 100, saturate: 120, sepia: 0, grayscale: 0, hueRotate: 180, blur: 0, invert: 0 },
  },
  {
    name: "Klise Negatif Film",
    emoji: "🎞️",
    desc: "Efek artistik klise negatif film kamera analog",
    sliders: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hueRotate: 180, blur: 0, invert: 100 },
  },
  {
    name: "Soft Dreamy Glow",
    emoji: "☁️",
    desc: "Fokus lembut berkilau seperti dalam mimpi yang syahdu",
    sliders: { brightness: 108, contrast: 105, saturate: 100, sepia: 0, grayscale: 0, hueRotate: 0, blur: 1.5, invert: 0 },
  },
  {
    name: "Warm Cafe Latte",
    emoji: "☕",
    desc: "Nuansa cokelat lembut dan santai seperti kedai kopi",
    sliders: { brightness: 104, contrast: 98, saturate: 92, sepia: 40, grayscale: 0, hueRotate: 10, blur: 0, invert: 0 },
  },
  {
    name: "Pastel Sweet Candy",
    emoji: "🍬",
    desc: "Kecerahan tinggi lembut dengan saturasi manis pastel",
    sliders: { brightness: 115, contrast: 96, saturate: 112, sepia: 8, grayscale: 0, hueRotate: 320, blur: 0, invert: 0 },
  },
  {
    name: "Moody Forest Green",
    emoji: "🌲",
    desc: "Nuansa alam teduh dengan saturasi seimbang",
    sliders: { brightness: 96, contrast: 112, saturate: 88, sepia: 12, grayscale: 0, hueRotate: 90, blur: 0, invert: 0 },
  },
];

const EMOJI_SUGGESTIONS = ["✨", "🎞️", "🖤", "🌸", "🌅", "❄️", "⚡", "☕", "🍬", "🌲", "📸", "🔥", "🎀", "💜", "🕶️", "🌙", "🌊", "🌻"];

const SAMPLE_PORTRAIT_URL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80";

const settingsDB = new SettingsDB();
const sessionDB = new SessionDB();
const financeDB = new FinanceDB();

export function AdminScreen({
  templates,
  onToggleTemplate,
  onAddTemplate,
  onDeleteTemplate,
  onLaunchBooth,
  onLogout,
}: AdminScreenProps) {
  const [activeNav, setActiveNav] = useState<"dashboard" | "frames" | "filters" | "ai" | "gallery" | "print" | "finance" | "devices" | "settings" | "database">("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Financial / Keuangan State ──
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [editingFinanceId, setEditingFinanceId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TransactionType>("income");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txCategory, setTxCategory] = useState<TransactionCategory>("photo_session");
  const [txPaymentMethod, setTxPaymentMethod] = useState<PaymentMethod>("qris");
  const [txDescription, setTxDescription] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [txSessionCode, setTxSessionCode] = useState("");
  const [txModalError, setTxModalError] = useState("");

  // Filters for Finance Tab
  const [financeTypeFilter, setFinanceTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [financePeriodFilter, setFinancePeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState<string>("all");
  const [financeSearchQuery, setFinanceSearchQuery] = useState("");

  // ── Print Queue & History State ──
  const [printTab, setPrintTab] = useState<"pending" | "history">("pending");
  const [printSearchQuery, setPrintSearchQuery] = useState("");
  const [printingSessionCode, setPrintingSessionCode] = useState<string | null>(null);
  const [selectedPreviewStrip, setSelectedPreviewStrip] = useState<PhotoboothSession | null>(null);
  const [autoRefreshPrint, setAutoRefreshPrint] = useState(true);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [editCopiesMap, setEditCopiesMap] = useState<Record<string, number>>({});

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
  const [cameraZoom, setCameraZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 0.85;
    const saved = localStorage.getItem("yodha_camera_zoom");
    return saved ? parseFloat(saved) : 0.85;
  });

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

  // ── Xendit QRIS Payment State ──
  const [xenditConfig, setXenditConfig] = useState<XenditConfig>(() => getXenditConfig());
  const [xenditApiKeyInput, setXenditApiKeyInput] = useState(xenditConfig.apiKey);
  const [xenditPaymentEnabled, setXenditPaymentEnabled] = useState(xenditConfig.paymentEnabled);
  const [xenditPriceInput, setXenditPriceInput] = useState(xenditConfig.price.toString());
  const [showXenditKey, setShowXenditKey] = useState(false);
  const [xenditTesting, setXenditTesting] = useState(false);
  const [xenditTestResult, setXenditTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [xenditSavedMsg, setXenditSavedMsg] = useState("");

  // ── Camera Filters State & Modals ──
  const [filters, setFilters] = useState<CameraFilter[]>(() => loadLocalFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterEmoji, setFilterEmoji] = useState("✨");
  const [filterDesc, setFilterDesc] = useState("");
  const [filterSliders, setFilterSliders] = useState<FilterSliderSettings>(DEFAULT_SLIDER_SETTINGS);
  const [customCssMode, setCustomCssMode] = useState(false);
  const [customCssInput, setCustomCssInput] = useState("");
  const [filterModalError, setFilterModalError] = useState("");
  const [previewBeforeAfter, setPreviewBeforeAfter] = useState(false);
  const [copiedCssId, setCopiedCssId] = useState<string | null>(null);
  const [filterFeedbackMsg, setFilterFeedbackMsg] = useState("");

  // ── Dreambooth AI Effects State & Modals ──
  const [aiEffects, setAiEffects] = useState<AiEffect[]>(() => loadLocalAiEffects());
  const [aiProviderSettings, setAiProviderSettings] = useState<AiProviderSettings>(() => loadAiProviderSettings());
  const [aiCategoryFilter, setAiCategoryFilter] = useState<string>("all");
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingAiId, setEditingAiId] = useState<string | null>(null);
  const [aiName, setAiName] = useState("");
  const [aiEmoji, setAiEmoji] = useState("✨");
  const [aiCategory, setAiCategory] = useState<AiEffect["category"]>("character");
  const [aiDesc, setAiDesc] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNegativePrompt, setAiNegativePrompt] = useState("");
  const [aiShaderType, setAiShaderType] = useState<AiEffect["shaderType"]>("3d_movie");
  const [aiPreviewUrl, setAiPreviewUrl] = useState("");
  const [aiModalError, setAiModalError] = useState("");
  const [aiFeedbackMsg, setAiFeedbackMsg] = useState("");

  // AI Provider Settings Modal
  const [showAiProviderModal, setShowAiProviderModal] = useState(false);
  const [providerModeInput, setProviderModeInput] = useState<AiProviderSettings["mode"]>(aiProviderSettings.mode);
  const [apiKeyInput, setApiKeyInput] = useState(aiProviderSettings.apiKey || "");
  const [apiEndpointInput, setApiEndpointInput] = useState(aiProviderSettings.apiEndpoint || "");
  const [modelNameInput, setModelNameInput] = useState(aiProviderSettings.modelName || "fal-ai/fast-sdxl/image-to-image");
  const [strengthInput, setStrengthInput] = useState<number>(aiProviderSettings.strength || 0.80);
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [providerTestMsg, setProviderTestMsg] = useState<{ success: boolean; text: string } | null>(null);

  // AI Interactive Testing Modal
  const [showAiTestModal, setShowAiTestModal] = useState(false);
  const [testingAiEffect, setTestingAiEffect] = useState<AiEffect | null>(null);
  const [testSourceImg, setTestSourceImg] = useState<string>(SAMPLE_PORTRAIT_URL);
  const [testResultImg, setTestResultImg] = useState<string | null>(null);
  const [isProcessingAiTest, setIsProcessingAiTest] = useState(false);
  const [testCompareBefore, setTestCompareBefore] = useState(false);

  // Load initial data
  useEffect(() => {
    // Admin screen should never be in fullscreen mode
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }

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

    // Camera zoom setting
    settingsDB.getSetting<number>("camera_zoom", 0.85).then((val) => {
      if (typeof val === "number" && !isNaN(val)) {
        setCameraZoom(val);
      }
    });

    // Admin PIN
    getAdminPin().then((pin) => setCurrentPinState(pin));

    // Sessions
    loadSessions();

    // Camera filters
    settingsDB.getSetting<CameraFilter[]>("camera_filters", DEFAULT_PHOTO_FILTERS).then((val) => {
      if (val && Array.isArray(val) && val.length > 0) {
        const existingIds = new Set(val.map((f) => f.id));
        const missing = DEFAULT_PHOTO_FILTERS.filter((d) => !existingIds.has(d.id));
        const merged = missing.length > 0 ? [...val, ...missing] : val;
        setFilters(merged);
        saveLocalFilters(merged);
        if (missing.length > 0) {
          settingsDB.saveSetting("camera_filters", merged);
        }
      } else {
        setFilters(DEFAULT_PHOTO_FILTERS);
        saveLocalFilters(DEFAULT_PHOTO_FILTERS);
        settingsDB.saveSetting("camera_filters", DEFAULT_PHOTO_FILTERS);
      }
    });
  }, []);

  // ── Filter Management Handlers ──
  const handleToggleFilter = async (id: string, enabled: boolean) => {
    const updated = filters.map((f) => (f.id === id ? { ...f, enabled } : f));
    setFilters(updated);
    saveLocalFilters(updated);
    await settingsDB.saveSetting("camera_filters", updated);
    const target = filters.find((f) => f.id === id);
    setFilterFeedbackMsg(
      enabled
        ? `✅ Filter "${target?.name || id}" diaktifkan di booth.`
        : `⏸️ Filter "${target?.name || id}" dinonaktifkan.`
    );
    setTimeout(() => setFilterFeedbackMsg(""), 3500);
  };

  const handleResetFiltersToDefault = async () => {
    if (confirm("Kembalikan seluruh filter kamera ke daftar bawaan standar lengkap? Filter kustom akan direset.")) {
      setFilters(DEFAULT_PHOTO_FILTERS);
      saveLocalFilters(DEFAULT_PHOTO_FILTERS);
      await settingsDB.saveSetting("camera_filters", DEFAULT_PHOTO_FILTERS);
      setFilterFeedbackMsg("🔄 Seluruh filter kamera telah dikembalikan ke standar awal.");
      setTimeout(() => setFilterFeedbackMsg(""), 3500);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    const target = filters.find((f) => f.id === id);
    if (!target) return;
    if (confirm(`Hapus filter "${target.name}" secara permanen?`)) {
      const updated = filters.filter((f) => f.id !== id);
      setFilters(updated);
      saveLocalFilters(updated);
      await settingsDB.saveSetting("camera_filters", updated);
      setFilterFeedbackMsg(`🗑️ Filter "${target.name}" telah dihapus.`);
      setTimeout(() => setFilterFeedbackMsg(""), 3500);
    }
  };

  const handleOpenAddFilterModal = () => {
    setEditingFilterId(null);
    setFilterName("");
    setFilterEmoji("✨");
    setFilterDesc("");
    setFilterSliders({ ...DEFAULT_SLIDER_SETTINGS });
    setCustomCssMode(false);
    setCustomCssInput("");
    setFilterModalError("");
    setPreviewBeforeAfter(false);
    setShowFilterModal(true);
  };

  const handleOpenEditFilterModal = (filter: CameraFilter) => {
    setEditingFilterId(filter.id);
    setFilterName(filter.name);
    setFilterEmoji(filter.emoji);
    setFilterDesc(filter.desc);
    const parsed = parseFilterCss(filter.css);
    setFilterSliders(parsed);
    setCustomCssMode(false);
    setCustomCssInput(filter.css);
    setFilterModalError("");
    setPreviewBeforeAfter(false);
    setShowFilterModal(true);
  };

  const handleApplyPreset = (preset: typeof FILTER_PRESETS[0]) => {
    if (!editingFilterId) {
      setFilterName(preset.name);
      setFilterDesc(preset.desc);
    }
    setFilterEmoji(preset.emoji);
    setFilterSliders({ ...preset.sliders });
    setCustomCssMode(false);
  };

  const handleCopyCss = (id: string, css: string) => {
    navigator.clipboard?.writeText?.(css);
    setCopiedCssId(id);
    setTimeout(() => setCopiedCssId(null), 2000);
  };

  const handleSaveFilterModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterName.trim()) {
      setFilterModalError("Nama filter tidak boleh kosong!");
      return;
    }

    const finalCss = customCssMode ? (customCssInput.trim() || "none") : generateFilterCss(filterSliders);

    let updated: CameraFilter[];
    if (editingFilterId) {
      updated = filters.map((f) =>
        f.id === editingFilterId
          ? {
              ...f,
              name: filterName.trim(),
              emoji: filterEmoji.trim() || "✨",
              desc: filterDesc.trim() || "Filter foto kustom",
              css: finalCss,
            }
          : f
      );
    } else {
      const newFilter: CameraFilter = {
        id: "custom_" + Date.now(),
        name: filterName.trim(),
        emoji: filterEmoji.trim() || "✨",
        desc: filterDesc.trim() || "Filter foto kustom buatan admin",
        css: finalCss,
        enabled: true,
        isCustom: true,
      };
      updated = [...filters, newFilter];
    }

    setFilters(updated);
    saveLocalFilters(updated);
    await settingsDB.saveSetting("camera_filters", updated);
    setShowFilterModal(false);
    setFilterFeedbackMsg(
      editingFilterId
        ? `✅ Filter "${filterName.trim()}" berhasil diperbarui!`
        : `🎉 Filter baru "${filterName.trim()}" berhasil ditambahkan!`
    );
    setTimeout(() => setFilterFeedbackMsg(""), 3500);
  };

  // ── AI Effects Handlers (Dreambooth) ──
  const handleToggleAiEffect = (id: string, enabled: boolean) => {
    const updated = aiEffects.map((e) => (e.id === id ? { ...e, enabled } : e));
    setAiEffects(updated);
    saveLocalAiEffects(updated);
    const target = aiEffects.find((e) => e.id === id);
    setAiFeedbackMsg(
      enabled
        ? `✅ Efek AI "${target?.name || id}" diaktifkan di booth.`
        : `⏸️ Efek AI "${target?.name || id}" dinonaktifkan.`
    );
    setTimeout(() => setAiFeedbackMsg(""), 3500);
  };

  const handleDeleteAiEffect = (id: string) => {
    const target = aiEffects.find((e) => e.id === id);
    if (!target) return;
    if (confirm(`Hapus efek AI "${target.name}" secara permanen?`)) {
      const updated = aiEffects.filter((e) => e.id !== id);
      setAiEffects(updated);
      saveLocalAiEffects(updated);
      setAiFeedbackMsg(`🗑️ Efek AI "${target.name}" telah dihapus.`);
      setTimeout(() => setAiFeedbackMsg(""), 3500);
    }
  };

  const handleResetAiEffectsToDefault = () => {
    if (confirm("Kembalikan seluruh efek AI ke daftar standar Dreambooth asli? Efek kustom akan direset.")) {
      setAiEffects(DEFAULT_AI_EFFECTS);
      saveLocalAiEffects(DEFAULT_AI_EFFECTS);
      setAiFeedbackMsg("🔄 Seluruh efek AI telah dikembalikan ke standar Dreambooth.");
      setTimeout(() => setAiFeedbackMsg(""), 3500);
    }
  };

  const handleOpenAddAiEffectModal = () => {
    setEditingAiId(null);
    setAiName("");
    setAiEmoji("✨");
    setAiCategory("character");
    setAiDesc("");
    setAiPrompt("");
    setAiNegativePrompt("");
    setAiShaderType("3d_movie");
    setAiPreviewUrl("");
    setAiModalError("");
    setShowAiModal(true);
  };

  const handleOpenEditAiEffectModal = (eff: AiEffect) => {
    setEditingAiId(eff.id);
    setAiName(eff.name);
    setAiEmoji(eff.emoji);
    setAiCategory(eff.category);
    setAiDesc(eff.desc);
    setAiPrompt(eff.prompt || "");
    setAiNegativePrompt(eff.negativePrompt || "");
    setAiShaderType(eff.shaderType);
    setAiPreviewUrl(eff.previewUrl || "");
    setAiModalError("");
    setShowAiModal(true);
  };

  const handleSaveAiEffectModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiName.trim()) {
      setAiModalError("Nama efek AI tidak boleh kosong!");
      return;
    }

    const catLabels: Record<string, string> = {
      character: "Karakter 3D",
      formal: "Formal & Studio",
      retro: "Retro 2000-an",
      art: "Seni Lukis",
      game: "Mainan & Game",
    };

    let updated: AiEffect[];
    if (editingAiId) {
      updated = aiEffects.map((item) =>
        item.id === editingAiId
          ? {
              ...item,
              name: aiName.trim(),
              emoji: aiEmoji.trim() || "✨",
              category: aiCategory,
              categoryLabel: catLabels[aiCategory] || "Efek AI",
              desc: aiDesc.trim() || "Efek AI transformasi foto",
              prompt: aiPrompt.trim(),
              negativePrompt: aiNegativePrompt.trim(),
              shaderType: aiShaderType,
              previewUrl: aiPreviewUrl.trim() || item.previewUrl,
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : item
      );
    } else {
      const newEff: AiEffect = {
        id: "ai_custom_" + Date.now(),
        name: aiName.trim(),
        emoji: aiEmoji.trim() || "✨",
        category: aiCategory,
        categoryLabel: catLabels[aiCategory] || "Efek AI Kustom",
        desc: aiDesc.trim() || "Efek transformasi buatan admin",
        prompt: aiPrompt.trim(),
        negativePrompt: aiNegativePrompt.trim(),
        shaderType: aiShaderType,
        previewUrl: aiPreviewUrl.trim() || SAMPLE_PORTRAIT_URL,
        enabled: true,
        isCustom: true,
        author: "Admin Yodha",
        updatedAt: new Date().toISOString().split("T")[0],
      };
      updated = [...aiEffects, newEff];
    }

    setAiEffects(updated);
    saveLocalAiEffects(updated);
    setShowAiModal(false);
    setAiFeedbackMsg(
      editingAiId
        ? `✅ Efek AI "${aiName.trim()}" berhasil diperbarui!`
        : `🎉 Efek AI baru "${aiName.trim()}" berhasil ditambahkan!`
    );
    setTimeout(() => setAiFeedbackMsg(""), 3500);
  };

  const handleSaveAiProviderModal = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: AiProviderSettings = {
      mode: providerModeInput,
      apiKey: apiKeyInput.trim(),
      apiEndpoint: apiEndpointInput.trim(),
      modelName: modelNameInput.trim(),
      strength: strengthInput,
    };
    setAiProviderSettings(newSettings);
    saveAiProviderSettings(newSettings);
    setShowAiProviderModal(false);
    setAiFeedbackMsg("⚙️ Pengaturan Provider AI berhasil disimpan!");
    setTimeout(() => setAiFeedbackMsg(""), 3500);
  };

  const handleTestAiProvider = async () => {
    setIsTestingProvider(true);
    setProviderTestMsg(null);
    try {
      const res = await testAiProviderConnection({
        mode: providerModeInput,
        apiKey: apiKeyInput.trim(),
        apiEndpoint: apiEndpointInput.trim(),
        modelName: modelNameInput.trim(),
        strength: strengthInput,
      });
      setProviderTestMsg({ success: res.success, text: res.message });
    } catch (err: any) {
      setProviderTestMsg({ success: false, text: err.message || "Gagal menguji koneksi" });
    } finally {
      setIsTestingProvider(false);
    }
  };

  const handleOpenTestAiModal = (eff: AiEffect) => {
    setTestingAiEffect(eff);
    setTestResultImg(null);
    setTestCompareBefore(false);
    setShowAiTestModal(true);
    setTimeout(() => {
      runTestAiTransformation(eff, testSourceImg);
    }, 120);
  };

  const runTestAiTransformation = async (eff: AiEffect, imgSrc: string) => {
    setIsProcessingAiTest(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width || 600;
      canvas.height = img.naturalHeight || img.height || 800;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const transformedDataUrl = await applyAiStylization(canvas, eff, aiProviderSettings);
        setTestResultImg(transformedDataUrl);
      }
    } catch (err) {
      console.error("Test AI transform error:", err);
    } finally {
      setIsProcessingAiTest(false);
    }
  };

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
      // Auto-cleanup any sessions older than 30 days
      await sessionDB.cleanupOldSessions(30);
      const data = await sessionDB.getRecentSessions(50);
      setRecentSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const playPrintChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  // Auto-refresh sessions every 3.5 seconds so print queue updates in real-time
  useEffect(() => {
    if (!autoRefreshPrint) return;

    const interval = setInterval(async () => {
      try {
        const data = await sessionDB.getRecentSessions(50);
        setRecentSessions((prev) => {
          const prevPending = prev.filter((s) => s.print_status !== "printed").length;
          const newPending = data.filter((s) => s.print_status !== "printed").length;
          if (newPending > prevPending && soundAlertEnabled) {
            playPrintChime();
          }
          return data;
        });
      } catch {}
    }, 3500);

    return () => clearInterval(interval);
  }, [autoRefreshPrint, soundAlertEnabled]);

  const handlePrintSession = async (sess: PhotoboothSession, overrideCopies?: number) => {
    const numCopies = overrideCopies !== undefined ? overrideCopies : (editCopiesMap[sess.session_code] || sess.print_copies || 1);
    setPrintingSessionCode(sess.session_code);
    try {
      await printPhotoStrip(sess.strip_url, sess.layout, numCopies);
      await sessionDB.updateSession(sess.session_code, {
        print_status: "printed",
        printed_at: new Date().toISOString(),
        print_copies: numCopies,
      });
      const fresh = await sessionDB.getRecentSessions(50);
      setRecentSessions(fresh);
      setActionStatus(`Foto #${sess.session_code} berhasil dicetak (${numCopies} rangkap).`);
      setTimeout(() => setActionStatus(""), 4000);
    } catch (err) {
      console.error("Gagal mencetak:", err);
      alert("Gagal memproses cetak. Pastikan printer terhubung.");
    } finally {
      setPrintingSessionCode(null);
    }
  };

  const handleMarkAsPrinted = async (sess: PhotoboothSession) => {
    await sessionDB.updateSession(sess.session_code, {
      print_status: "printed",
      printed_at: new Date().toISOString(),
    });
    const fresh = await sessionDB.getRecentSessions(50);
    setRecentSessions(fresh);
    setActionStatus(`Sesi #${sess.session_code} ditandai selesai dicetak.`);
    setTimeout(() => setActionStatus(""), 3500);
  };

  const handleMoveToPending = async (sess: PhotoboothSession) => {
    await sessionDB.updateSession(sess.session_code, {
      print_status: "pending",
    });
    const fresh = await sessionDB.getRecentSessions(50);
    setRecentSessions(fresh);
    setActionStatus(`Sesi #${sess.session_code} dikembalikan ke antrian cetak.`);
    setTimeout(() => setActionStatus(""), 3500);
  };

  const handleDeleteSessionItem = async (sess: PhotoboothSession) => {
    if (!window.confirm(`Hapus sesi #${sess.session_code} dari sistem?`)) return;
    await sessionDB.deleteSession(sess.session_code);
    const fresh = await sessionDB.getRecentSessions(50);
    setRecentSessions(fresh);
    setActionStatus(`Sesi #${sess.session_code} berhasil dihapus.`);
    setTimeout(() => setActionStatus(""), 3500);
  };

  // ── Financial / Keuangan Handlers ──
  const loadFinanceTransactions = async () => {
    setFinanceLoading(true);
    try {
      const data = await financeDB.getTransactions();
      setFinanceTransactions(data);
    } catch (e) {
      console.error("Gagal memuat transaksi keuangan:", e);
    } finally {
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceTransactions();
  }, []);

  const totalIncome = financeTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = financeTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayIncome = financeTransactions
    .filter((t) => t.type === "income" && t.date.startsWith(todayStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const handleOpenAddIncomeModal = () => {
    setEditingFinanceId(null);
    setTxType("income");
    setTxAmount("");
    setTxCategory("photo_session");
    setTxPaymentMethod("qris");
    setTxDescription("Sesi Foto Booth");
    setTxNotes("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxSessionCode("");
    setTxModalError("");
    setShowFinanceModal(true);
  };

  const handleOpenAddExpenseModal = () => {
    setEditingFinanceId(null);
    setTxType("expense");
    setTxAmount("");
    setTxCategory("paper_ribbon");
    setTxPaymentMethod("cash");
    setTxDescription("");
    setTxNotes("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxSessionCode("");
    setTxModalError("");
    setShowFinanceModal(true);
  };

  const handleOpenEditFinanceModal = (tx: FinanceTransaction) => {
    setEditingFinanceId(tx.id);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxCategory(tx.category);
    setTxPaymentMethod(tx.paymentMethod);
    setTxDescription(tx.description);
    setTxNotes(tx.notes || "");
    setTxDate(tx.date || new Date().toISOString().split("T")[0]);
    setTxSessionCode(tx.sessionCode || "");
    setTxModalError("");
    setShowFinanceModal(true);
  };

  const handleSaveFinanceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount.replace(/[^0-9]/g, ""));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxModalError("Nominal transaksi harus berupa angka lebih dari 0!");
      return;
    }
    if (!txDescription.trim()) {
      setTxModalError("Keterangan transaksi tidak boleh kosong!");
      return;
    }

    try {
      if (editingFinanceId) {
        await financeDB.updateTransaction(editingFinanceId, {
          type: txType,
          amount: parsedAmount,
          category: txCategory,
          paymentMethod: txPaymentMethod,
          description: txDescription.trim(),
          notes: txNotes.trim(),
          date: txDate,
          sessionCode: txSessionCode.trim() || undefined,
        });
        setActionStatus(`Transaksi berhasil diperbarui.`);
      } else {
        await financeDB.saveTransaction({
          type: txType,
          amount: parsedAmount,
          category: txCategory,
          paymentMethod: txPaymentMethod,
          description: txDescription.trim(),
          notes: txNotes.trim(),
          date: txDate,
          sessionCode: txSessionCode.trim() || undefined,
        });
        setActionStatus(`${txType === "income" ? "Pemasukan" : "Pengeluaran"} sebesar ${formatRupiah(parsedAmount)} berhasil dicatat.`);
      }
      setShowFinanceModal(false);
      await loadFinanceTransactions();
      setTimeout(() => setActionStatus(""), 3500);
    } catch (err) {
      console.error(err);
      setTxModalError("Gagal menyimpan transaksi keuangan.");
    }
  };

  const handleDeleteFinanceTransaction = async (id: string) => {
    if (!window.confirm("Hapus catatan transaksi keuangan ini?")) return;
    try {
      await financeDB.deleteTransaction(id);
      await loadFinanceTransactions();
      setActionStatus("Transaksi keuangan berhasil dihapus.");
      setTimeout(() => setActionStatus(""), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportFinanceCSV = () => {
    if (financeTransactions.length === 0) {
      alert("Belum ada data transaksi keuangan untuk diekspor.");
      return;
    }
    const headers = ["ID", "Tanggal", "Tipe", "Kategori", "Keterangan", "Metode Pembayaran", "Nominal (Rp)", "Kode Sesi", "Catatan"];
    const rows = financeTransactions.map((t) => [
      t.id,
      t.date,
      t.type === "income" ? "Pemasukan" : "Pengeluaran",
      getCategoryInfo(t.category).label,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      getPaymentMethodInfo(t.paymentMethod).label,
      t.amount,
      t.sessionCode || "-",
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan-keuangan-yodhabooth-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Camera preview in Devices tab
  useEffect(() => {
    if (activeNav === "devices") {
      const constraints: MediaStreamConstraints = {
        video: selectedDevice
          ? { deviceId: { exact: selectedDevice }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } },
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

  const handleZoomChange = (val: number) => {
    const clamped = Math.max(0.65, Math.min(1.35, Math.round(val * 100) / 100));
    setCameraZoom(clamped);
    settingsDB.saveSetting("camera_zoom", clamped);
    localStorage.setItem("yodha_camera_zoom", String(clamped));
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
    setSupabaseSavedMsg("Kredensial Supabase berhasil disimpan!");
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
    setPinChangeMsg("PIN Admin berhasil diperbarui!");
    setTimeout(() => setPinChangeMsg(""), 4000);
  };

  const handleSaveXendit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(xenditPriceInput.replace(/\D/g, ""), 10) || 35000;
    const newConfig: XenditConfig = {
      apiKey: xenditApiKeyInput.trim(),
      paymentEnabled: xenditPaymentEnabled,
      price: priceNum,
    };
    await saveXenditConfig(newConfig);
    setXenditConfig(newConfig);
    setXenditSavedMsg("Pengaturan pembayaran Xendit berhasil disimpan!");
    setTimeout(() => setXenditSavedMsg(""), 3500);
  };

  const handleToggleXenditPayment = async () => {
    const nextState = !xenditPaymentEnabled;
    setXenditPaymentEnabled(nextState);
    const priceNum = parseInt(xenditPriceInput.replace(/\D/g, ""), 10) || 35000;
    const newConfig: XenditConfig = {
      apiKey: xenditApiKeyInput.trim(),
      paymentEnabled: nextState,
      price: priceNum,
    };
    await saveXenditConfig(newConfig);
    setXenditConfig(newConfig);
    setXenditSavedMsg(nextState ? "Pembayaran QRIS diaktifkan (muncul di bilik foto)" : "Pembayaran QRIS dinonaktifkan (bilik foto langsung gratis)");
    setTimeout(() => setXenditSavedMsg(""), 3500);
  };

  const handleTestXendit = async () => {
    setXenditTesting(true);
    setXenditTestResult(null);
    try {
      const res = await testXenditConnection(xenditApiKeyInput.trim());
      setXenditTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setXenditTestResult({ success: false, message: err.message || "Gagal menguji koneksi Xendit" });
    } finally {
      setXenditTesting(false);
    }
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
            // Filter realistic photo holes (min 6% width, min 3% height, min 0.5% area to detect circles, stars, hexagons, wavy shapes)
            if (w >= width * 0.06 && h >= height * 0.03 && area >= (width * height) * 0.005 && w < width * 0.98 && h < height * 0.98) {
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

    // Automatically create photo boxes for all detected holes (circles, stars, hexagons, wavy, rectangles)
    if (holes.length > 0 && workingCanvasRef.current) {
      const origW = workingCanvasRef.current.width;
      const origH = workingCanvasRef.current.height;
      if (origW > 0 && origH > 0) {
        const autoBoxes: PhotoBox[] = holes.map((hl, i) => {
          const bx = (hl.x / origW) * 100;
          const by = (hl.y / origH) * 100;
          const bw = (hl.w / origW) * 100;
          const bh = (hl.h / origH) * 100;

          // Add slight 1.5% bleed so circular, star, wavy edges fit seamlessly behind the frame overlay
          const bleedX = Math.min(1.5, bw * 0.03);
          const bleedY = Math.min(1.5, bh * 0.03);
          const fx = Math.max(0, bx - bleedX);
          const fy = Math.max(0, by - bleedY);
          const fw = Math.min(100 - fx, bw + bleedX * 2);
          const fh = Math.min(100 - fy, bh + bleedY * 2);

          return {
            id: `box_${i + 1}`,
            x: Math.round(fx * 10) / 10,
            y: Math.round(fy * 10) / 10,
            w: Math.round(fw * 10) / 10,
            h: Math.round(fh * 10) / 10,
          };
        });

        setPhotoBoxes(autoBoxes);
        if (autoBoxes.length > 0) {
          setSelectedBoxId(autoBoxes[0].id);
        }
      }
    }

    if (holes.length === 4) {
      setNewLayout("2x2");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 4 lubang foto! Posisi penanda otomatis terpasang.");
    } else if (holes.length === 3) {
      setNewLayout("3x1");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 3 lubang foto! Posisi penanda otomatis terpasang.");
    } else if (holes.length === 6) {
      setNewLayout("3x2");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 6 lubang foto! Posisi penanda otomatis terpasang.");
    } else if (holes.length === 2) {
      setNewLayout("2x1");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 2 lubang foto! Posisi penanda otomatis terpasang.");
    } else if (holes.length === 1) {
      setNewLayout("1x1");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 1 lubang foto! Posisi penanda otomatis terpasang.");
    } else if (holes.length === 8) {
      setNewLayout("4x2");
      setNewPreset("auto");
      setActionStatus("🎉 Terdeteksi 8 lubang foto! Posisi penanda otomatis terpasang.");
    } else if (holes.length > 0) {
      if (holes.length <= 4) setNewLayout("2x2");
      else setNewLayout("3x2");
      setNewPreset("auto");
      setActionStatus(`🎉 Terdeteksi ${holes.length} lubang foto! Semua kotak penanda otomatis terpasang.`);
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
            const boxes: PhotoBox[] = holes.map((hole, i) => ({
              id: `box_${i + 1}`,
              x: Math.round((hole.x / w) * 1000) / 10,
              y: Math.round((hole.y / h) * 1000) / 10,
              w: Math.round((hole.w / w) * 1000) / 10,
              h: Math.round((hole.h / h) * 1000) / 10,
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

  // Strictly bounded erase inside a single photo box — CANNOT touch background or artwork outside box
  const boundedEraseInsideBox = (
    canvas: HTMLCanvasElement,
    box: PhotoBox,
    tolerance: number
  ) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Pixel bounds of the box
    const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
    const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
    const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
    const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample box center
    const cx = Math.floor(bx + bw / 2);
    const cy = Math.floor(by + bh / 2);
    const centerIdx = (cy * width + cx) * 4;

    const sr = data[centerIdx];
    const sg = data[centerIdx + 1];
    const sb = data[centerIdx + 2];
    const sa = data[centerIdx + 3];

    const maxDist = 441.67;
    const threshold = (tolerance / 100) * maxDist;

    // Is center pixel a valid candidate (white, near white, light gray, or chroma)?
    const isCenterTarget =
      sa > 40 &&
      ((sr > 190 && sg > 190 && sb > 190) ||
        (sg > 160 && sr < 140 && sb < 140) ||
        Math.sqrt((sr - hexToRgb(chromaColor).r) ** 2 + (sg - hexToRgb(chromaColor).g) ** 2 + (sb - hexToRgb(chromaColor).b) ** 2) <= threshold);

    if (sa > 0 && isCenterTarget) {
      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(bw * bh * 2);
      let head = 0;
      let tail = 0;

      queue[tail++] = cx;
      queue[tail++] = cy;
      visited[cy * width + cx] = 1;

      while (head < tail) {
        const px = queue[head++];
        const py = queue[head++];
        const idx = (py * width + px) * 4;

        data[idx + 3] = 0; // Erase to transparent

        const neighbors = [
          px + 1, py,
          px - 1, py,
          px, py + 1,
          px, py - 1,
        ];

        for (let i = 0; i < 8; i += 2) {
          const nx = neighbors[i];
          const ny = neighbors[i + 1];

          // STRICT CLAMP TO BOX BOUNDS ONLY: NEVER TOUCH ANYTHING OUTSIDE!
          if (nx >= bx && nx < bx + bw && ny >= by && ny < by + bh) {
            const pIdx = ny * width + nx;
            if (!visited[pIdx]) {
              visited[pIdx] = 1;
              const nDataIdx = pIdx * 4;
              const na = data[nDataIdx + 3];

              if (na > 0) {
                const nr = data[nDataIdx];
                const ng = data[nDataIdx + 1];
                const nb = data[nDataIdx + 2];

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
    } else {
      // Safe punch of white / light chroma pixels inside the box (preserving 2% outer frame rim)
      const insetX = Math.max(1, Math.round(bw * 0.02));
      const insetY = Math.max(1, Math.round(bh * 0.02));
      for (let y = by + insetY; y < by + bh - insetY; y++) {
        for (let x = bx + insetX; x < bx + bw - insetX; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a > 0) {
            if ((r > 195 && g > 195 && b > 195) || (g > 150 && r < 140 && b < 140)) {
              data[idx + 3] = 0;
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // ── Auto-Scan & Erase Background (Deteksi & Hapus Otomatis) ───────────
  const handleAutoScanErase = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const canvas = workingCanvasRef.current;

    // Save history for Undo
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const targetBoxes = photoBoxes.length > 0 ? photoBoxes : getDefaultBoxesForLayout(newLayout);

    targetBoxes.forEach((box) => {
      boundedEraseInsideBox(canvas, box, chromaTolerance);
    });

    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    const holes = detectHolesFromCanvas(canvas);
    applyHolesToLayout(holes);

    setActionStatus(`✨ Scan otomatis selesai! Berhasil melubangi area ${targetBoxes.length} kotak foto tanpa merusak background bingkai.`);
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

  // Auto detect all transparent holes and place photo boxes automatically
  const handleAutoDetectAndPlaceBoxes = () => {
    if (!workingCanvasRef.current || !activeCanvasData) {
      setActionStatus("⚠️ Muat gambar bingkai terlebih dahulu.");
      return;
    }
    const canvas = workingCanvasRef.current;
    const holes = detectHolesFromCanvas(canvas);
    if (holes.length === 0) {
      setActionStatus("⚠️ Belum ada lubang transparan terdeteksi. Silakan gunakan 'Hapus Hijau', 'Hapus Putih', atau 'Magic Wand' terlebih dahulu.");
      return;
    }
    applyHolesToLayout(holes);
    setInteractionMode("boxes");
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

            <button
              onClick={() => setActiveNav("print")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "print"
                  ? "bg-amber-50 text-amber-800 font-bold shadow-xs border border-amber-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Antrian Cetak & Riwayat Print Foto"
            >
              <Printer className="w-4 h-4 shrink-0 text-amber-500" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Antrian Cetak</span>
                  {recentSessions.filter((s) => s.print_status !== "printed").length > 0 ? (
                    <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse shadow-xs">
                      {recentSessions.filter((s) => s.print_status !== "printed").length} Antri
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                      {recentSessions.filter((s) => s.print_status === "printed").length}
                    </span>
                  )}
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveNav("finance")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeNav === "finance"
                  ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title="Pencatatan Keuangan, Pemasukan & Pengeluaran"
            >
              <Wallet className="w-4 h-4 shrink-0 text-emerald-600" />
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Keuangan & Kas</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    netBalance >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                  }`}>
                    {formatRupiah(netBalance)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
                    <span className="text-[11px] text-slate-400 font-medium">Dari {templates.length} bingkai</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Frame className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveNav("print");
                    setPrintTab("pending");
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-sm transition-all group"
                  title="Klik untuk lihat antrian cetak foto"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                      Antrian Cetak
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                      <span>{recentSessions.filter((s) => s.print_status !== "printed").length}</span>
                      {recentSessions.filter((s) => s.print_status !== "printed").length > 0 && (
                        <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                          Antri
                        </span>
                      )}
                    </h3>
                    <span className="text-[11px] text-amber-700 font-medium">Menunggu dicetak</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Printer className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveNav("print");
                    setPrintTab("history");
                  }}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
                  title="Klik untuk lihat riwayat cetak"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                      Sudah Dicetak
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      {recentSessions.filter((s) => s.print_status === "printed").length}
                    </h3>
                    <span className="text-[11px] text-blue-600 font-medium">Riwayat cetak selesai</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Cloud</p>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{dbConfigured ? "Supabase Cloud" : "Local DB"}</h3>
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

              {/* Finance Quick Summary Bar */}
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Saldo Kas & Keuangan</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {financeTransactions.length} Transaksi
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3 mt-0.5 flex-wrap">
                      <h3 className="text-2xl font-black text-slate-900">{formatRupiah(netBalance)}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="text-emerald-600 font-bold">Masuk: +{formatRupiah(totalIncome)}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-rose-600 font-bold">Keluar: -{formatRupiah(totalExpense)}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-amber-700 font-bold">Hari Ini: +{formatRupiah(todayIncome)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenAddIncomeModal}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Pemasukan</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddExpenseModal}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Pengeluaran</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("finance")}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Buku Kas</span>
                  </button>
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

          {/* ──────────────── TAB: MANAJEMEN FILTER KAMERA ──────────────── */}
          {activeNav === "filters" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header with Title & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">Manajemen Filter Kamera</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                      {filters.filter((f) => f.enabled !== false).length} Aktif di Kiosk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atur filter foto yang dapat dipilih oleh pengunjung saat foto booth, sesuaikan efek visual, atau tambahkan filter racikan kustom.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetFiltersToDefault}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Kembalikan ke 6 filter standar"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset ke Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddFilterModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Filter Baru</span>
                  </button>
                </div>
              </div>

              {/* Feedback toast notification if any */}
              {filterFeedbackMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{filterFeedbackMsg}</span>
                </div>
              )}

              {/* Filter Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filters.map((f) => {
                  const isEnabled = f.enabled !== false;
                  return (
                    <div
                      key={f.id}
                      className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                        isEnabled ? "border-slate-200/90" : "border-slate-200 bg-slate-50/60 opacity-80"
                      }`}
                    >
                      <div className="p-4 space-y-3.5">
                        {/* Card Header: Emoji, Name, Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xl shrink-0 shadow-xs">
                              {f.emoji || "✨"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">
                                {f.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                {f.desc || "Filter foto booth"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isEnabled
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {isEnabled ? "Aktif" : "Nonaktif"}
                            </span>
                            {f.isCustom ? (
                              <span className="text-[9px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200">
                                Kustom
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold bg-slate-50 text-slate-500 px-1.5 py-0.2 rounded border border-slate-200">
                                Bawaan
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Visual Preview Box */}
                        <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group flex items-center justify-center">
                          <img
                            src={SAMPLE_PORTRAIT_URL}
                            alt={f.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = yodhaLogo;
                            }}
                            className="w-full h-full object-cover transition-all duration-300"
                            style={{ filter: f.css }}
                          />

                          {/* CSS Indicator Pill */}
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium border border-white/10 flex items-center gap-1">
                            <span>{f.emoji}</span>
                            <span>{f.css === "none" ? "Normal" : "Efek Aktif"}</span>
                          </div>

                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-amber-300 font-mono text-[9px]">
                              Live Preview
                            </span>
                          </div>
                        </div>

                        {/* CSS Code Display with Copy Button */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                              Kode Efek CSS:
                            </span>
                            <p
                              className="font-mono text-[10px] text-slate-700 truncate select-all"
                              title={f.css}
                            >
                              {f.css}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCss(f.id, f.css)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors shrink-0 cursor-pointer shadow-2xs"
                            title="Salin CSS ke Clipboard"
                          >
                            {copiedCssId === f.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Card Footer: Toggle and Action Buttons */}
                      <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Switch ON/OFF */}
                        <button
                          type="button"
                          onClick={() => handleToggleFilter(f.id, !isEnabled)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                            isEnabled
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          }`}
                        >
                          {isEnabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          <span>{isEnabled ? "Aktif di Booth" : "Nonaktif"}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditFilterModal(f)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                          title="Edit Efek & Slider Filter Ini"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button (Only for custom filters) */}
                        {f.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFilter(f.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                            title="Hapus Filter Kustom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Helpful Information / Guidance Card */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-pink-50 rounded-2xl border border-indigo-100 p-5 space-y-2">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>Tips Filter Photobooth & Live Rendering</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Semua filter kamera yang berstatus <strong>Aktif</strong> akan otomatis ditampilkan pada menu pemilihan filter pengunjung di layar Booth. Efek warna filter diproses secara real-time menggunakan akselerasi grafis perangkat (GPU), sehingga foto yang diambil maupun cetakan photo strip akan memiliki warna yang konsisten dan memukau.
                </p>
              </div>
            </div>
          )}

          {/* ──────────────── TAB: EFEK AI (DREAMBOOTH) ──────────────── */}
          {activeNav === "ai" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Feedback toast notification */}
              {aiFeedbackMsg && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl text-xs font-bold text-violet-800 flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
                  <Wand2 className="w-4 h-4 text-violet-600 shrink-0" />
                  <span>{aiFeedbackMsg}</span>
                </div>
              )}

              {/* Header: Title, Description & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">Koleksi Efek AI Photobooth</h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-violet-100 to-pink-100 text-violet-800 border border-violet-200">
                      <Sparkles className="w-3 h-3 text-pink-500" />
                      <span>Dreambooth AI Studio</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Koleksi efek transformasi AI untuk pengunjung kiosk: Karakter 3D Pixar, Pas Foto Jas Formal, Y2K Flash, Lukisan Cat Air, Sketsa Pensil, dan Anime.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Provider Settings Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setProviderModeInput(aiProviderSettings.mode);
                      setApiKeyInput(aiProviderSettings.apiKey || "");
                      setApiEndpointInput(aiProviderSettings.apiEndpoint || "");
                      setModelNameInput(aiProviderSettings.modelName || "fal-ai/fast-sdxl/image-to-image");
                      setStrengthInput(aiProviderSettings.strength || 0.80);
                      setProviderTestMsg(null);
                      setShowAiProviderModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
                    title="Pengaturan Engine Provider AI"
                  >
                    <Sliders className="w-3.5 h-3.5 text-violet-600" />
                    <span>
                      Engine:{" "}
                      {aiProviderSettings.mode === "client"
                        ? "Offline Shaders"
                        : aiProviderSettings.mode === "fal"
                        ? "Fal.ai Cloud"
                        : aiProviderSettings.mode === "replicate"
                        ? "Replicate Cloud"
                        : "Custom Webhook"}
                    </span>
                  </button>

                  {/* Reset Defaults Button */}
                  <button
                    type="button"
                    onClick={handleResetAiEffectsToDefault}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
                    title="Kembalikan semua efek ke standar Dreambooth"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Standar</span>
                  </button>

                  {/* Add Custom AI Effect Button */}
                  <button
                    type="button"
                    onClick={handleOpenAddAiEffectModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Efek AI</span>
                  </button>
                </div>
              </div>

              {/* Engine Status / Feature Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50 to-pink-50 border border-violet-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/20">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Mesin Transformasi AI Aktif:</span>
                      <span className="text-violet-700 font-extrabold underline decoration-violet-300">
                        {aiProviderSettings.mode === "client"
                          ? "Client-Side Neural Shaders (100% Cepat & Offline)"
                          : "Generative Cloud API"}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {aiProviderSettings.mode === "client"
                        ? "Memproses foto secara instan di browser/kiosk tanpa kuota API eksternal. Mendukung sketsa pensil, lukisan cat air, pop art, Y2K flash, dan karakter 3D."
                        : "Terhubung dengan API eksternal untuk model image-to-image."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <span className="text-[11px] font-bold text-violet-700 bg-white/80 px-2.5 py-1 rounded-lg border border-violet-200">
                    {aiEffects.filter((e) => e.enabled).length} Efek Aktif di Booth
                  </span>
                </div>
              </div>

              {/* Filter Pills & Search Bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
                  {[
                    { id: "all", label: "Semua Efek", count: aiEffects.length },
                    { id: "character", label: "🧸 Karakter 3D & Anime", count: aiEffects.filter(e => e.category === "character").length },
                    { id: "formal", label: "👔 Formal & Studio", count: aiEffects.filter(e => e.category === "formal").length },
                    { id: "retro", label: "⚡ Retro & Y2K", count: aiEffects.filter(e => e.category === "retro").length },
                    { id: "art", label: "🎨 Seni Lukis & Sketsa", count: aiEffects.filter(e => e.category === "art").length },
                    { id: "game", label: "🎮 Mainan & Game", count: aiEffects.filter(e => e.category === "game").length },
                  ].map((cat) => {
                    const isSelected = aiCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAiCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? "bg-violet-600 text-white shadow-sm font-bold"
                            : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    placeholder="Cari efek AI atau prompt..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* AI Effects Grid (Dreambooth Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {aiEffects
                  .filter((eff) => {
                    const matchCategory = aiCategoryFilter === "all" || eff.category === aiCategoryFilter;
                    const q = aiSearchQuery.toLowerCase().trim();
                    const matchQuery =
                      !q ||
                      eff.name.toLowerCase().includes(q) ||
                      eff.desc.toLowerCase().includes(q) ||
                      eff.prompt?.toLowerCase().includes(q);
                    return matchCategory && matchQuery;
                  })
                  .map((eff) => {
                    const isEnabled = eff.enabled !== false;
                    return (
                      <div
                        key={eff.id}
                        className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                          isEnabled ? "border-slate-200/90" : "border-slate-200 bg-slate-50/60 opacity-80"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Card Preview Image with Badges */}
                          <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden group">
                            <img
                              src={eff.previewUrl}
                              alt={eff.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = SAMPLE_PORTRAIT_URL;
                              }}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />

                            {/* Category Pill on Top-Left */}
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 flex items-center gap-1 shadow-xs">
                              <span>{eff.emoji || "✨"}</span>
                              <span>{eff.categoryLabel}</span>
                            </div>

                            {/* Status Pill on Top-Right */}
                            <div className="absolute top-2.5 right-2.5">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs ${
                                  isEnabled
                                    ? "bg-emerald-500 text-white"
                                    : "bg-black/60 text-slate-200 backdrop-blur-xs"
                                }`}
                              >
                                {isEnabled ? "Aktif di Booth" : "Nonaktif"}
                              </span>
                            </div>

                            {/* Hover Quick Test Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                              <span className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-xs text-slate-900 font-bold text-xs shadow-md">
                                Pratinjau Efek AI
                              </span>
                            </div>
                          </div>

                          {/* Card Content: Title, Meta, Desc */}
                          <div className="p-4 space-y-2.5">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                {eff.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                Terakhir diubah: {eff.updatedAt || "2026-08-19"} · {eff.author || "Dreambooth AI"}
                              </p>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {eff.desc}
                            </p>

                            {/* Prompt Tag Pill */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex items-center justify-between gap-1.5">
                              <p className="text-[10px] font-mono text-slate-600 truncate flex-1" title={eff.prompt}>
                                <span className="font-bold text-violet-600">Prompt:</span> {eff.prompt}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText?.(eff.prompt);
                                  setAiFeedbackMsg(`📋 Prompt "${eff.name}" disalin ke clipboard!`);
                                  setTimeout(() => setAiFeedbackMsg(""), 3000);
                                }}
                                className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-violet-600 transition-colors cursor-pointer"
                                title="Salin Prompt"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Primary DreamBooth Button ("Salin ke efek saya" / Aktifkan) */}
                        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 space-y-2">
                          {/* Dreambooth primary blue action button */}
                          <button
                            type="button"
                            onClick={() => handleToggleAiEffect(eff.id, !isEnabled)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                              isEnabled
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                            }`}
                          >
                            {isEnabled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            <span>{isEnabled ? "Salin ke efek saya (Aktif)" : "Gunakan di Booth"}</span>
                          </button>

                          {/* Secondary buttons: Test, Edit, Delete */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenTestAiModal(eff)}
                              className="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                              title="Uji coba efek AI pada foto contoh atau kamera"
                            >
                              <Sparkles className="w-3 h-3 text-violet-600" />
                              <span>Uji Coba AI</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditAiEffectModal(eff)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Edit Prompt & Pengaturan"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {eff.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAiEffect(eff.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Hapus Efek Kustom"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: GALERI FOTO SESI ──────────────── */}
          {activeNav === "gallery" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">Galeri Riwayat Sesi Foto</h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>Hapus Otomatis 30 Hari Aktif</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hasil pemotretan pengunjung tersimpan aman di Cloud Storage dan otomatis dibersihkan setiap 30 hari.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setLoadingSessions(true);
                      const deleted = await sessionDB.cleanupOldSessions(30);
                      const data = await sessionDB.getRecentSessions(50);
                      setRecentSessions(data);
                      setLoadingSessions(false);
                      setActionStatus(
                        deleted > 0
                          ? `🧹 Berhasil menghapus ${deleted} foto sesi yang berusia lebih dari 30 hari.`
                          : "✅ Seluruh foto masih dalam masa retensi (kurang dari 30 hari)."
                      );
                    }}
                    disabled={loadingSessions}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Pindai dan hapus foto yang sudah lewat dari 30 hari"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Bersihkan &gt; 30 Hari</span>
                  </button>

                  <button
                    onClick={loadSessions}
                    disabled={loadingSessions}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? "animate-spin" : ""}`} />
                    <span>Segarkan</span>
                  </button>
                </div>
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
                            {s.raw_photos.length} Foto Asli (Raw)
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

          {/* ──────────────── TAB: ANTRIAN & RIWAYAT CETAK (PRINT) ──────────────── */}
          {activeNav === "print" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span>Antrian & Riwayat Cetak Foto</span>
                    </h2>
                    {recentSessions.filter((s) => s.print_status !== "printed").length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{recentSessions.filter((s) => s.print_status !== "printed").length} Foto Menunggu Dicetak</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Antrian Kosong (Semua Selesai)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Foto yang selesai dipotret pengunjung di booth akan otomatis masuk antrian di sini untuk dicetak ke printer.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sound Alert Toggle */}
                  <button
                    type="button"
                    onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      soundAlertEnabled
                        ? "bg-amber-50 border-amber-300 text-amber-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                    title={soundAlertEnabled ? "Bunyikan nada saat ada foto baru" : "Nada dering dinonaktifkan"}
                  >
                    {soundAlertEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
                    <span>{soundAlertEnabled ? "Nada Dering: Aktif" : "Mute"}</span>
                  </button>

                  {/* Auto-Refresh Toggle */}
                  <button
                    type="button"
                    onClick={() => setAutoRefreshPrint(!autoRefreshPrint)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      autoRefreshPrint
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                    title="Memperbarui data antrian otomatis tiap 3.5 detik"
                  >
                    <span className={`w-2 h-2 rounded-full ${autoRefreshPrint ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
                    <span>{autoRefreshPrint ? "Live (Auto-Refresh)" : "Jeda"}</span>
                  </button>

                  {/* Manual Refresh */}
                  <button
                    type="button"
                    onClick={loadSessions}
                    disabled={loadingSessions}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? "animate-spin text-blue-600" : ""}`} />
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs & Search Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintTab("pending")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      printTab === "pending"
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Menunggu Cetak</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        printTab === "pending" ? "bg-black/20 text-white" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {recentSessions.filter((s) => s.print_status !== "printed").length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintTab("history")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      printTab === "history"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Riwayat Sudah Dicetak</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        printTab === "history" ? "bg-black/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {recentSessions.filter((s) => s.print_status === "printed").length}
                    </span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari kode sesi atau layout..."
                    value={printSearchQuery}
                    onChange={(e) => setPrintSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {printSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPrintSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* ── SUB-TAB 1: ANTRIAN MENUNGGU DICETAK ── */}
              {printTab === "pending" && (
                <div className="space-y-4">
                  {(() => {
                    const pendingList = recentSessions.filter((s) => {
                      const isPending = s.print_status !== "printed";
                      if (!isPending) return false;
                      if (!printSearchQuery.trim()) return true;
                      const q = printSearchQuery.toLowerCase();
                      return (
                        s.session_code.toLowerCase().includes(q) ||
                        (s.layout && s.layout.toLowerCase().includes(q))
                      );
                    });

                    if (pendingList.length === 0) {
                      return (
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-3 shadow-xs">
                          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                            <Printer className="w-8 h-8 text-amber-500" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">
                            {printSearchQuery ? "Tidak ditemukan antrian yang cocok" : "Tidak Ada Antrian Cetak"}
                          </h3>
                          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            {printSearchQuery
                              ? "Coba gunakan kata kunci pencarian kode sesi yang lain."
                              : "Saat pengunjung menyelesaikan pemotretan di booth dan menekan 'Selesai & Cetak', foto akan langsung otomatis muncul di sini untuk dicetak."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {pendingList.map((s, idx) => {
                          const currentCopies = editCopiesMap[s.session_code] || s.print_copies || 1;
                          const sizeInfo = PRINT_SIZES[s.layout] || { w: 10, h: 15, label: "10×15 cm" };
                          const isPrintingThis = printingSessionCode === s.session_code;

                          return (
                            <div
                              key={s.id || s.session_code || idx}
                              className="bg-white rounded-2xl border-2 border-amber-300 shadow-md p-4 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all hover:shadow-lg"
                            >
                              {/* Top Banner Tag */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                                    Menunggu Dicetak
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                  #{s.session_code}
                                </span>
                              </div>

                              {/* Main Card Content */}
                              <div className="flex gap-4 items-start">
                                {/* Thumbnail Image with Click to Zoom */}
                                <div
                                  onClick={() => setSelectedPreviewStrip(s)}
                                  className="w-28 sm:w-32 aspect-[2/3] bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-200 shrink-0 relative cursor-pointer group shadow-inner"
                                  title="Klik untuk pratinjau resolusi penuh"
                                >
                                  {s.strip_url ? (
                                    <img
                                      src={s.strip_url}
                                      alt={`Foto #${s.session_code}`}
                                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                                      No Img
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                    <Eye className="w-4 h-4" />
                                    <span>Zoom</span>
                                  </div>
                                </div>

                                {/* Metadata and Details */}
                                <div className="flex-1 space-y-2 text-xs">
                                  <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                      Layout & Format
                                    </span>
                                    <p className="font-bold text-slate-900 text-sm">{s.layout}</p>
                                    <p className="text-[11px] text-slate-500">{sizeInfo.label}</p>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                      Waktu Sesi
                                    </span>
                                    <p className="text-[11px] text-slate-700 font-medium">
                                      {s.created_at
                                        ? new Date(s.created_at).toLocaleTimeString("id-ID", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                          }) + " WIB"
                                        : "Baru saja"}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : ""}
                                    </p>
                                  </div>

                                  {/* Print Copies Counter */}
                                  <div className="pt-1">
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                      Jumlah Rangkap Cetak:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditCopiesMap((prev) => ({
                                            ...prev,
                                            [s.session_code]: Math.max(1, currentCopies - 1),
                                          }))
                                        }
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black flex items-center justify-center cursor-pointer text-sm shadow-xs"
                                        title="Kurangi rangkap"
                                      >
                                        -
                                      </button>
                                      <span className="font-mono font-bold text-sm text-slate-900 w-6 text-center">
                                        {currentCopies}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditCopiesMap((prev) => ({
                                            ...prev,
                                            [s.session_code]: Math.min(10, currentCopies + 1),
                                          }))
                                        }
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black flex items-center justify-center cursor-pointer text-sm shadow-xs"
                                        title="Tambah rangkap"
                                      >
                                        +
                                      </button>
                                      <span className="text-[10px] text-slate-500 font-medium">lembar</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons Row */}
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handlePrintSession(s, currentCopies)}
                                  disabled={isPrintingThis}
                                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                                >
                                  <Printer className={`w-4 h-4 ${isPrintingThis ? "animate-bounce" : ""}`} />
                                  <span>{isPrintingThis ? "Sedang Memproses Cetak..." : `Cetak Sekarang (${currentCopies} Lembar)`}</span>
                                </button>

                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsPrinted(s)}
                                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer text-center"
                                    title="Tandai sudah dicetak tanpa membuka dialog print browser"
                                  >
                                    Tandai Selesai
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedPreviewStrip(s)}
                                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                    title="Lihat Pratinjau"
                                  >
                                    Detail
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSessionItem(s)}
                                    className="py-1.5 px-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 text-[11px] transition-colors cursor-pointer"
                                    title="Hapus sesi ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── SUB-TAB 2: RIWAYAT SUDAH DICETAK ── */}
              {printTab === "history" && (
                <div className="space-y-4">
                  {(() => {
                    const historyList = recentSessions.filter((s) => {
                      const isPrinted = s.print_status === "printed";
                      if (!isPrinted) return false;
                      if (!printSearchQuery.trim()) return true;
                      const q = printSearchQuery.toLowerCase();
                      return (
                        s.session_code.toLowerCase().includes(q) ||
                        (s.layout && s.layout.toLowerCase().includes(q))
                      );
                    });

                    if (historyList.length === 0) {
                      return (
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-3 shadow-xs">
                          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-slate-400" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">
                            {printSearchQuery ? "Tidak ditemukan riwayat yang cocok" : "Belum Ada Riwayat Cetak"}
                          </h3>
                          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            Foto yang sudah berhasil dicetak dari antrian akan tercatat di sini.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-4">Foto Strip</th>
                                <th className="py-3 px-4">Kode Sesi</th>
                                <th className="py-3 px-4">Layout</th>
                                <th className="py-3 px-4">Waktu Sesi</th>
                                <th className="py-3 px-4">Waktu Dicetak</th>
                                <th className="py-3 px-4">Rangkap</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {historyList.map((s, idx) => {
                                const sizeInfo = PRINT_SIZES[s.layout] || { label: "10×15 cm" };
                                const isPrintingThis = printingSessionCode === s.session_code;

                                return (
                                  <tr key={s.id || s.session_code || idx} className="hover:bg-slate-50/80 transition-colors">
                                    {/* Thumbnail */}
                                    <td className="py-3 px-4">
                                      <div
                                        onClick={() => setSelectedPreviewStrip(s)}
                                        className="w-12 h-16 bg-slate-900 rounded-lg overflow-hidden cursor-pointer border border-slate-200 flex items-center justify-center relative group"
                                      >
                                        {s.strip_url ? (
                                          <img
                                            src={s.strip_url}
                                            alt={s.session_code}
                                            className="w-full h-full object-contain"
                                          />
                                        ) : (
                                          <span className="text-[9px] text-slate-500">No Img</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <Eye className="w-3.5 h-3.5" />
                                        </div>
                                      </div>
                                    </td>

                                    {/* Kode Sesi */}
                                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                      #{s.session_code}
                                    </td>

                                    {/* Layout */}
                                    <td className="py-3 px-4">
                                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                                        {s.layout}
                                      </span>
                                      <span className="block text-[10px] text-slate-400 mt-0.5">
                                        {sizeInfo.label}
                                      </span>
                                    </td>

                                    {/* Waktu Sesi */}
                                    <td className="py-3 px-4 text-slate-600">
                                      {s.created_at
                                        ? new Date(s.created_at).toLocaleString("id-ID", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "-"}
                                    </td>

                                    {/* Waktu Dicetak */}
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span>
                                          {s.printed_at
                                            ? new Date(s.printed_at).toLocaleTimeString("id-ID", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              }) + " WIB"
                                            : "Tercetak"}
                                        </span>
                                      </span>
                                    </td>

                                    {/* Rangkap */}
                                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                                      {s.print_copies || 1} Lembar
                                    </td>

                                    {/* Aksi */}
                                    <td className="py-3 px-4 text-right">
                                      <div className="inline-flex items-center gap-1.5">
                                        {/* Cetak Ulang Button */}
                                        <button
                                          type="button"
                                          onClick={() => handlePrintSession(s, s.print_copies || 1)}
                                          disabled={isPrintingThis}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                          title="Cetak ulang foto ini"
                                        >
                                          <Printer className={`w-3 h-3 ${isPrintingThis ? "animate-bounce" : ""}`} />
                                          <span>{isPrintingThis ? "Mencetak..." : "Cetak Ulang"}</span>
                                        </button>

                                        {/* Download PNG */}
                                        <a
                                          href={s.strip_url}
                                          download={`yodha-${s.session_code}.png`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                          title="Unduh Strip PNG"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </a>

                                        {/* Move back to pending */}
                                        <button
                                          type="button"
                                          onClick={() => handleMoveToPending(s)}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                                          title="Kembalikan ke antrian cetak"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Delete */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSessionItem(s)}
                                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                          title="Hapus riwayat ini"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Modal Full-Resolution Preview Strip */}
          {selectedPreviewStrip && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-slate-900 flex flex-col items-center gap-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Pratinjau Foto Strip #{selectedPreviewStrip.session_code}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Layout: {selectedPreviewStrip.layout} • {selectedPreviewStrip.created_at ? new Date(selectedPreviewStrip.created_at).toLocaleString("id-ID") : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewStrip(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Strip Image */}
                <div className="w-full flex items-center justify-center p-2 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                  <img
                    src={selectedPreviewStrip.strip_url}
                    alt={selectedPreviewStrip.session_code}
                    className="max-h-[60vh] object-contain rounded"
                  />
                </div>

                {/* Action Buttons in Modal */}
                <div className="flex items-center justify-between w-full pt-2 gap-3">
                  <a
                    href={selectedPreviewStrip.strip_url}
                    download={`yodha-${selectedPreviewStrip.session_code}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PNG</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const sess = selectedPreviewStrip;
                      setSelectedPreviewStrip(null);
                      handlePrintSession(sess);
                    }}
                    className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Foto Ini Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB: KEUANGAN & ARUS KAS (FINANCE) ──────────────── */}
          {activeNav === "finance" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span>Catatan Keuangan & Kas</span>
                    </h2>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      netBalance >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                    }`}>
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Saldo Bersih: {formatRupiah(netBalance)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pencatatan uang masuk (sesi foto, cetak tambahan, sewa event) & pengeluaran operasional (kertas, tinta, sewa, properti).
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAddIncomeModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Catat Pemasukan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddExpenseModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Catat Pengeluaran</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportFinanceCSV}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                    title="Unduh laporan transaksi dalam format file CSV / Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Ekspor CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={loadFinanceTransactions}
                    disabled={financeLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                    title="Segarkan data keuangan"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${financeLoading ? "animate-spin text-blue-600" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Stat Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Pemasukan */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pemasukan</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
                      {formatRupiah(totalIncome)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {financeTransactions.filter((t) => t.type === "income").length} transaksi pemasukan tercatat
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                </div>

                {/* Total Pengeluaran */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pengeluaran</span>
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                      {formatRupiah(totalExpense)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {financeTransactions.filter((t) => t.type === "expense").length} pengeluaran operasional
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
                </div>

                {/* Saldo Bersih / Kas */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Laba Bersih / Saldo Kas</span>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      netBalance >= 0 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className={`text-2xl font-black tracking-tight ${
                      netBalance >= 0 ? "text-slate-900" : "text-amber-600"
                    }`}>
                      {formatRupiah(netBalance)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {netBalance >= 0 ? "Profit surplus operasional" : "Defisit operasional"}
                    </p>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                    netBalance >= 0 ? "bg-blue-600" : "bg-amber-500"
                  }`} />
                </div>

                {/* Pemasukan Hari Ini */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pemasukan Hari Ini</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-amber-600 tracking-tight">
                      {formatRupiah(todayIncome)}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {financeTransactions.filter((t) => t.type === "income" && t.date.startsWith(todayStr)).length} transaksi hari ini
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* Segmented Type Filter */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFinanceTypeFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        financeTypeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Semua ({financeTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinanceTypeFilter("income")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        financeTypeFilter === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Pemasukan</span>
                      <span className="text-[10px] opacity-80">({financeTransactions.filter((t) => t.type === "income").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinanceTypeFilter("expense")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        financeTypeFilter === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Pengeluaran</span>
                      <span className="text-[10px] opacity-80">({financeTransactions.filter((t) => t.type === "expense").length})</span>
                    </button>
                  </div>

                  {/* Period & Category Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">Periode:</span>
                    <select
                      value={financePeriodFilter}
                      onChange={(e) => setFinancePeriodFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="all">Semua Waktu</option>
                      <option value="today">Hari Ini</option>
                      <option value="week">7 Hari Terakhir</option>
                      <option value="month">30 Hari Terakhir</option>
                    </select>

                    <span className="text-xs text-slate-400 font-medium ml-1">Kategori:</span>
                    <select
                      value={financeCategoryFilter}
                      onChange={(e) => setFinanceCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="all">Semua Kategori</option>
                      <optgroup label="Pemasukan">
                        {INCOME_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Pengeluaran">
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari transaksi berdasarkan keterangan, catatan, atau kode sesi..."
                    value={financeSearchQuery}
                    onChange={(e) => setFinanceSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  {financeSearchQuery && (
                    <button
                      onClick={() => setFinanceSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {(() => {
                  const now = new Date();
                  const filtered = financeTransactions.filter((tx) => {
                    if (financeTypeFilter !== "all" && tx.type !== financeTypeFilter) return false;
                    if (financeCategoryFilter !== "all" && tx.category !== financeCategoryFilter) return false;
                    if (financePeriodFilter === "today") {
                      if (!tx.date.startsWith(todayStr)) return false;
                    } else if (financePeriodFilter === "week") {
                      const txD = new Date(tx.date);
                      const diffDays = (now.getTime() - txD.getTime()) / (1000 * 3600 * 24);
                      if (diffDays > 7) return false;
                    } else if (financePeriodFilter === "month") {
                      const txD = new Date(tx.date);
                      const diffDays = (now.getTime() - txD.getTime()) / (1000 * 3600 * 24);
                      if (diffDays > 30) return false;
                    }
                    if (financeSearchQuery.trim()) {
                      const q = financeSearchQuery.toLowerCase();
                      const matchDesc = (tx.description || "").toLowerCase().includes(q);
                      const matchNotes = (tx.notes || "").toLowerCase().includes(q);
                      const matchCode = (tx.sessionCode || "").toLowerCase().includes(q);
                      const matchCat = getCategoryInfo(tx.category).label.toLowerCase().includes(q);
                      if (!matchDesc && !matchNotes && !matchCode && !matchCat) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Wallet className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">Belum Ada Transaksi Keuangan</h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          {financeTransactions.length === 0
                            ? "Catat pemasukan kas dari sesi photobooth atau pengeluaran operasional dengan tombol di atas."
                            : "Tidak ada transaksi yang cocok dengan filter atau pencarian saat ini."}
                        </p>
                        {financeTransactions.length === 0 && (
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={handleOpenAddIncomeModal}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Catat Pemasukan Pertama</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenAddExpenseModal}
                              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Catat Pengeluaran</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const filteredIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
                  const filteredExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
                  const filteredNet = filteredIncome - filteredExpense;

                  return (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-4">Tanggal & Waktu</th>
                              <th className="py-3 px-4">Tipe & Kategori</th>
                              <th className="py-3 px-4">Keterangan</th>
                              <th className="py-3 px-4">Metode Bayar</th>
                              <th className="py-3 px-4 text-right">Nominal</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filtered.map((tx) => {
                              const catInfo = getCategoryInfo(tx.category);
                              const payInfo = getPaymentMethodInfo(tx.paymentMethod);
                              const isInc = tx.type === "income";

                              return (
                                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                  {/* Tanggal */}
                                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                                    <div className="font-semibold text-slate-800">
                                      {new Date(tx.date).toLocaleDateString("id-ID", {
                                        weekday: "short",
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(tx.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                  </td>

                                  {/* Tipe & Kategori */}
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        isInc ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                      }`}>
                                        <span>{catInfo.label}</span>
                                      </span>
                                    </div>
                                  </td>

                                  {/* Keterangan & Catatan */}
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                                      <span>{tx.description}</span>
                                      {tx.sessionCode && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold">
                                          #{tx.sessionCode}
                                        </span>
                                      )}
                                    </div>
                                    {tx.notes && (
                                      <p className="text-[11px] text-slate-400 italic mt-0.5 max-w-md truncate">
                                        {tx.notes}
                                      </p>
                                    )}
                                  </td>

                                  {/* Metode Pembayaran */}
                                  <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                                      <span>{payInfo.label}</span>
                                    </span>
                                  </td>

                                  {/* Nominal */}
                                  <td className="py-3 px-4 whitespace-nowrap text-right">
                                    <span className={`font-black text-sm ${
                                      isInc ? "text-emerald-600" : "text-rose-600"
                                    }`}>
                                      {formatRupiah(tx.amount)}
                                    </span>
                                  </td>

                                  {/* Aksi */}
                                  <td className="py-3 px-4 whitespace-nowrap text-center">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditFinanceModal(tx)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="Edit Transaksi"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFinanceTransaction(tx.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Hapus Transaksi"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Table Footer Summary */}
                      <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                        <div>
                          Menampilkan <span className="font-bold text-slate-900">{filtered.length}</span> dari{" "}
                          <span className="font-bold text-slate-900">{financeTransactions.length}</span> transaksi
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span>
                            Masuk: <strong className="text-emerald-600">+{formatRupiah(filteredIncome)}</strong>
                          </span>
                          <span>
                            Keluar: <strong className="text-rose-600">-{formatRupiah(filteredExpense)}</strong>
                          </span>
                          <span className="font-bold">
                            Net: <span className={filteredNet >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatRupiah(filteredNet)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ──────────────── MODAL INPUT / EDIT KEUANGAN ──────────────── */}
          {showFinanceModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-slate-900 flex flex-col gap-4 my-8">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold ${
                      txType === "income" ? "bg-emerald-600" : "bg-rose-600"
                    }`}>
                      {txType === "income" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {editingFinanceId
                          ? "Edit Catatan Keuangan"
                          : txType === "income"
                          ? "Catat Pemasukan Kas Baru"
                          : "Catat Pengeluaran Kas Baru"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {txType === "income" ? "Penerimaan uang masuk ke kas Yodha" : "Biaya dan pengeluaran operasional kas"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFinanceModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveFinanceModal} className="space-y-4">
                  {/* Type Selector (if adding new) */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setTxType("income");
                        if (!editingFinanceId) {
                          setTxCategory("photo_session");
                          setTxDescription("Sesi Foto Booth");
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        txType === "income"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Pemasukan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTxType("expense");
                        if (!editingFinanceId) {
                          setTxCategory("paper_ribbon");
                          setTxDescription("Beli Kertas Foto / Ribbon");
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        txType === "expense"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Pengeluaran</span>
                    </button>
                  </div>

                  {/* Nominal Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nominal Transaksi (Rp) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Contoh: 35000"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    {/* Quick Amount Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400">Pilihan Cepat:</span>
                      {(txType === "income"
                        ? [25000, 35000, 50000, 100000, 1500000]
                        : [20000, 50000, 100000, 250000, 500000]
                      ).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTxAmount(val.toString())}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
                        >
                          {val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kategori & Metode Bayar Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Kategori */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Kategori</label>
                      <select
                        value={txCategory}
                        onChange={(e) => setTxCategory(e.target.value as TransactionCategory)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {(txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Metode Bayar */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Metode Pembayaran</label>
                      <select
                        value={txPaymentMethod}
                        onChange={(e) => setTxPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Keterangan / Deskripsi */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Keterangan / Uraian <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={txType === "income" ? "Contoh: Sesi Foto Strip 2 Lembar" : "Contoh: Beli Kertas Foto & Ribbon"}
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Tanggal & Kode Sesi (Opsional) Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tanggal Transaksi */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Tanggal Transaksi</label>
                      <input
                        type="date"
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        required
                      />
                    </div>

                    {/* Kode Sesi Foto (Opsional) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Kode Sesi Foto <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 1234 atau YD-8912"
                        value={txSessionCode}
                        onChange={(e) => setTxSessionCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Catatan Tambahan (Opsional) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Catatan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Nomor invoice/resi, nama vendor, nama pelanggan, keterangan lainnya..."
                      value={txNotes}
                      onChange={(e) => setTxNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  {/* Error Alert */}
                  {txModalError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{txModalError}</span>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowFinanceModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-2 ${
                        txType === "income"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                          : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      }`}
                    >
                      <span>Simpan Transaksi</span>
                    </button>
                  </div>
                </form>
              </div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 block">Pratinjau Langsung (Live Viewfinder):</span>
                    <span className="text-[11px] text-slate-500 font-mono">Zoom Aktif: {cameraZoom.toFixed(2)}x</span>
                  </div>
                  <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-800 shadow-inner">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transition-transform duration-150"
                      style={{
                        transform: `scaleX(-1) scale(${cameraZoom})`,
                        transformOrigin: "center center",
                      }}
                    />
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live Stream (16:9 Widescreen)</span>
                    </div>
                  </div>
                </div>

                {/* Camera Zoom / Field of View (FOV) Slider */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        Sudut Pandang / Zoom Kamera (Field of View)
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Turunkan zoom (misal ke 0.80x atau 0.85x) agar tangkapan kamera lebih luas (wide) dan wajah tidak terlalu dekat/terpotong.
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                      {cameraZoom.toFixed(2)}x {cameraZoom < 1.0 ? "(Wide / Luas)" : cameraZoom === 1.0 ? "(Standar 1:1)" : "(Zoom Dekat)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 shrink-0">0.70x (Sangat Luas)</span>
                    <input
                      type="range"
                      min="0.70"
                      max="1.30"
                      step="0.05"
                      value={cameraZoom}
                      onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-500 shrink-0">1.30x (Dekat)</span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {[
                      { label: "🔍 0.80x (Ultra Wide)", val: 0.80 },
                      { label: "📸 0.85x (Wide Rekomendasi)", val: 0.85 },
                      { label: "✨ 1.00x (Standar Kamera)", val: 1.00 },
                      { label: "🔎 1.15x (Zoom Sedang)", val: 1.15 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleZoomChange(p.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          Math.abs(cameraZoom - p.val) < 0.02
                            ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
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

              {/* ──────────────── KARTU PENGATURAN PEMBAYARAN XENDIT QRIS ──────────────── */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <h3 className="text-base font-bold text-slate-900">Pengaturan Pembayaran & QRIS Xendit</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aktifkan pembayaran QRIS otomatis sebelum pelanggan masuk ke kamera foto booth.
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    isTestApiKey(xenditApiKeyInput)
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}>
                    {isTestApiKey(xenditApiKeyInput) ? "Mode Uji Coba" : "Mode Live"}
                  </span>
                </div>

                <form onSubmit={handleSaveXendit} className="space-y-4">
                  {/* Toggle Aktif / Nonaktif */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800 block cursor-pointer">
                        Wajib Pembayaran Sebelum Foto
                      </label>
                      <span className="text-[11px] text-slate-500 block">
                        {xenditPaymentEnabled
                          ? "Pengunjung wajib scan QRIS dan membayar sebelum kamera terbuka"
                          : "Pembayaran dinonaktifkan (kamera langsung terbuka gratis)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleXenditPayment}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        xenditPaymentEnabled ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          xenditPaymentEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Input Harga per Sesi */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tarif per Sesi Foto (Rupiah)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={xenditPriceInput}
                        onChange={(e) => {
                          const num = e.target.value.replace(/\D/g, "");
                          setXenditPriceInput(num ? Number(num).toLocaleString("id-ID") : "");
                        }}
                        placeholder="Contoh: 35.000"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Nominal yang ditagihkan saat kode QRIS dinamis dibuat oleh Xendit.
                    </p>
                  </div>

                  {/* Input Secret API Key Xendit */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Xendit Secret API Key
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Format: xnd_development_... atau xnd_production_...
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showXenditKey ? "text" : "password"}
                        value={xenditApiKeyInput}
                        onChange={(e) => setXenditApiKeyInput(e.target.value)}
                        placeholder="Masukkan Xendit Secret API Key Anda"
                        className="w-full px-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowXenditKey(!showXenditKey)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showXenditKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Kunci rahasia dari Dashboard Xendit menu Pengaturan / API Keys.
                    </p>
                  </div>

                  {/* Hasil Uji Koneksi */}
                  {xenditTestResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-semibold ${
                        xenditTestResult.success
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {xenditTestResult.message}
                    </div>
                  )}

                  {/* Notifikasi Simpan */}
                  {xenditSavedMsg && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                      {xenditSavedMsg}
                    </div>
                  )}

                  {/* Tombol Uji & Simpan */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestXendit}
                      disabled={xenditTesting || !xenditApiKeyInput.trim()}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${xenditTesting ? "animate-spin" : ""}`} />
                      {xenditTesting ? "Menguji..." : "Uji Koneksi"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      Simpan Pengaturan Pembayaran
                    </button>
                  </div>
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

                    {/* Primary Auto-Scan Button */}
                    <button
                      type="button"
                      onClick={handleAutoScanErase}
                      disabled={!activeCanvasData}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                      title="Pindai dan hapus background foto di dalam bingkai secara otomatis"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                      <span>✨ Scan Otomatis & Hapus Background Foto</span>
                    </button>

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

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleAutoDetectAndPlaceBoxes}
                          className="px-2.5 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                          title="Pindai semua lubang transparan (lingkaran, bintang, segi enam, dll) dan pasang penanda secara otomatis"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                          <span>✨ Pasang Otomatis</span>
                        </button>
                        {photoBoxes.length > 0 && (
                          <button
                            type="button"
                            onClick={handlePunchAllBoxes}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Lubangi semua kotak foto agar transparan 100%"
                          >
                            <span>✂️ Lubangi Semua</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddBox}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          title="Tambah kotak foto manual"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Manual</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-indigo-900/80 bg-white/80 p-2 rounded-lg border border-indigo-100 leading-relaxed">
                      💡 <strong>Catatan:</strong> Kotak ini menandai area foto pengunjung. Anda juga dapat menekan <strong>Lubangi Kotak</strong> di bawah untuk membuat area foto di dalam kotak 100% transparan tanpa merusak background bingkai.
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

                        {/* Selected Box Controls: Ratio Presets, Hole Punch & Delete */}
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              Atur Kotak #{photoBoxes.findIndex((b) => b.id === (selectedBoxId || photoBoxes[0]?.id)) + 1}:
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

                          {/* 1-Click Clean Punch for This Box */}
                          <button
                            type="button"
                            onClick={handlePunchSelectedBox}
                            className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
                            title="Lubangi bagian dalam kotak ini menjadi transparan 100%"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>✂️ Lubangi Bersih Kotak Ini (100% Transparan)</span>
                          </button>
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
              <div className="lg:col-span-6 p-5 bg-slate-50/70 flex flex-col gap-2.5 justify-start">
                {/* Mode Switcher Tabs Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
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

                  <div className="flex items-center gap-2">
                    {/* Quick 1-Click Auto Marker Placement Button */}
                    <button
                      type="button"
                      onClick={handleAutoDetectAndPlaceBoxes}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                      title="Deteksi semua lubang foto (persegi, lingkaran, bintang, dll) dan pasang penanda secara otomatis"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>✨ Pasang Penanda Otomatis</span>
                    </button>

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
                </div>

                {/* Dimension & Aspect Ratio info pill */}
                {imageMeta && (
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium shrink-0">
                    <span>Ukuran Frame: <strong className="font-mono text-slate-700">{imageMeta.width} × {imageMeta.height} px</strong></span>
                    <span className="font-mono text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full text-[10px]">
                      Rasio {Math.round((imageMeta.width / imageMeta.height) * 100) / 100} : 1
                    </span>
                  </div>
                )}

                {/* Live Preview Canvas Outer Container (Top-aligned, no giant gap) */}
                <div className="w-full flex justify-center py-1 shrink-0">
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
                        ? `min(100%, calc(min(68vh, 620px) * ${imageMeta.width} / ${imageMeta.height}))`
                        : "100%",
                      maxHeight: "min(68vh, 620px)",
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
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
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

      {/* ──────────────── MODAL RACIK & EDIT FILTER KAMERA ──────────────── */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-lg shadow-xs">
                  {filterEmoji || "✨"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingFilterId ? "Edit Filter Kamera" : "Racik Filter Kamera Baru"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sesuaikan warna dengan slider visual dan lihat hasilnya secara langsung.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (2 Columns) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Live Visual Preview & Presets (md:col-span-5) */}
              <div className="md:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Pratinjau Langsung</span>
                  <button
                    type="button"
                    onMouseDown={() => setPreviewBeforeAfter(true)}
                    onMouseUp={() => setPreviewBeforeAfter(false)}
                    onTouchStart={() => setPreviewBeforeAfter(true)}
                    onTouchEnd={() => setPreviewBeforeAfter(false)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer select-none"
                  >
                    {previewBeforeAfter ? "👁️ Menampilkan Asli" : "Tahan untuk Asli"}
                  </button>
                </div>

                {/* Preview Frame */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-md flex items-center justify-center">
                  <img
                    src={SAMPLE_PORTRAIT_URL}
                    alt="Preview Model"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = yodhaLogo;
                    }}
                    className="w-full h-full object-cover transition-all duration-150"
                    style={{
                      filter: previewBeforeAfter
                        ? "none"
                        : customCssMode
                        ? customCssInput || "none"
                        : generateFilterCss(filterSliders),
                    }}
                  />

                  {/* Active Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 flex items-center gap-1.5 shadow-xs">
                    <span>{filterEmoji}</span>
                    <span className="truncate max-w-[120px]">{filterName || "Pratinjau"}</span>
                  </div>

                  {previewBeforeAfter && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-2xs flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-900/90 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white/20">
                        Foto Asli (Tanpa Filter)
                      </span>
                    </div>
                  )}
                </div>

                {/* CSS Output Pill */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Generated CSS Filter:</span>
                    <span className="font-mono text-pink-600">
                      {customCssMode ? "Manual" : "Otomatis"}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-700 break-all select-all font-semibold leading-relaxed">
                    {customCssMode ? customCssInput || "none" : generateFilterCss(filterSliders)}
                  </p>
                </div>

                {/* Presets Quick Picker */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    ⚡ Inspirasi Preset Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {FILTER_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>{p.emoji}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Name, Description & Visual Sliders (md:col-span-7) */}
              <form id="filter-form" onSubmit={handleSaveFilterModal} className="md:col-span-7 space-y-4">
                {filterModalError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{filterModalError}</span>
                  </div>
                )}

                {/* Name & Emoji inputs */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Ikon Emoji</label>
                    <input
                      type="text"
                      value={filterEmoji}
                      onChange={(e) => setFilterEmoji(e.target.value)}
                      maxLength={4}
                      className="w-full px-3 py-2 text-center text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 font-sans"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Nama Filter</label>
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => {
                        setFilterName(e.target.value);
                        setFilterModalError("");
                      }}
                      placeholder="Contoh: Sunset Golden Hour"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 font-semibold bg-slate-50"
                      required
                    />
                  </div>
                </div>

                {/* Quick Emoji selection buttons */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">Pilihan Ikon:</span>
                  {EMOJI_SUGGESTIONS.map((em, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFilterEmoji(em)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                        filterEmoji === em
                          ? "bg-pink-100 border border-pink-400 scale-110"
                          : "bg-slate-100 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Deskripsi Singkat</label>
                  <input
                    type="text"
                    value={filterDesc}
                    onChange={(e) => setFilterDesc(e.target.value)}
                    placeholder="Contoh: Kilau sinar senja keemasan yang mempesona"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50"
                  />
                </div>

                {/* Switch Manual CSS / Slider mode */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Pengaturan Efek Warna</span>
                  <button
                    type="button"
                    onClick={() => setCustomCssMode(!customCssMode)}
                    className="text-[11px] font-semibold text-pink-600 hover:text-pink-800 transition-colors cursor-pointer"
                  >
                    {customCssMode ? "← Gunakan Slider Visual" : "Opsi Lanjutan: Ketik Manual CSS →"}
                  </button>
                </div>

                {customCssMode ? (
                  /* Manual CSS Input Box */
                  <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <label className="block text-xs font-bold text-slate-700">Kode CSS filter</label>
                    <textarea
                      value={customCssInput}
                      onChange={(e) => setCustomCssInput(e.target.value)}
                      placeholder="sepia(0.3) contrast(1.1) brightness(1.05)..."
                      rows={3}
                      className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-400">
                      Mendukung seluruh fungsi CSS filter seperti blur(), brightness(), contrast(), grayscale(), hue-rotate(), invert(), opacity(), saturate(), sepia().
                    </p>
                  </div>
                ) : (
                  /* Visual Sliders Group */
                  <div className="space-y-3.5 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl">
                    {/* 1. Brightness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Kecerahan (Brightness):</span>
                        <span className="font-mono font-bold text-pink-600">{filterSliders.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="180"
                        value={filterSliders.brightness}
                        onChange={(e) => setFilterSliders({ ...filterSliders, brightness: Number(e.target.value) })}
                        className="w-full accent-pink-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 2. Contrast */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Kontras (Contrast):</span>
                        <span className="font-mono font-bold text-pink-600">{filterSliders.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={filterSliders.contrast}
                        onChange={(e) => setFilterSliders({ ...filterSliders, contrast: Number(e.target.value) })}
                        className="w-full accent-pink-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 3. Saturation */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Kepekatan Warna (Saturation):</span>
                        <span className="font-mono font-bold text-pink-600">{filterSliders.saturate}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="250"
                        value={filterSliders.saturate}
                        onChange={(e) => setFilterSliders({ ...filterSliders, saturate: Number(e.target.value) })}
                        className="w-full accent-pink-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 4. Sepia */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Nuansa Retro (Sepia):</span>
                        <span className="font-mono font-bold text-amber-600">{filterSliders.sepia}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filterSliders.sepia}
                        onChange={(e) => setFilterSliders({ ...filterSliders, sepia: Number(e.target.value) })}
                        className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 5. Grayscale */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Hitam Putih (Grayscale):</span>
                        <span className="font-mono font-bold text-slate-600">{filterSliders.grayscale}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filterSliders.grayscale}
                        onChange={(e) => setFilterSliders({ ...filterSliders, grayscale: Number(e.target.value) })}
                        className="w-full accent-slate-700 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 6. Hue Rotate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Pergeseran Warna (Hue Rotate):</span>
                        <span className="font-mono font-bold text-indigo-600">{filterSliders.hueRotate}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={filterSliders.hueRotate}
                        onChange={(e) => setFilterSliders({ ...filterSliders, hueRotate: Number(e.target.value) })}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 7. Blur */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Kelembutan (Soft Blur):</span>
                        <span className="font-mono font-bold text-blue-600">{filterSliders.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.5"
                        value={filterSliders.blur}
                        onChange={(e) => setFilterSliders({ ...filterSliders, blur: Number(e.target.value) })}
                        className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* 8. Invert / Negatif */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Efek Klise Negatif (Invert):</span>
                        <span className="font-mono font-bold text-violet-600">{filterSliders.invert || 0}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filterSliders.invert || 0}
                        onChange={(e) => setFilterSliders({ ...filterSliders, invert: Number(e.target.value) })}
                        className="w-full accent-violet-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Reset Sliders Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFilterSliders({ ...DEFAULT_SLIDER_SETTINGS })}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan Slider ke Standar</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                ✨ Filter akan langsung aktif dan tersimpan ke cloud.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="filter-form"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                >
                  {editingFilterId ? "Simpan Perubahan" : "Tambah Filter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL TAMBAH / EDIT EFEK AI (DREAMBOOTH) ──────────────── */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg shadow-xs">
                  {aiEmoji || "✨"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAiId ? "Edit Efek AI" : "Tambah Efek AI Baru"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi prompt dan gaya shader transformasi AI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form id="ai-effect-form" onSubmit={handleSaveAiEffectModal} className="flex-1 overflow-y-auto p-6 space-y-4">
              {aiModalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{aiModalError}</span>
                </div>
              )}

              {/* Emoji & Name */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Ikon Emoji</label>
                  <input
                    type="text"
                    value={aiEmoji}
                    onChange={(e) => setAiEmoji(e.target.value)}
                    maxLength={4}
                    className="w-full px-3 py-2 text-center text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-sans"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Nama Efek AI</label>
                  <input
                    type="text"
                    value={aiName}
                    onChange={(e) => {
                      setAiName(e.target.value);
                      setAiModalError("");
                    }}
                    placeholder="Contoh: 3D Pixar Movie Character"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Category & Shader Engine */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Kategori</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                  >
                    <option value="character">🧸 Karakter 3D & Anime</option>
                    <option value="formal">👔 Formal & Studio</option>
                    <option value="retro">⚡ Retro & Y2K</option>
                    <option value="art">🎨 Seni Lukis & Sketsa</option>
                    <option value="game">🎮 Mainan & Game</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Gaya Shader / Engine</label>
                  <select
                    value={aiShaderType}
                    onChange={(e) => setAiShaderType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                  >
                    <option value="3d_movie">3D Movie Character (Pixar / Disney)</option>
                    <option value="pas_foto">Pas Foto Jas Formal</option>
                    <option value="y2k_flash">Y2K Flash Camera</option>
                    <option value="pencil">Pencil Sketch (Sketsa Pensil Grafit)</option>
                    <option value="watercolor">Storybook Watercolor (Cat Air)</option>
                    <option value="anime">Anime Portrait (Studio Ghibli)</option>
                    <option value="lego">Lego Mini Bricks</option>
                    <option value="sims">Sims Game [pink version]</option>
                    <option value="sketch">Sketch Manga / Comic Pop Art</option>
                    <option value="analog">Analog Film Portra 400</option>
                    <option value="vintage_film">Vintage Film Strip</option>
                    <option value="cyberpunk">Cyberpunk Neon Glow</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                  placeholder="Contoh: Mengubah foto menjadi karakter animasi 3D lucu"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                />
              </div>

              {/* AI Prompt */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Prompt AI (Style & Visual Instructions)
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="3D animated movie character, Disney Pixar style, cute, smooth 3D render, octane render..."
                  rows={3}
                  className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Negative Prompt (Opsional)
                </label>
                <input
                  type="text"
                  value={aiNegativePrompt}
                  onChange={(e) => setAiNegativePrompt(e.target.value)}
                  placeholder="photorealistic, ugly, blurry, deformed..."
                  className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                />
              </div>

              {/* Preview Image URL */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  URL Gambar Thumbnail Pratinjau
                </label>
                <input
                  type="url"
                  value={aiPreviewUrl}
                  onChange={(e) => setAiPreviewUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... (atau kosongkan untuk default)"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                ✨ Efek AI akan langsung aktif di layar booth pengunjung.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="ai-effect-form"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                >
                  {editingAiId ? "Simpan Perubahan" : "Tambah Efek AI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL KONFIGURASI ENGINE PROVIDER AI ──────────────── */}
      {showAiProviderModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Konfigurasi Engine AI</h3>
                  <p className="text-xs text-slate-500">Pilih antara Engine Offline Cepat atau Cloud Generative API.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiProviderModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAiProviderModal} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Pilih Mesin Generator AI</label>
                <div className="grid grid-cols-1 gap-2">
                  {/* 1. Fal.ai */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      providerModeInput === "fal"
                        ? "border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ai-mode"
                      value="fal"
                      checked={providerModeInput === "fal"}
                      onChange={() => setProviderModeInput("fal")}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 block">
                          ⚡ Fal.ai Cloud Generative AI
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                          Rekomendasi (Cepat ~2 Detik)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inference super cepat berbasis SDXL / Face-to-Many. Foto benar-benar ditransformasikan menjadi karakter 3D Pixar, jas formal, atau anime asli.
                      </p>
                    </div>
                  </label>

                  {/* 2. Replicate */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      providerModeInput === "replicate"
                        ? "border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ai-mode"
                      value="replicate"
                      checked={providerModeInput === "replicate"}
                      onChange={() => setProviderModeInput("replicate")}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        🔮 Replicate Cloud API (SDXL / Flux / Face-to-Many)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Menghubungkan ke ribuan model AI di Replicate.com menggunakan API token akun Anda.
                      </p>
                    </div>
                  </label>

                  {/* 3. Custom Webhook */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      providerModeInput === "custom_webhook"
                        ? "border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ai-mode"
                      value="custom_webhook"
                      checked={providerModeInput === "custom_webhook"}
                      onChange={() => setProviderModeInput("custom_webhook")}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        🌐 Webhook / Server AI Lokal (ComfyUI / SD-WebUI)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Gunakan GPU lokal photobooth (RTX 3060/4060) atau server webhook private Anda sendiri tanpa batas kuota.
                      </p>
                    </div>
                  </label>

                  {/* 4. Client Offline */}
                  <label
                    className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                      providerModeInput === "client"
                        ? "border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ai-mode"
                      value="client"
                      checked={providerModeInput === "client"}
                      onChange={() => setProviderModeInput("client")}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        💻 Offline Neural Shaders (Tanpa Internet / 100% Cepat)
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Diproses langsung di browser komputer booth tanpa internet. Menggunakan filter 2D retouch dan formal overlay.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Fal.ai Configuration Fields */}
              {providerModeInput === "fal" && (
                <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Fal.ai API Key (FAL_KEY)
                      </label>
                      <a
                        href="https://fal.ai/dashboard/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-violet-600 font-semibold hover:underline"
                      >
                        Dapatkan Key di fal.ai ↗
                      </a>
                    </div>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="e.g. f1-xxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Model Fal.ai</label>
                    <input
                      type="text"
                      value={modelNameInput}
                      onChange={(e) => setModelNameInput(e.target.value)}
                      placeholder="fal-ai/fast-sdxl/image-to-image atau fal-ai/face-to-many"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Standar: <code>fal-ai/fast-sdxl/image-to-image</code> atau <code>fal-ai/face-to-many</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Replicate Configuration Fields */}
              {providerModeInput === "replicate" && (
                <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Replicate API Token
                      </label>
                      <a
                        href="https://replicate.com/account/api-tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-violet-600 font-semibold hover:underline"
                      >
                        Dapatkan Token di replicate.com ↗
                      </a>
                    </div>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="r8_xxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Model Name / Endpoint</label>
                    <input
                      type="text"
                      value={modelNameInput}
                      onChange={(e) => setModelNameInput(e.target.value)}
                      placeholder="stability-ai/sdxl atau fofr/face-to-many"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Custom Webhook Configuration Fields */}
              {providerModeInput === "custom_webhook" && (
                <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">API Endpoint URL</label>
                    <input
                      type="url"
                      value={apiEndpointInput}
                      onChange={(e) => setApiEndpointInput(e.target.value)}
                      placeholder="http://127.0.0.1:8188/api/transform atau https://api.anda.com/v1"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">API Key (Opsional)</label>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Strength Slider for Generative Modes */}
              {providerModeInput !== "client" && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Intensitas Transformasi AI:</span>
                    <span className="font-mono font-bold text-violet-600">{Math.round(strengthInput * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="0.95"
                    step="0.05"
                    value={strengthInput}
                    onChange={(e) => setStrengthInput(Number(e.target.value))}
                    className="w-full accent-violet-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Mirip Foto Asli (40%)</span>
                    <span>Standar (80%)</span>
                    <span>Perubahan Kuat (95%)</span>
                  </div>
                </div>
              )}

              {/* Test Connection Button & Result Box */}
              {providerModeInput !== "client" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestAiProvider}
                    disabled={isTestingProvider}
                    className="w-full py-2 px-3 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isTestingProvider ? "animate-spin" : ""}`} />
                    <span>{isTestingProvider ? "Menguji Koneksi..." : "🧪 Tes Koneksi API Sekarang"}</span>
                  </button>

                  {providerTestMsg && (
                    <div
                      className={`mt-2 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        providerTestMsg.success
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {providerTestMsg.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{providerTestMsg.text}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiProviderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL LIVE TEST / UJI COBA EFEK AI ──────────────── */}
      {showAiTestModal && testingAiEffect && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg shadow-xs">
                  {testingAiEffect.emoji || "✨"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Uji Coba: {testingAiEffect.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      {testingAiEffect.categoryLabel}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pratinjau transformasi foto real-time menggunakan engine AI yang aktif.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiTestModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Before/After Display Box */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-lg flex items-center justify-center">
                {isProcessingAiTest ? (
                  <div className="flex flex-col items-center gap-2 text-white">
                    <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
                    <span className="text-xs font-bold">Memproses Transformasi AI...</span>
                  </div>
                ) : (
                  <img
                    src={testCompareBefore ? testSourceImg : (testResultImg || testSourceImg)}
                    alt="AI Test Preview"
                    className="w-full h-full object-cover transition-all duration-200"
                  />
                )}

                {/* State Tag */}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 shadow-md">
                  <span>{testingAiEffect.emoji}</span>
                  <span>{testCompareBefore ? "Foto Asli (Before)" : `Hasil AI (${testingAiEffect.name})`}</span>
                </div>

                {/* Hold to compare button */}
                <div className="absolute bottom-3 right-3">
                  <button
                    type="button"
                    onMouseDown={() => setTestCompareBefore(true)}
                    onMouseUp={() => setTestCompareBefore(false)}
                    onTouchStart={() => setTestCompareBefore(true)}
                    onTouchEnd={() => setTestCompareBefore(false)}
                    className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all cursor-pointer select-none shadow-md flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{testCompareBefore ? "Menampilkan Foto Asli" : "Tahan untuk Foto Asli"}</span>
                  </button>
                </div>
              </div>

              {/* Effect Prompt & Description */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Deskripsi & Karakter Efek:</span>
                  <span className="text-violet-600 font-mono text-[11px]">{testingAiEffect.shaderType}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{testingAiEffect.desc}</p>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-700 select-all">
                  <span className="font-bold text-violet-600">Prompt: </span>
                  {testingAiEffect.prompt}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => runTestAiTransformation(testingAiEffect, testSourceImg)}
                disabled={isProcessingAiTest}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessingAiTest ? "animate-spin" : ""}`} />
                <span>Proses Ulang</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiTestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleToggleAiEffect(testingAiEffect.id, true);
                    setShowAiTestModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aktifkan Efek Ini di Booth</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
