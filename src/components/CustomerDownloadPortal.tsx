import { useEffect, useState } from "react";
import { SessionDB, PhotoboothSession } from "@/lib/db";
import { saveSupabaseCredentials } from "@/lib/supabase";
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
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import yodhaLogo from "@/assets/yodha.png";
import {
  detectHolesFromImage,
  loadImg,
  composeLiveVideoFrame,
  composeLiveGifFrame,
  generate12sGifFromVideo,
  convertBlobToMp4,
} from "@/lib/frameLive";

interface CustomerDownloadPortalProps {
  sessionCode: string;
}

export function CustomerDownloadPortal({
  sessionCode,
}: CustomerDownloadPortalProps) {
  const [session, setSession] = useState<PhotoboothSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"strip" | "gif" | "live" | "raw">("strip");
  const [retryCount, setRetryCount] = useState(0);
  const [stripLoaded, setStripLoaded] = useState(false);

  // Dynamic GIF generation fallback
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);

  // Live Photo interactive player state
  const [liveIndex, setLiveIndex] = useState(0);
  const [liveForward, setLiveForward] = useState(true);
  const [isLivePlaying, setIsLivePlaying] = useState(true);
  const [liveSpeed, setLiveSpeed] = useState(400);

  useEffect(() => {
    let active = true;
    let pollTimer: any = null;

    // Read Supabase key & url passed via QR Code URL
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const k = urlParams.get("k");
        const u = urlParams.get("u");
        if (k && k.trim()) {
          saveSupabaseCredentials(
            (u && u.trim()) || localStorage.getItem("yodha_supabase_url") || "",
            k.trim()
          );
        }
      } catch {}
    }

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
            // Fast polling: check every 600ms - 1200ms up to 10 retries
            if (retryCount < 10) {
              const delay = Math.min(1200, 600 + retryCount * 120);
              pollTimer = setTimeout(() => {
                if (active) setRetryCount((prev) => prev + 1);
              }, delay);
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

  // Sync GIF from session
  useEffect(() => {
    if (!session) return;
    if (session.gif_url) {
      setGifUrl(session.gif_url);
    }
  }, [session]);

  // Lightweight background sync: polls for completed live videos & GIF without freezing the UI
  useEffect(() => {
    if (!session) return;
    const needsVideos = !session.live_videos || session.live_videos.length === 0;
    const needsGif = !session.gif_url;
    if (!needsVideos && !needsGif) return;

    let pollCount = 0;
    const timer = setInterval(async () => {
      pollCount++;
      if (pollCount > 12) {
        clearInterval(timer);
        return;
      }
      try {
        const sessionDB = new SessionDB();
        const fresh = await sessionDB.getSessionByCode(sessionCode);
        if (fresh) {
          const gotNewGif = fresh.gif_url && !session.gif_url;
          const gotNewVideos = (fresh.live_videos?.length || 0) > (session.live_videos?.length || 0);
          const gotNewPhotos = (fresh.raw_photos?.length || 0) > (session.raw_photos?.length || 0);

          if (gotNewGif || gotNewVideos || gotNewPhotos) {
            setSession(fresh);
            if (fresh.gif_url) setGifUrl(fresh.gif_url);
          }
        }
      } catch {}
    }, 2000);

    return () => clearInterval(timer);
  }, [session, sessionCode]);

  // Live Photo Boomerang animation loop
  useEffect(() => {
    const rawList = session?.raw_photos;
    if (!rawList || rawList.length <= 1 || !isLivePlaying) return;
    const interval = setInterval(() => {
      setLiveIndex((prev) => {
        const total = rawList.length;
        if (total <= 1) return 0;
        if (liveForward) {
          if (prev >= total - 1) {
            setLiveForward(false);
            return Math.max(0, prev - 1);
          }
          return prev + 1;
        } else {
          if (prev <= 0) {
            setLiveForward(true);
            return Math.min(total - 1, 1);
          }
          return prev - 1;
        }
      });
    }, liveSpeed);
    return () => clearInterval(interval);
  }, [session?.raw_photos, isLivePlaying, liveForward, liveSpeed]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 45000);
  };

  const triggerDownload = async (url: string, filename: string) => {
    try {
      if (url.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      if (url.startsWith("data:")) {
        const res = await fetch(url);
        const blob = await res.blob();
        downloadBlob(blob, filename);
        return;
      }

      // Supabase or external storage: fetch as Blob first so mobile browsers honor download attribute
      const res = await fetch(url);
      let blob = await res.blob();

      // If downloading an MP4 video, check if it's already a valid MP4 container (has 'ftyp' box)
      // If it's WebM (e.g. from an older session recorded before today), convert it to genuine H.264 MP4
      if (filename.endsWith(".mp4")) {
        const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        const isAlreadyMp4 =
          head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
        const isWebm =
          head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;

        if (isWebm || !isAlreadyMp4) {
          try {
            const converted = await convertBlobToMp4(blob);
            if (converted && converted.size > 0) {
              blob = converted;
            }
          } catch (convErr) {
            console.warn("Client-side MP4 conversion fallback:", convErr);
          }
        }
      }

      downloadBlob(blob, filename);
    } catch (e) {
      console.warn("Fetch blob download failed, falling back to direct anchor:", e);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadAll = () => {
    if (!session) return;
    if (session.strip_url) {
      triggerDownload(session.strip_url, `${session.session_code}_strip.png`);
    }
    const finalGif = gifUrl || session.gif_url;
    if (finalGif) {
      setTimeout(() => {
        triggerDownload(finalGif, `${session.session_code}_animation.gif`);
      }, 500);
    }
    if (session.live_photo_url) {
      setTimeout(() => {
        triggerDownload(session.live_photo_url!, `${session.session_code}_live_framed.mp4`);
      }, 900);
    }
    if (session.raw_photos && session.raw_photos.length > 0) {
      session.raw_photos.forEach((photoUrl, idx) => {
        setTimeout(() => {
          triggerDownload(photoUrl, `${session.session_code}_photo_${idx + 1}.png`);
        }, 1300 + idx * 400);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-18 h-18 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          </div>
        </div>

        <span className="text-[11px] font-mono text-blue-300 font-bold bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800/60 mb-2.5">
          Sesi: {sessionCode}
        </span>

        <h2 className="text-lg font-black text-slate-100">Memuat Hasil Foto Kamu...</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          {retryCount === 0
            ? "Menghubungkan ke penyimpanan cloud photobooth..."
            : "Sinkronisasi foto dengan photobooth..."}
        </p>

        {retryCount > 1 && (
          <div className="mt-3 flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span className="text-[10px] text-slate-400">Sinkronisasi data (upaya {retryCount}/10)...</span>
          </div>
        )}
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
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
        >
          🔄 Muat Ulang Halaman
        </button>
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
        <div className="grid grid-cols-4 gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl text-[11px] font-bold text-slate-400 shadow-inner">
          <button
            onClick={() => setActiveTab("strip")}
            className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "strip"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Frame</span>
          </button>

          <button
            onClick={() => setActiveTab("gif")}
            className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "gif"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">GIF</span>
          </button>

          <button
            onClick={() => setActiveTab("live")}
            className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "live"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-pulse" />
            <span className="truncate">Foto Live</span>
          </button>

          <button
            onClick={() => setActiveTab("raw")}
            className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "raw"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Asli ({rawPhotos.length})</span>
          </button>
        </div>

        {/* ── TAB 1: HASIL FOTO BERBINGKAI (STRIP) ── */}
        {activeTab === "strip" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
              <div className="w-full max-w-[340px] aspect-[2/3] max-h-[520px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl border border-slate-800/80 p-1 relative">
                {!stripLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-400 space-y-2">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[11px] font-medium text-slate-400">Menampilkan foto HD...</span>
                  </div>
                )}
                <img
                  src={session.strip_url}
                  alt="Hasil Foto Photostrip"
                  onLoad={() => setStripLoaded(true)}
                  className={`w-full h-full object-contain rounded-lg transition-opacity duration-300 ${stripLoaded ? "opacity-100" : "opacity-0"}`}
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

        {/* ── TAB 2: ANIMASI GIF ── */}
        {activeTab === "gif" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              {gifUrl || session.gif_url ? (
                <>
                  <div className="w-full max-w-[340px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl border border-slate-800/80 p-2">
                    <img
                      src={(gifUrl || session.gif_url)!}
                      alt="Animasi GIF Photobooth"
                      className="w-full h-auto object-contain rounded-lg"
                    />
                  </div>

                  <div className="pt-2 text-center">
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                      Rasio Kamera Asli Photobooth · Durasi 12 Detik
                    </span>
                  </div>

                  <div className="w-full pt-4 space-y-2">
                    <button
                      onClick={() => triggerDownload((gifUrl || session.gif_url)!, `${session.session_code}_animation.gif`)}
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Animasi GIF (.gif)</span>
                    </button>
                    <a
                      href={(gifUrl || session.gif_url)!}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka GIF di Tab Baru</span>
                    </a>
                  </div>
                </>
              ) : isGeneratingGif ? (
                <div className="py-16 text-center space-y-3 text-slate-400">
                  <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-200">Sedang merender animasi GIF 12 detik...</p>
                  <p className="text-[10px] text-slate-500">Menggabungkan seluruh pose foto dengan rasio asli kamera</p>
                </div>
              ) : rawPhotos.length > 0 ? (
                <div className="py-12 text-center space-y-3 text-slate-400">
                  <Film className="w-12 h-12 mx-auto text-purple-400 opacity-80" />
                  <p className="text-xs font-semibold text-slate-200">Animasi GIF sedang diproses booth</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Kamu juga bisa membuat animasi GIF 12 detik langsung di HP sekarang:
                  </p>
                  <button
                    onClick={async () => {
                      setIsGeneratingGif(true);
                      try {
                        const generated = await generateGifFromPhotos(rawPhotos, 640, 500, 12000);
                        if (generated) setGifUrl(generated);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsGeneratingGif(false);
                      }
                    }}
                    className="mt-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    <span>Buat GIF 12 Detik Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <Film className="w-12 h-12 mx-auto opacity-40 text-purple-400" />
                  <p className="text-xs font-semibold text-slate-300">Animasi GIF tidak tersedia untuk sesi ini</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: FOTO LIVE (VIDEO 3 DETIK MASUK KE DALAM FRAME) ── */}
        {activeTab === "live" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
              {session.live_videos && session.live_videos.length > 0 ? (
                <FramedLiveView session={session} triggerDownload={triggerDownload} />
              ) : rawPhotos.length > 0 ? (
                <>
                  <div
                    onClick={() => setIsLivePlaying((p) => !p)}
                    className="relative w-full max-w-[340px] aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl border-2 border-amber-500/30 cursor-pointer select-none group"
                  >
                    <img
                      src={rawPhotos[liveIndex % rawPhotos.length]}
                      alt="Foto Live"
                      className="w-full h-full object-cover transition-transform duration-100"
                    />

                    {/* iOS Live Photo Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      <span>LIVE</span>
                    </div>

                    {/* Frame Indicator */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/50 text-slate-300 text-[10px] font-mono backdrop-blur-xs">
                      {liveIndex + 1}/{rawPhotos.length}
                    </div>

                    {/* Touch / Click Hint */}
                    <div className="absolute bottom-3 inset-x-3 py-1 px-2 rounded-lg bg-black/60 backdrop-blur-md text-center text-[10px] text-slate-200 opacity-80 group-hover:opacity-100 transition-opacity">
                      {isLivePlaying ? "Sentuh untuk jeda gerakan" : "Sentuh untuk putar gerakan"}
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="w-full flex items-center justify-between gap-2 pt-4 pb-2 border-b border-slate-800">
                    <button
                      onClick={() => setIsLivePlaying((p) => !p)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isLivePlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{isLivePlaying ? "Jeda" : "Putar"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 mr-1">Kecepatan:</span>
                      {[500, 350, 200].map((speed, i) => (
                        <button
                          key={speed}
                          onClick={() => setLiveSpeed(speed)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                            liveSpeed === speed ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {i === 0 ? "0.7x" : i === 1 ? "1.0x" : "1.5x"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full pt-3 space-y-2">
                    <button
                      onClick={() => {
                        const dl = gifUrl || session.gif_url;
                        if (dl) {
                          triggerDownload(dl, `${session.session_code}_live_photo.gif`);
                        } else if (rawPhotos[0]) {
                          triggerDownload(rawPhotos[0], `${session.session_code}_live_photo.jpg`);
                        }
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Foto Live (.gif)</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">
                      Foto live bergerak berulang menampilkan pose kamu secara berurutan.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <Sparkles className="w-12 h-12 mx-auto opacity-40 text-amber-400" />
                  <p className="text-xs font-semibold text-slate-300">Foto live tidak tersedia untuk sesi ini</p>
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

/**
 * Visual Framed Live Photo Player & Exporter
 * Displays 3-second live pose videos playing inside photo frame holes simultaneously!
 */
function FramedLiveView({
  session,
  triggerDownload,
}: {
  session: PhotoboothSession;
  triggerDownload: (url: string, filename: string) => Promise<void> | void;
}) {
  const liveVideos = session.live_videos || [];
  const [holes, setHoles] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  const [frameAspect, setFrameAspect] = useState<number>(2 / 3);
  const [isComposing, setIsComposing] = useState(false);
  const [isComposingGif, setIsComposingGif] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [singleGifLoadingIdx, setSingleGifLoadingIdx] = useState<number | null>(null);

  const templateSrc = session.template_url || "";

  useEffect(() => {
    let active = true;
    async function loadTemplate() {
      if (templateSrc) {
        try {
          const img = await loadImg(templateSrc);
          if (!active) return;
          const detected = detectHolesFromImage(img);
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w && h) setFrameAspect(w / h);

          if (detected.length > 0) {
            setHoles(
              detected.map((hObj) => ({
                left: (hObj.x / w) * 100,
                top: (hObj.y / h) * 100,
                width: (hObj.w / w) * 100,
                height: (hObj.h / h) * 100,
              }))
            );
            return;
          }
        } catch (err) {
          console.warn("Could not load template image for live holes:", err);
        }
      }

      // Default layout holes fallback if template overlay has no detected holes
      const l = session.layout || "4x2";
      if (l === "4x2") {
        const hArr = [];
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 2; c++) {
            hArr.push({
              left: 5 + c * 48,
              top: 5 + r * 23.5,
              width: 42,
              height: 21,
            });
          }
        }
        setHoles(hArr);
        setFrameAspect(10 / 15);
      } else if (l === "3x2") {
        const hArr = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 2; c++) {
            hArr.push({
              left: 6 + c * 47,
              top: 5 + r * 30,
              width: 41,
              height: 27,
            });
          }
        }
        setHoles(hArr);
        setFrameAspect(10 / 15);
      } else if (l === "2x1") {
        setHoles([
          { left: 10, top: 8, width: 80, height: 42 },
          { left: 10, top: 52, width: 80, height: 42 },
        ]);
        setFrameAspect(5 / 15);
      } else if (l === "1x1") {
        setHoles([{ left: 8, top: 8, width: 84, height: 75 }]);
        setFrameAspect(10 / 15);
      } else {
        // 3x1
        setHoles([
          { left: 10, top: 6, width: 80, height: 28 },
          { left: 10, top: 36, width: 80, height: 28 },
          { left: 10, top: 66, width: 80, height: 28 },
        ]);
        setFrameAspect(5 / 15);
      }
    }

    loadTemplate();
    return () => {
      active = false;
    };
  }, [templateSrc, session.layout]);

  // Download Framed Live GIF (12 Seconds Loop)
  const handleDownloadFramedGif = async () => {
    if (isComposingGif) return;
    setIsComposingGif(true);
    setDownloadProgress("Menyiapkan GIF 12 detik (4x loop)...");
    try {
      const targetTemplate = session.template_url || session.strip_url;
      const gifDataUrl = await composeLiveGifFrame(
        targetTemplate,
        liveVideos,
        session.layout || "4x2",
        420,
        8,
        4 // 3s x 4 repeats = 12 seconds!
      );
      if (gifDataUrl) {
        await triggerDownload(gifDataUrl, `${session.session_code}_live_12s_loop.gif`);
      } else {
        alert("Gagal merender GIF berbingkai di browser ini.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Gagal merender GIF: " + (e?.message || "Format tidak didukung"));
    } finally {
      setIsComposingGif(false);
      setDownloadProgress("");
    }
  };

  // Download Single Pose 12-second GIF
  const handleDownloadSingleGif = async (vUrl: string, idx: number) => {
    if (singleGifLoadingIdx !== null) return;
    setSingleGifLoadingIdx(idx);
    try {
      const gifDataUrl = await generate12sGifFromVideo(vUrl, 440, 8, 4);
      if (gifDataUrl) {
        await triggerDownload(gifDataUrl, `${session.session_code}_pose_${idx + 1}_12s.gif`);
      }
    } catch (e: any) {
      console.error(e);
      alert("Gagal membuat GIF: " + (e?.message || "Format video tidak didukung"));
    } finally {
      setSingleGifLoadingIdx(null);
    }
  };

  const handleDownloadFramedVideo = async () => {
    if (isComposing) return;
    setIsComposing(true);
    setDownloadProgress("Menyiapkan video MP4 HD...");
    try {
      if (
        session.live_photo_url &&
        (session.live_photo_url.includes(".webm") || session.live_photo_url.includes(".mp4"))
      ) {
        await triggerDownload(session.live_photo_url, `${session.session_code}_live_framed.mp4`);
        return;
      }

      setDownloadProgress("Merender video frame live MP4 HD...");
      const targetTemplate = session.template_url || session.strip_url;
      const compositeUrl = await composeLiveVideoFrame(targetTemplate, liveVideos, session.layout || "4x2");
      if (compositeUrl) {
        await triggerDownload(compositeUrl, `${session.session_code}_live_framed.mp4`);
      } else {
        alert("Gagal merender video frame live di browser ini.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Gagal merender video: " + (e?.message || "Format video tidak didukung"));
    } finally {
      setIsComposing(false);
      setDownloadProgress("");
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Framed Video Container */}
      <div
        className="relative w-full max-w-[320px] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40 bg-slate-950 flex items-center justify-center select-none"
        style={{ aspectRatio: `${frameAspect}` }}
      >
        {/* Videos inside frame holes */}
        {holes.map((hole, i) => {
          const videoIdx = session.layout === "4x2" ? Math.floor(i / 2) : i;
          const vSrc = liveVideos[videoIdx % liveVideos.length];
          return (
            <div
              key={i}
              className="absolute overflow-hidden bg-slate-900"
              style={{
                left: `${hole.left}%`,
                top: `${hole.top}%`,
                width: `${hole.width}%`,
                height: `${hole.height}%`,
              }}
            >
              {vSrc ? (
                <video
                  src={vSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                  Pose #{videoIdx + 1}
                </div>
              )}
            </div>
          );
        })}

        {/* Frame Overlay */}
        {templateSrc && (
          <img
            src={templateSrc}
            alt="Bingkai Photobooth"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
          />
        )}

        {/* Live Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>LIVE PHOTO 5s</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-2.5">
        {/* 1. Main Action: Download Framed Video in HD MP4 */}
        <button
          onClick={handleDownloadFramedVideo}
          disabled={isComposing || isComposingGif}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
        >
          {isComposing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{downloadProgress || "Merender video MP4 HD..."}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Unduh Video Foto Live Frame (HD .mp4)</span>
            </>
          )}
        </button>

        {/* 2. Optional: Download Framed GIF */}
        <button
          onClick={handleDownloadFramedGif}
          disabled={isComposingGif || isComposing}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-slate-700"
        >
          {isComposingGif ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
              <span>{downloadProgress || "Merender animasi GIF..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Unduh Versi Animasi GIF (Loop)</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          Foto live berformat MP4 kualitas HD menampilkan video 5 detik di dalam bingkai foto.
        </p>

        {/* 3. Download Individual 3s Video per pose */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>Unduh Klip Video Per Gaya (.mp4 HD):</span>
          </div>
          <div className="space-y-1.5">
            {liveVideos.map((vUrl, idx) => (
              <div
                key={idx}
                className="p-2 bg-slate-800/80 rounded-xl flex items-center justify-between gap-2 border border-slate-700/60"
              >
                <span className="text-[11px] font-bold text-slate-200">Gaya #{idx + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => triggerDownload(vUrl, `${session.session_code}_pose_${idx + 1}.mp4`)}
                    className="py-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span>Video HD (.mp4)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSingleGif(vUrl, idx)}
                    disabled={singleGifLoadingIdx === idx}
                    className="py-1 px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {singleGifLoadingIdx === idx ? (
                      <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    )}
                    <span>GIF (12s)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
