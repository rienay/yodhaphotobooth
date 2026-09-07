import { useEffect, useState } from "react";
import { SessionDB, PhotoboothSession } from "@/lib/db";
import {
  Download,
  Share2,
  Check,
  Sparkles,
  Camera,
  Film,
  Image as ImageIcon,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import yodhaLogo from "@/assets/yodha.png";

interface CustomerDownloadPortalProps {
  sessionCode: string;
  onBackToBooth?: () => void;
}

export function CustomerDownloadPortal({
  sessionCode,
  onBackToBooth,
}: CustomerDownloadPortalProps) {
  const [session, setSession] = useState<PhotoboothSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"strip" | "gif" | "raw">("strip");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    let pollTimer: any = null;

    async function fetchSession() {
      if (retryCount === 0) setLoading(true);
      setError("");
      try {
        const sessionDB = new SessionDB();
        const data = await sessionDB.getSessionByCode(sessionCode);
        if (active) {
          if (data) {
            setSession(data);
            setLoading(false);
          } else {
            // If still uploading, retry up to 6 times (every 1.5 seconds)
            if (retryCount < 6) {
              pollTimer = setTimeout(() => {
                if (active) setRetryCount((prev) => prev + 1);
              }, 1500);
            } else {
              setError(`Sesi foto "${sessionCode}" belum ditemukan atau belum selesai tersimpan.`);
              setLoading(false);
            }
          }
        }
      } catch (e: any) {
        if (active) {
          setError(e?.message || "Gagal memuat sesi foto.");
          setLoading(false);
        }
      }
    }
    fetchSession();
    return () => {
      active = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [sessionCode, retryCount]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    if (!session) return;
    if (session.strip_url) {
      triggerDownload(session.strip_url, `${session.session_code}_strip.png`);
    }
    if (session.gif_url) {
      setTimeout(() => {
        triggerDownload(session.gif_url!, `${session.session_code}_animation.gif`);
      }, 500);
    }
    if (session.raw_photos && session.raw_photos.length > 0) {
      session.raw_photos.forEach((photoUrl, idx) => {
        setTimeout(() => {
          triggerDownload(photoUrl, `${session.session_code}_photo_${idx + 1}.png`);
        }, 1000 + idx * 400);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold text-slate-100">Memuat Hasil Foto Kamu...</h2>
        <p className="text-xs text-slate-400 mt-1">Mengambil foto dan animasi dari cloud storage</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-red-400">{error || "Foto Tidak Ditemukan"}</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          Pastikan kode sesi foto sudah benar atau coba segarkan kembali halaman ini.
        </p>
        {onBackToBooth && (
          <button
            onClick={onBackToBooth}
            className="mt-6 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Kembali ke Booth
          </button>
        )}
      </div>
    );
  }

  const rawPhotos = session.raw_photos || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white pb-16">
      {/* ── Top Header Bar ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={yodhaLogo} alt="Yodha Photobooth" className="h-7 w-auto object-contain" />
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-blue-400 block leading-tight">
                Yodha Photobooth
              </span>
              <span className="text-[10px] text-slate-400">Portal Unduh Pengunjung</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60 cursor-pointer"
              title="Salin Tautan Sesi"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copied ? "Tersalin!" : "Bagikan"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-xl mx-auto px-4 pt-5 space-y-5">
        {/* Welcome & Session Banner */}
        <div className="bg-gradient-to-br from-blue-900/40 via-indigo-900/20 to-purple-900/30 border border-blue-500/20 rounded-2xl p-4.5 text-center relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <Sparkles className="w-24 h-24 text-blue-400" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-wide uppercase mb-2">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Sesi Berhasil Disimpan</span>
          </span>
          <h1 className="text-lg font-black text-white">Hasil Foto Kamu Sudah Siap!</h1>
          <p className="text-xs text-slate-300 mt-1">
            Simpan foto berbingkai, animasi GIF, dan seluruh foto asli kamu di bawah ini.
          </p>

          <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-400 font-mono">
            <span>Kode: <strong className="text-blue-300">{session.session_code}</strong></span>
            <span>•</span>
            <span>{session.created_at ? new Date(session.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Baru saja"}</span>
          </div>

          <button
            onClick={handleDownloadAll}
            className="mt-4 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Semua Foto & GIF Sekaligus</span>
          </button>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl text-xs font-bold text-slate-400 shadow-inner">
          <button
            onClick={() => setActiveTab("strip")}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "strip"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Foto Frame</span>
          </button>

          <button
            onClick={() => setActiveTab("gif")}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "gif"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Animasi GIF</span>
          </button>

          <button
            onClick={() => setActiveTab("raw")}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "raw"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto Asli ({rawPhotos.length})</span>
          </button>
        </div>

        {/* ── TAB 1: HASIL FOTO BERBINGKAI (STRIP) ── */}
        {activeTab === "strip" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
              <div className="w-full max-w-[340px] aspect-[2/3] max-h-[520px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl border border-slate-800/80 p-1">
                <img
                  src={session.strip_url}
                  alt="Hasil Foto Photostrip"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>

              <div className="w-full pt-4 space-y-2">
                <button
                  onClick={() => triggerDownload(session.strip_url, `${session.session_code}_strip.png`)}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Photostrip Bingkai (HD)</span>
                </button>
                <a
                  href={session.strip_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Gambar Ukuran Penuh</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ANIMASI GIF & LIVE PHOTO ── */}
        {activeTab === "gif" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
              {session.gif_url ? (
                <>
                  <div className="w-full max-w-[340px] aspect-square bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl border border-slate-800/80 p-1">
                    <img
                      src={session.gif_url}
                      alt="Animasi GIF Photobooth"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <div className="w-full pt-4 space-y-2">
                    <button
                      onClick={() => triggerDownload(session.gif_url!, `${session.session_code}_animation.gif`)}
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Animasi GIF</span>
                    </button>
                    <a
                      href={session.gif_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka GIF di Tab Baru</span>
                    </a>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <Film className="w-12 h-12 mx-auto opacity-40 text-purple-400" />
                  <p className="text-xs font-semibold text-slate-300">Animasi GIF tidak tersedia untuk sesi ini</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: FOTO ASLI MENTAH (RAW CAPTURES) ── */}
        {activeTab === "raw" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Seluruh Foto Mentah (Raw Captures)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Foto asli yang diambil kamera sebelum dimasukkan ke dalam bingkai
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                  {rawPhotos.length} Foto
                </span>
              </div>

              {rawPhotos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Camera className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                  <p className="text-xs font-semibold text-slate-300">
                    Foto mentah tidak tersimpan secara terpisah untuk sesi ini.
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                    Anda tetap dapat mengunduh hasil foto berbingkai pada tab "Foto Frame".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {rawPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2 space-y-2 flex flex-col justify-between shadow-sm"
                    >
                      <div className="aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={photoUrl}
                          alt={`Foto Mentah #${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-slate-300">Foto #{idx + 1}</span>
                        <button
                          onClick={() => triggerDownload(photoUrl, `${session.session_code}_photo_${idx + 1}.png`)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title={`Unduh Foto #${idx + 1}`}
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer Info ── */}
        <footer className="text-center text-[10px] text-slate-500 pt-6 space-y-1">
          <p>© {new Date().getFullYear()} Yodha Photobooth · All Photos Saved Securely</p>
          <p>Terima kasih telah berfoto bersama Yodha Photobooth!</p>
        </footer>
      </main>
    </div>
  );
}
