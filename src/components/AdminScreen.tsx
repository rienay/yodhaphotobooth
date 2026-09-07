import React, { useState, useRef, useEffect } from "react";
import { CustomTemplate, SessionDB, PhotoboothSession, SettingsDB } from "../lib/db";
import { isSupabaseConfigured, testSupabaseConnection } from "../lib/supabase";

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
  onAddTemplate: (name: string, layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2", presetId: string, base64Img: string) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onBack: () => void;
}

const LAYOUT_LABELS: Record<string, string> = {
  "3x1": "🎞️ Strip Vertikal (3x1)",
  "3x2": "🖼️ Grid 6 Foto (3x2)",
  "2x2": "🔲 Grid 2x2 (2x2)",
  "2x1": "📷 Strip Pendek (2x1)",
  "1x1": "📸 Foto Tunggal (1x1)",
  "4x2": "🎴 Grid 8 Foto (4x2)",
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
  "1x1": [
    { id: "default", label: "Default (Full Overlap)" },
  ],
  "2x2": [
    { id: "default", label: "Default (Full Overlap)" },
  ],
  "4x2": [
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
  onBack,
}: AdminScreenProps) {
  const [mainTab, setMainTab] = useState<"templates" | "history" | "db">("templates");
  const [activeTab, setActiveTab] = useState<"3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2">("3x1");
  const [newName, setNewName] = useState("");
  const [newLayout, setNewLayout] = useState<"3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2">("3x1");
  const [newPreset, setNewPreset] = useState("frame1");
  const [uploadError, setUploadError] = useState("");
  const [base64Img, setBase64Img] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  // Database status states
  const [dbConfigured, setDbConfigured] = useState<boolean>(isSupabaseConfigured());
  const [dbTestResult, setDbTestResult] = useState<{ testing: boolean; message: string; success?: boolean }>({
    testing: false,
    message: "",
  });

  // Recent sessions
  const [recentSessions, setRecentSessions] = useState<PhotoboothSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    // Check devices
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

  // Filter templates based on current tab
  const filteredTemplates = templates.filter((t) => t.layout === activeTab);

  // Handle changing layout in upload form to reset appropriate preset
  const handleLayoutChange = (layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2") => {
    setNewLayout(layout);
    setNewPreset(HOLE_PRESETS[layout][0].id);
  };

  // Convert uploaded file to base64
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
      setUploadError("Gagal membaca file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
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
      // Reset form
      setNewName("");
      setBase64Img("");
      setUploadError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveTab(newLayout);
      alert("Template berhasil disimpan ke Database!");
    } catch (err) {
      console.error(err);
      setUploadError("Gagal menyimpan template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-4 border-[var(--color-ink)]">
        <div>
          <div className="speech inline-block mb-2">
            <span className="pixel text-xs">🛠️ KONTROL PANEL ADMIN & DATABASE</span>
          </div>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}>
            Kelola template frame, lihat riwayat sesi foto dari database, dan atur perangkat booth.
          </p>
        </div>
        <button className="pixel-btn-powder self-start sm:self-center" onClick={onBack}>
          ← Batal & Kembali
        </button>
      </div>

      {/* Database Status Banner */}
      <div className="pixel-box p-4 flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ background: dbConfigured ? "#ecfdf5" : "#fef9c3", border: `2px solid ${dbConfigured ? "#059669" : "#ca8a04"}` }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{dbConfigured ? "🟢" : "🟡"}</span>
          <div>
            <div className="pixel text-[10px] font-bold">
              {dbConfigured ? "DATABASE CLOUD: TERHUBUNG KE SUPABASE" : "DATABASE LOKAL: MODE OFFLINE / FALLBACK"}
            </div>
            <p className="text-xs text-slate-700" style={{ fontFamily: "var(--font-body)" }}>
              {dbConfigured
                ? "Template & foto otomatis tersinkronisasi ke Cloud PostgreSQL & Supabase Storage."
                : "Menggunakan browser IndexedDB & LocalStorage. Tambahkan kunci Supabase di Vercel/.env untuk cloud sync."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestDB}
            disabled={dbTestResult.testing}
            className="pixel text-[8px] px-3 py-1.5 bg-white border-2 border-[var(--color-ink)] hover:bg-slate-50 cursor-pointer"
          >
            {dbTestResult.testing ? "Menguji..." : "🔍 Tes Koneksi DB"}
          </button>
          <button
            onClick={() => setMainTab("db")}
            className="pixel text-[8px] px-3 py-1.5 bg-[var(--color-butter)] border-2 border-[var(--color-ink)] hover:brightness-105 cursor-pointer"
          >
            ⚙️ Panduan DB
          </button>
        </div>
      </div>

      {dbTestResult.message && (
        <div className={`p-3 border-2 pixel text-[9px] ${dbTestResult.success ? "bg-emerald-100 border-emerald-600 text-emerald-800" : "bg-amber-100 border-amber-600 text-amber-900"}`}>
          {dbTestResult.message}
        </div>
      )}

      {/* Main Admin Navigation Tabs */}
      <div className="flex gap-2 border-b-2 border-[var(--color-ink)] pb-2">
        <button
          onClick={() => setMainTab("templates")}
          className={`pixel text-[10px] px-4 py-2 border-2 border-[var(--color-ink)] cursor-pointer ${
            mainTab === "templates" ? "bg-[var(--color-butter)] font-bold shadow-[2px_2px_0_0_#3A2A40]" : "bg-white"
          }`}
        >
          🖼️ KELOLA TEMPLATE
        </button>
        <button
          onClick={() => setMainTab("history")}
          className={`pixel text-[10px] px-4 py-2 border-2 border-[var(--color-ink)] cursor-pointer ${
            mainTab === "history" ? "bg-[var(--color-butter)] font-bold shadow-[2px_2px_0_0_#3A2A40]" : "bg-white"
          }`}
        >
          📸 RIWAYAT FOTO BOOTH
        </button>
        <button
          onClick={() => setMainTab("db")}
          className={`pixel text-[10px] px-4 py-2 border-2 border-[var(--color-ink)] cursor-pointer ${
            mainTab === "db" ? "bg-[var(--color-butter)] font-bold shadow-[2px_2px_0_0_#3A2A40]" : "bg-white"
          }`}
        >
          🗄️ SETUP DATABASE VERCEL
        </button>
      </div>

      {/* TAB 1: MANAJEMEN TEMPLATE */}
      {mainTab === "templates" && (
        <div className="space-y-8">
          {/* Camera/Webcam Settings */}
          <div className="pixel-box p-6 space-y-4" style={{ background: "var(--color-butter)" }}>
            <div className="pixel text-[11px] font-bold border-b-2 border-[var(--color-ink)] pb-2 mb-2 text-center">
              📹 PENGATURAN KAMERA / WEBCAM
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}>
                Pilih kamera atau webcam eksternal yang ingin digunakan untuk photobooth ini. Pilihan akan disimpan otomatis ke database.
              </p>
              <div className="space-y-2">
                <label className="pixel text-[9px] block">PILIH KAMERA AKTIF</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="w-full p-2 border-2 border-[var(--color-ink)] bg-white text-sm cursor-pointer"
                  style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}
                >
                  <option value="">Default (Kamera Utama / Webcam Laptop)</option>
                  {devices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Kamera ${idx + 1} (${device.deviceId.substring(0, 8)}...)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Upload Form */}
          <div className="pixel-box p-6 space-y-4" style={{ background: "var(--color-lavender)" }}>
            <div className="pixel text-[11px] font-bold border-b-2 border-[var(--color-ink)] pb-2 mb-2 text-center">
              🎨 UNGGAH TEMPLATE BARU KE DATABASE
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column: Form fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="pixel text-[9px] block">NAMA TEMPLATE</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Misal: Frame Event Ultah"
                      className="w-full p-2 border-2 border-[var(--color-ink)] bg-white text-sm"
                      style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="pixel text-[9px] block">UKURAN LAYOUT</label>
                    <select
                      value={newLayout}
                      onChange={(e) => handleLayoutChange(e.target.value as any)}
                      className="w-full p-2 border-2 border-[var(--color-ink)] bg-white text-sm cursor-pointer"
                      style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}
                    >
                      <option value="3x1">Strip Vertikal (3x1)</option>
                      <option value="3x2">Grid 6 Foto (3x2)</option>
                      <option value="2x2">Grid 2x2 (2x2)</option>
                      <option value="2x1">Strip Pendek (2x1)</option>
                      <option value="1x1">Foto Tunggal (1x1)</option>
                      <option value="4x2">Grid 8 Foto (4x2)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="pixel text-[9px] block">PRESET TATA LETAK LUBANG</label>
                    <select
                      value={newPreset}
                      onChange={(e) => setNewPreset(e.target.value)}
                      className="w-full p-2 border-2 border-[var(--color-ink)] bg-white text-sm cursor-pointer"
                      style={{ fontFamily: "var(--font-body)", fontSize: "1.2rem" }}
                    >
                      {HOLE_PRESETS[newLayout].map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column: File dropzone & Save button */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="pixel text-[9px] block">GAMBAR FRAME (.PNG TRANSPARAN)</label>
                    <input
                      type="file"
                      accept=".png,image/png"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                      id="frame-file-input"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[var(--color-ink)] p-4 text-center cursor-pointer bg-white hover:bg-slate-50 transition-colors flex-1 flex flex-col justify-center items-center"
                      style={{ minHeight: "120px" }}
                    >
                      {base64Img ? (
                        <div className="space-y-2">
                          <img
                            src={base64Img}
                            alt="Pratinjau unggahan"
                            className="max-h-24 mx-auto object-contain bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:12px_12px]"
                          />
                          <span className="text-[10px] text-muted-foreground block" style={{ fontFamily: "var(--font-body)" }}>
                            Klik untuk ganti gambar
                          </span>
                        </div>
                      ) : (
                        <div className="py-2 space-y-1">
                          <span className="text-2xl block">🖼️</span>
                          <span className="pixel text-[8px] block">PILIH FILE PNG</span>
                          <span className="text-xs text-muted-foreground block" style={{ fontFamily: "var(--font-body)" }}>
                            Gunakan latar belakang transparan untuk lubang foto
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-2 border-2 border-red-500 bg-red-50 text-red-700 text-xs pixel text-[8px]">
                      ⚠️ {uploadError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !newName || !base64Img}
                    className="w-full pixel-btn-sage cursor-pointer"
                  >
                    {isSubmitting ? "MENYIMPAN KE DATABASE..." : "💾 SIMPAN TEMPLATE KE DATABASE"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Bottom: Manage Templates List */}
          <div className="space-y-6">
            {/* Tab Headers */}
            <div className="flex flex-wrap gap-2 border-b-4 border-[var(--color-ink)] pb-1">
              {(["3x1", "3x2", "2x2", "2x1", "1x1", "4x2"] as const).map((l) => {
                const active = activeTab === l;
                return (
                  <button
                    key={l}
                    onClick={() => setActiveTab(l)}
                    className={`pixel text-[9px] px-3 py-2 border-2 border-b-0 border-[var(--color-ink)] transition-colors ${
                      active
                        ? "bg-[var(--color-butter)] font-bold translate-y-[4px]"
                        : "bg-white hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <div className="speech inline-block w-full">
              <span className="pixel text-[10px] font-bold block mb-2">
                Daftar Frame untuk {LAYOUT_LABELS[activeTab]} (Tersimpan di Database)
              </span>
            </div>

            {/* Cards list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-full pixel-box p-8 text-center" style={{ background: "white" }}>
                  <span className="text-2xl block mb-2">📭</span>
                  <span className="pixel text-[9px] block">Tidak ada template untuk layout ini.</span>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="pixel-box p-4 flex flex-col justify-between space-y-4"
                    style={{
                      background: template.enabled ? "white" : "#e2e8f0",
                      opacity: template.enabled ? 1 : 0.75,
                    }}
                  >
                    <div className="flex gap-4">
                      {/* Frame Preview */}
                      <div className="w-16 h-24 border-2 border-[var(--color-ink)] bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        {template.img ? (
                          <img
                            src={template.img}
                            alt={template.name}
                            className="w-full h-full object-contain bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:8px_8px]"
                          />
                        ) : (
                          <div className="text-center p-1 text-[8px] pixel opacity-40">
                            {template.name === "Polos" ? "🎞️ POLOS" : "NO IMG"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="pixel text-[9px] font-bold truncate block">{template.name}</span>
                          {template.isCustom ? (
                            <span className="pixel text-[6px] bg-[var(--color-sage)] text-white px-1 py-0.5 rounded">
                              KUSTOM
                            </span>
                          ) : (
                            <span className="pixel text-[6px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded">
                              BAWAAN
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}>
                          Preset: {template.presetId}
                        </p>
                        <p className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem" }}>
                          Status:{" "}
                          <span className={template.enabled ? "text-green-600 font-bold" : "text-red-500"}>
                            {template.enabled ? "AKTIF" : "NON-AKTIF"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t-2 border-slate-100 pt-3">
                      <button
                        onClick={() => onToggleTemplate(template.id, !template.enabled)}
                        className={`pixel text-[8px] px-3 py-1.5 border-2 border-[var(--color-ink)] cursor-pointer text-white font-bold transition-all hover:brightness-105 active:scale-95 ${
                          template.enabled ? "bg-green-600 shadow-[2px_2px_0_0_#14532d]" : "bg-red-500 shadow-[2px_2px_0_0_#7f1d1d]"
                        }`}
                      >
                        {template.enabled ? "✅ AKTIF (ON)" : "❌ MATI (OFF)"}
                      </button>

                      {template.isCustom ? (
                        <button
                          onClick={() => {
                            if (confirm(`Hapus template "${template.name}" dari database?`)) {
                              onDeleteTemplate(template.id);
                            }
                          }}
                          className="pixel text-[8px] px-2 py-1.5 border-2 border-red-700 bg-red-100 text-red-700 font-bold cursor-pointer hover:bg-red-200 active:scale-95 shadow-[2px_2px_0_0_#7f1d1d]"
                        >
                          🗑️ HAPUS
                        </button>
                      ) : (
                        template.name === "Polos" && template.layout !== "3x2" ? null : (
                          <span className="text-[10px] text-muted-foreground italic" style={{ fontFamily: "var(--font-body)" }}>
                            Sistem
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT FOTO BOOTH */}
      {mainTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="speech inline-block">
              <span className="pixel text-[10px]">DAFTAR FOTO JALAN / SESI PHOTOBOOTH</span>
            </div>
            <button
              onClick={loadSessions}
              disabled={loadingSessions}
              className="pixel text-[8px] px-3 py-1.5 bg-white border-2 border-[var(--color-ink)] hover:bg-slate-50 cursor-pointer"
            >
              {loadingSessions ? "Memuat..." : "🔄 Segarkan Data"}
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <div className="pixel-box p-12 text-center bg-white">
              <span className="text-3xl block mb-2">📸</span>
              <p className="pixel text-[10px] text-slate-600">Belum ada sesi foto yang tersimpan di database.</p>
              <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                Setelah pengunjung selesai berfoto di Photobooth, hasil foto otomatis tersimpan di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentSessions.map((s, idx) => (
                <div key={s.id || idx} className="pixel-box p-4 bg-white flex flex-col justify-between space-y-3">
                  <div className="aspect-[2/3] bg-slate-100 border-2 border-[var(--color-ink)] overflow-hidden flex items-center justify-center relative">
                    {s.strip_url ? (
                      <img src={s.strip_url} alt="Strip foto" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">Tidak ada gambar</span>
                    )}
                    {s.gif_url && (
                      <span className="absolute top-1 right-1 pixel text-[6px] bg-purple-600 text-white px-1 py-0.5 rounded shadow">
                        GIF
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="pixel text-[9px] font-bold">{s.session_code || `Sesi #${idx + 1}`}</span>
                      <span className="pixel text-[7px] bg-[var(--color-butter)] px-1.5 py-0.5 border border-[var(--color-ink)]">
                        {s.layout}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString("id-ID") : "Baru saja"}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <a
                      href={s.strip_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 pixel text-[8px] text-center py-1.5 bg-blue-50 text-blue-700 border border-blue-600 hover:bg-blue-100 font-bold"
                    >
                      Buka Foto
                    </a>
                    {s.gif_url && (
                      <a
                        href={s.gif_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 pixel text-[8px] text-center py-1.5 bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-100 font-bold"
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

      {/* TAB 3: SETUP DATABASE VERCEL */}
      {mainTab === "db" && (
        <div className="pixel-box p-6 space-y-6 bg-white">
          <div className="border-b-2 border-[var(--color-ink)] pb-3">
            <h3 className="pixel text-sm font-bold">🗄️ PANDUAN PENGATURAN DATABASE & DEPLOY VERCEL</h3>
            <p className="text-sm text-slate-600 mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "1.15rem" }}>
              Ikuti 3 langkah mudah berikut untuk menghubungkan database Supabase dan deploy ke Vercel:
            </p>
          </div>

          <div className="space-y-4" style={{ fontFamily: "var(--font-body)", fontSize: "1.15rem" }}>
            <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded space-y-2">
              <div className="pixel text-[10px] font-bold text-slate-800">1. BUAT PROJECT SUPABASE (GRATIS)</div>
              <p className="text-xs text-slate-600">
                Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com</a> dan buat project baru.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded space-y-2">
              <div className="pixel text-[10px] font-bold text-slate-800">2. JALANKAN SQL SCHEMA</div>
              <p className="text-xs text-slate-600">
                Buka menu <strong>SQL Editor</strong> di dashboard Supabase, lalu copy & paste seluruh isi file{" "}
                <code>supabase_schema.sql</code> dari proyek ini, lalu klik <strong>Run</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded space-y-2">
              <div className="pixel text-[10px] font-bold text-slate-800">3. MASUKKAN ENVIRONMENT VARIABLES DI VERCEL</div>
              <p className="text-xs text-slate-600">
                Pada dashboard Vercel -&gt; <strong>Settings -&gt; Environment Variables</strong>, masukkan 2 variabel berikut:
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono space-y-1">
                <div>VITE_SUPABASE_URL = https://your-project-ref.supabase.co</div>
                <div>VITE_SUPABASE_ANON_KEY = eyJhbGciOi...</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
