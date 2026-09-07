import React, { useState, useRef, useEffect } from "react";
import yodhaLogo from "@/assets/yodha.png";
import { CustomTemplate, SessionDB, PhotoboothSession, SettingsDB } from "../lib/db";
import { isSupabaseConfigured, testSupabaseConnection } from "../lib/supabase";
import { logoutAdmin, getAdminPin, setAdminPin, createBoothSession } from "../lib/auth";

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
  const [mainTab, setMainTab] = useState<"templates" | "history" | "settings" | "db">("templates");
  const [activeLayoutTab, setActiveLayoutTab] = useState<"3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2">("3x1");

  // Upload Form States
  const [newName, setNewName] = useState("");
  const [newLayout, setNewLayout] = useState<"3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2">("3x1");
  const [newPreset, setNewPreset] = useState("frame1");
  const [uploadError, setUploadError] = useState("");
  const [base64Img, setBase64Img] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Device settings
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  // Database status
  const [dbConfigured, setDbConfigured] = useState<boolean>(isSupabaseConfigured());
  const [dbTestResult, setDbTestResult] = useState<{ testing: boolean; message: string; success?: boolean }>({
    testing: false,
    message: "",
  });

  // Recent Sessions
  const [recentSessions, setRecentSessions] = useState<PhotoboothSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Security / PIN management
  const [currentPin, setCurrentPinState] = useState("1234");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinChangeMsg, setPinChangeMsg] = useState("");

  useEffect(() => {
    // Load devices
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

    // Load camera setting
    settingsDB.getSetting<string>("camera_device_id", "").then((val) => {
      setSelectedDevice(val || localStorage.getItem("yodha_camera_device_id") || "");
    });

    // Load admin PIN
    getAdminPin().then((pin) => setCurrentPinState(pin));
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await sessionDB.getRecentSessions(30);
      setRecentSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (mainTab === "history") {
      loadSessions();
    }
  }, [mainTab]);

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

  // Launch booth in a new tab / window so admin can keep this dashboard open
  const handleLaunchInNewTab = () => {
    createBoothSession();
    const url = `${window.location.origin}${window.location.pathname}?mode=booth`;
    window.open(url, "_blank");
  };

  const filteredTemplates = templates.filter((t) => t.layout === activeLayoutTab);

  const handleLayoutChange = (layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2") => {
    setNewLayout(layout);
    setNewPreset(HOLE_PRESETS[layout][0].id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Berkas harus berupa gambar PNG!");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setBase64Img(event.target?.result as string);
    };
    reader.onerror = () => {
      setUploadError("Gagal membaca file.");
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
      setUploadError("Gambar template (.png) wajib diunggah!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTemplate(newName.trim(), newLayout, newPreset, base64Img);
      setNewName("");
      setBase64Img("");
      setUploadError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveLayoutTab(newLayout);
      alert("Template berhasil disimpan ke Database!");
    } catch (err) {
      console.error(err);
      setUploadError("Gagal menyimpan template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={yodhaLogo} alt="Yodha Photobooth" className="h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Yodha Admin Panel</h1>
              <p className="text-xs text-slate-500">Pusat Kendali Photobooth & Database</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Button to Launch Photobooth */}
            <button
              onClick={handleLaunchInNewTab}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              title="Buka Web Photobooth di tab baru untuk pengunjung"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Buka Web Photobooth (Tab Baru)</span>
            </button>

            {/* In-Place Launch */}
            <button
              onClick={onLaunchBooth}
              className="hidden sm:flex bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-3.5 py-2.5 rounded-lg transition-colors items-center gap-1.5 cursor-pointer"
              title="Buka Photobooth di layar ini"
            >
              <span>Mode Kiosk</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                logoutAdmin();
                onLogout();
              }}
              className="text-slate-500 hover:text-red-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Database Status Alert */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          dbConfigured ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{dbConfigured ? "🟢" : "🟡"}</span>
            <div>
              <div className="text-sm font-semibold">
                {dbConfigured ? "Database Cloud Aktif (Supabase PostgreSQL & Storage)" : "Mode Database Lokal (IndexedDB Fallback)"}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {dbConfigured
                  ? "Seluruh template, pengaturan, dan hasil foto pengunjung otomatis disinkronkan ke cloud."
                  : "Database cloud belum aktif atau offline. Data saat ini tersimpan di browser ini."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestDB}
              disabled={dbTestResult.testing}
              className="px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              {dbTestResult.testing ? "Menguji..." : "Tes Koneksi DB"}
            </button>
            <button
              onClick={() => setMainTab("db")}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
            >
              Panduan Setup DB
            </button>
          </div>
        </div>

        {dbTestResult.message && (
          <div className={`p-3 rounded-lg text-xs font-medium ${
            dbTestResult.success ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
          }`}>
            {dbTestResult.message}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setMainTab("templates")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              mainTab === "templates"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            🖼️ Kelola Template Frame
          </button>
          <button
            onClick={() => setMainTab("history")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              mainTab === "history"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            📸 Riwayat Foto Pengunjung
          </button>
          <button
            onClick={() => setMainTab("settings")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              mainTab === "settings"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            ⚙️ Pengaturan Booth & Kamera
          </button>
          <button
            onClick={() => setMainTab("db")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              mainTab === "db"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            🗄️ Panduan Database Vercel
          </button>
        </div>

        {/* TAB 1: KELOLA TEMPLATE */}
        {mainTab === "templates" && (
          <div className="space-y-8">
            {/* Upload Form Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Unggah Template Frame Baru</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tambahkan frame PNG transparan untuk digunakan oleh pengunjung di photobooth.
                </p>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Template
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Contoh: Frame Event Wisuda 2026"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ukuran Layout
                      </label>
                      <select
                        value={newLayout}
                        onChange={(e) => handleLayoutChange(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="3x1">Strip Vertikal (3x1)</option>
                        <option value="3x2">Grid 6 Foto (3x2)</option>
                        <option value="2x2">Grid 2x2 (2x2)</option>
                        <option value="2x1">Strip Pendek (2x1)</option>
                        <option value="1x1">Foto Tunggal (1x1)</option>
                        <option value="4x2">Grid 8 Foto (4x2)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Preset Tata Letak Lubang Foto
                      </label>
                      <select
                        value={newPreset}
                        onChange={(e) => setNewPreset(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                      >
                        {HOLE_PRESETS[newLayout].map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right: File Dropzone */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        File Frame PNG (Transparan)
                      </label>
                      <input
                        type="file"
                        accept=".png,image/png"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition-colors flex flex-col items-center justify-center min-h-[140px]"
                      >
                        {base64Img ? (
                          <div className="space-y-2">
                            <img
                              src={base64Img}
                              alt="Pratinjau"
                              className="max-h-24 mx-auto object-contain bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:10px_10px] rounded"
                            />
                            <span className="text-xs text-blue-600 font-medium block">
                              Klik untuk mengganti gambar
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <svg className="w-8 h-8 text-slate-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-700 block">Pilih berkas frame PNG</span>
                            <span className="text-xs text-slate-400 block">Gunakan latar belakang transparan pada lubang foto</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {uploadError && (
                      <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                        {uploadError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !newName || !base64Img}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting ? "Menyimpan ke Database..." : "Simpan Template Frame"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Template List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Daftar Template Aktif</h2>
                <div className="flex gap-1.5 bg-slate-200/70 p-1 rounded-lg">
                  {(["3x1", "3x2", "2x2", "2x1", "1x1", "4x2"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setActiveLayoutTab(l)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        activeLayoutTab === l ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTemplates.length === 0 ? (
                  <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                    <p className="text-sm">Tidak ada template untuk layout {activeLayoutTab}.</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`bg-white rounded-xl border p-4 flex flex-col justify-between space-y-4 transition-all shadow-sm ${
                        template.enabled ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-60"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {template.img ? (
                            <img
                              src={template.img}
                              alt={template.name}
                              className="w-full h-full object-contain bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:6px_6px]"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">Polos</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate block">
                              {template.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              template.isCustom ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {template.isCustom ? "Kustom" : "Bawaan"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Preset: {template.presetId}</p>
                          <p className="text-xs">
                            Status:{" "}
                            <span className={template.enabled ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                              {template.enabled ? "Aktif" : "Nonaktif"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => onToggleTemplate(template.id, !template.enabled)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                            template.enabled
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {template.enabled ? "Nonaktifkan" : "Aktifkan"}
                        </button>

                        {template.isCustom && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus template "${template.name}"?`)) {
                                onDeleteTemplate(template.id);
                              }
                            }}
                            className="text-xs px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RIWAYAT FOTO PENGUNJUNG */}
        {mainTab === "history" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Riwayat Foto Photobooth</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Foto dan animasi GIF hasil jepretan pengunjung yang tersimpan di cloud database.
                </p>
              </div>
              <button
                onClick={loadSessions}
                disabled={loadingSessions}
                className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                {loadingSessions ? "Memuat..." : "Segarkan Data"}
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-sm">Belum ada riwayat sesi foto yang tersimpan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentSessions.map((s, idx) => (
                  <div key={s.id || idx} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2.5">
                    <div className="aspect-[2/3] bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative">
                      {s.strip_url ? (
                        <img src={s.strip_url} alt="Strip foto" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400">Tidak ada gambar</span>
                      )}
                      {s.gif_url && (
                        <span className="absolute top-1.5 right-1.5 text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded shadow">
                          GIF
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{s.session_code || `Sesi #${idx + 1}`}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {s.layout}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {s.created_at ? new Date(s.created_at).toLocaleString("id-ID") : "Baru saja"}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-slate-200">
                      <a
                        href={s.strip_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                      >
                        Buka Foto
                      </a>
                      {s.gif_url && (
                        <a
                          href={s.gif_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                        >
                          Buka GIF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PENGATURAN BOOTH & KAMERA */}
        {mainTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Perangkat Kamera / Webcam</h3>
              <p className="text-xs text-slate-500">
                Tentukan webcam default yang akan langsung dipakai saat Web Photobooth dibuka.
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Pilih Kamera</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Default (Kamera Utama Laptop / Kiosk)</option>
                  {devices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Security / PIN Admin */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Keamanan & PIN Admin</h3>
              <p className="text-xs text-slate-500">
                PIN ini digunakan untuk login ke portal admin dan mencegah pengunjung keluar dari mode Photobooth.
              </p>

              <form onSubmit={handleSavePin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ganti PIN Baru (Saat ini: {currentPin})
                  </label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Masukkan 4 digit PIN baru"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {pinChangeMsg && (
                  <p className="text-xs font-medium text-emerald-600">{pinChangeMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={!newPinInput}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Simpan PIN Baru
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: PANDUAN DATABASE */}
        {mainTab === "db" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Pengaturan Supabase & Vercel</h2>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                1. <strong>SQL Schema</strong>: Pastikan file <code>supabase_schema.sql</code> sudah dijalankan di menu SQL Editor Supabase.
              </p>
              <p>
                2. <strong>Vercel Environment Variables</strong>: Masukkan <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> di pengaturan Vercel Anda.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
