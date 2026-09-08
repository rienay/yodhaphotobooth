import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  CreditCard,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  getXenditConfig,
  createDynamicQris,
  checkQrisPaymentStatus,
  simulateQrisPayment,
  isTestApiKey,
  XenditQrCode,
} from "@/lib/xendit";
import { FinanceDB, formatRupiah } from "@/lib/finance";

interface PaymentScreenProps {
  onPaid: () => void;
  onBack: () => void;
  layoutName?: string;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  onPaid,
  onBack,
  layoutName,
}) => {
  const [config, setConfig] = useState(() => getXenditConfig());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<XenditQrCode | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 menit

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const isPaidRef = useRef(false);

  const isTest = isTestApiKey(config.apiKey);

  // Generate reference ID unik
  const generateRefId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `YODHA-${timestamp}-${random}`;
  };

  // Buat kode QRIS baru
  const initQris = async () => {
    setLoading(true);
    setError(null);
    setQrData(null);
    setQrImageUrl(null);
    setIsPaid(false);
    isPaidRef.current = false;
    setTimeLeft(15 * 60);

    const currentConfig = getXenditConfig();
    setConfig(currentConfig);

    if (!currentConfig.apiKey) {
      setLoading(false);
      setError("API Key Xendit belum dikonfigurasi.");
      return;
    }

    const refId = generateRefId();
    const res = await createDynamicQris(currentConfig.price, refId, currentConfig.apiKey);

    if (!res.success || !res.qr) {
      setLoading(false);
      setError(res.error || "Gagal membuat kode QRIS. Periksa koneksi internet atau API Key.");
      return;
    }

    setQrData(res.qr);

    // Konversi qr_string ke Data URL gambar QR
    try {
      const url = await QRCode.toDataURL(res.qr.qr_string, {
        width: 360,
        margin: 1.5,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrImageUrl(url);
    } catch (err: any) {
      console.error("Gagal render QR image:", err);
      setError("Gagal merender gambar QR code.");
    } finally {
      setLoading(false);
    }
  };

  // Mulai generate QR saat komponen dipasang
  useEffect(() => {
    initQris();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Polling cek status pembayaran setiap 2.5 detik
  useEffect(() => {
    if (!qrData || isPaid) return;

    const checkStatus = async () => {
      if (isPaidRef.current) return;

      const statusRes = await checkQrisPaymentStatus(qrData.id, qrData.reference_id, config.apiKey);
      if (statusRes.isPaid && !isPaidRef.current) {
        handlePaymentSuccess(qrData);
      }
    };

    pollTimerRef.current = setInterval(checkStatus, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [qrData, isPaid]);

  // Countdown timer 15 menit
  useEffect(() => {
    if (!qrData || isPaid) return;

    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          setError("Waktu pembayaran telah habis. Silakan buat kode QR baru.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [qrData, isPaid]);

  // Handler saat pembayaran terkonfirmasi
  const handlePaymentSuccess = async (qr: XenditQrCode) => {
    isPaidRef.current = true;
    setIsPaid(true);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    // Catat otomatis ke modul Keuangan & Kas
    try {
      const financeDb = new FinanceDB();
      await financeDb.saveTransaction({
        type: "income",
        category: "photo_session",
        amount: config.price,
        paymentMethod: "qris",
        description: `Sesi Foto Booth QRIS (${qr.reference_id})`,
        notes: `Pembayaran otomatis via Xendit QRIS`,
        date: new Date().toISOString().split("T")[0],
        sessionCode: qr.reference_id,
      });
    } catch (e) {
      console.warn("Gagal mencatat transaksi ke FinanceDB:", e);
    }

    // Beri jeda 1.8 detik agar pengguna melihat animasi sukses sebelum masuk ke kamera
    setTimeout(() => {
      onPaid();
    }, 1800);
  };

  // Simulasi pembayaran di Mode Test
  const handleSimulatePayment = async () => {
    if (!qrData || simulating || isPaid) return;
    setSimulating(true);

    try {
      const res = await simulateQrisPayment(qrData.reference_id, config.price, config.apiKey);
      if (res.success) {
        await handlePaymentSuccess(qrData);
      } else {
        setError(res.error || "Simulasi pembayaran gagal.");
      }
    } catch (err: any) {
      setError(err.message || "Simulasi gagal dilakukan.");
    } finally {
      setSimulating(false);
    }
  };

  // Format menit:detik
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Kartu Utama Pembayaran */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Banner Mode Test (Hanya jika development key) */}
        {isTest && (
          <div className="w-full bg-amber-500 text-white text-[11px] font-bold py-1.5 px-4 -mt-6 -mx-8 sm:-mt-8 sm:-mx-8 mb-6 flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Mode Uji Coba Xendit (Development Test Mode)
          </div>
        )}

        {/* Header Pembayaran */}
        <div className="space-y-1.5 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-1 border border-blue-100">
            <CreditCard className="w-3.5 h-3.5" />
            Pembayaran QRIS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Pindai QRIS untuk Mulai
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Buka aplikasi e-wallet (GoPay, OVO, Dana, ShopeePay) atau mobile banking Anda dan pindai kode di bawah.
          </p>
        </div>

        {/* Kotak Nominal / Harga */}
        <div className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xs">
          <div className="text-left">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
              Total Tagihan
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(config.price)}
            </span>
          </div>
          {layoutName && (
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                Paket
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {layoutName}
              </span>
            </div>
          )}
        </div>

        {/* Kontainer QR Code atau Loading / Error */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner mb-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Menghubungkan ke Xendit...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-red-600 p-4 w-full max-w-xs">
              <AlertCircle className="w-10 h-10 shrink-0" />
              <p className="text-xs font-semibold text-center">{error}</p>
              <button
                onClick={initQris}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Lagi
              </button>
            </div>
          ) : isPaid ? (
            <div className="flex flex-col items-center gap-3 text-emerald-600 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-emerald-700">Pembayaran Berhasil!</h3>
              <p className="text-xs text-slate-600 font-medium">Membuka kamera photobooth...</p>
            </div>
          ) : (
            qrImageUrl && (
              <div className="w-full h-full flex flex-col items-center justify-between">
                {/* Header Logo QRIS */}
                <div className="w-full flex items-center justify-between px-2 pt-1 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black tracking-widest text-red-600">QRIS</span>
                  <span className="text-[10px] font-semibold text-slate-400">PEMBAYARAN DIGITAL</span>
                </div>

                {/* Gambar QR */}
                <div className="p-1 bg-white rounded-xl">
                  <img
                    src={qrImageUrl}
                    alt="Kode QRIS Xendit"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                  />
                </div>

                {/* Footer QRIS */}
                <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                  NMID: ID102002384920
                </div>
              </div>
            )
          )}
        </div>

        {/* Status Indikator & Countdown */}
        {!isPaid && !error && !loading && (
          <div className="w-full flex flex-col items-center gap-2 mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Menunggu pembayaran Anda...</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Kode kedaluwarsa dalam:</span>
              <span className="font-mono font-bold text-slate-700">{formatTime(timeLeft)}</span>
            </div>
          </div>
        )}

        {/* Supported E-Wallets & Banks */}
        <div className="w-full pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Mendukung:</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">BCA</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Mandiri</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">BRI</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">GoPay</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">OVO</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">DANA</span>
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">ShopeePay</span>
        </div>

        {/* Tombol Aksi Kios */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={onBack}
            disabled={isPaid}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Pilihan Frame
          </button>

          {/* Tombol Simulasi Pembayaran (Hanya muncul jika di Mode Test untuk memudahkan pengujian bilik) */}
          {isTest && !isPaid && !loading && (
            <button
              onClick={handleSimulatePayment}
              disabled={simulating}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              title="Klik untuk mensimulasikan pembayaran QRIS berhasil di Xendit Test Mode"
            >
              <Sparkles className="w-4 h-4" />
              {simulating ? "Memproses Simulasi..." : "Simulasi Bayar Berhasil (Mode Test)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
