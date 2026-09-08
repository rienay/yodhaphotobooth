import { SettingsDB } from "./db";

export interface XenditConfig {
  apiKey: string;
  paymentEnabled: boolean;
  price: number;
}

export interface XenditQrCode {
  id: string;
  reference_id: string;
  qr_string: string;
  amount: number;
  status: "ACTIVE" | "INACTIVE";
  expires_at?: string;
  created?: string;
}

const FALLBACK_DEFAULT_KEY = "xnd_development_MxYJIMOGLCQZNIPnDKjd2r2c4eTtALAtvLmGqq3ur7p6Zqjn1F2WDIfCgR8RnZI";

const envKey = ((typeof import.meta !== "undefined" && import.meta.env?.VITE_XENDIT_SECRET_KEY) || "").trim();

export const DEFAULT_XENDIT_CONFIG: XenditConfig = {
  apiKey: envKey || FALLBACK_DEFAULT_KEY,
  paymentEnabled: true,
  price: 35000,
};

const settingsDb = new SettingsDB();

export function getXenditConfig(): XenditConfig {
  let envApiKey = "";
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_XENDIT_SECRET_KEY) {
      envApiKey = String(import.meta.env.VITE_XENDIT_SECRET_KEY).trim();
    }
  } catch {}

  let apiKey = "";
  let paymentEnabled = true;
  let price = 35000;

  try {
    const raw = localStorage.getItem("yodha_xendit_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
        apiKey = parsed.apiKey.trim();
      }
      if (parsed.paymentEnabled !== undefined) {
        paymentEnabled = Boolean(parsed.paymentEnabled);
      }
      if (Number(parsed.price) > 0) {
        price = Number(parsed.price);
      }
    }
  } catch (e) {
    console.warn("Failed to load Xendit config from localStorage:", e);
  }

  // Fallback ke ENV atau default key
  if (!apiKey) {
    apiKey = envApiKey || FALLBACK_DEFAULT_KEY;
  }

  return {
    apiKey,
    paymentEnabled,
    price,
  };
}

export async function saveXenditConfig(config: XenditConfig): Promise<void> {
  try {
    localStorage.setItem("yodha_xendit_config", JSON.stringify(config));
    await settingsDb.saveSetting("xendit_config", config);
  } catch (e) {
    console.warn("Failed to save Xendit config:", e);
  }
}

export function isTestApiKey(apiKey: string): boolean {
  return apiKey.startsWith("xnd_development_");
}

function getAuthHeader(apiKey: string): string {
  const cleanKey = apiKey.trim();
  // Browser btoa encodes ascii string
  return "Basic " + btoa(cleanKey + ":");
}

/**
 * Buat QRIS Dinamis melalui API Xendit v2
 */
export async function createDynamicQris(
  amount: number,
  referenceId: string,
  apiKeyOverride?: string
): Promise<{ success: boolean; qr?: XenditQrCode; error?: string }> {
  const config = getXenditConfig();
  const apiKey = (apiKeyOverride || config.apiKey).trim();

  if (!apiKey) {
    return { success: false, error: "API Key Xendit belum dikonfigurasi." };
  }

  try {
    const response = await fetch("https://api.xendit.co/qr_codes", {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(apiKey),
        "Content-Type": "application/json",
        "api-version": "2022-07-31",
      },
      body: JSON.stringify({
        reference_id: referenceId,
        type: "DYNAMIC",
        currency: "IDR",
        amount: Math.round(amount),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error_code || "Gagal membuat kode QRIS.",
      };
    }

    return {
      success: true,
      qr: {
        id: data.id,
        reference_id: data.reference_id,
        qr_string: data.qr_string,
        amount: data.amount,
        status: data.status,
        expires_at: data.expires_at,
        created: data.created,
      },
    };
  } catch (err: any) {
    console.error("Xendit createDynamicQris error:", err);
    return {
      success: false,
      error: err.message || "Gagal menghubungi server Xendit. Periksa koneksi internet.",
    };
  }
}

/**
 * Cek status pembayaran QRIS melalui riwayat payments Xendit
 */
export async function checkQrisPaymentStatus(
  qrId: string,
  referenceId?: string,
  apiKeyOverride?: string
): Promise<{ isPaid: boolean; payment?: any; error?: string }> {
  const config = getXenditConfig();
  const apiKey = (apiKeyOverride || config.apiKey).trim();

  if (!apiKey || !qrId) {
    return { isPaid: false };
  }

  try {
    // 1. Cek daftar payments untuk QR ini
    const paymentsRes = await fetch(`https://api.xendit.co/qr_codes/${encodeURIComponent(qrId)}/payments`, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(apiKey),
        "api-version": "2022-07-31",
      },
    });

    if (paymentsRes.ok) {
      const data = await paymentsRes.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        const successful = data.data.find(
          (p: any) => p.status === "SUCCEEDED" || p.status === "COMPLETED"
        );
        if (successful) {
          return { isPaid: true, payment: successful };
        }
      }
    }

    // 2. Cek status objek QR code secara langsung
    const qrRes = await fetch(`https://api.xendit.co/qr_codes/${encodeURIComponent(qrId)}`, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(apiKey),
        "api-version": "2022-07-31",
      },
    });

    if (qrRes.ok) {
      const qrData = await qrRes.json();
      // QR dynamic menjadi INACTIVE ketika pembayaran sudah berhasil diselesaikan
      if (qrData.status === "INACTIVE" || qrData.status === "COMPLETED") {
        return { isPaid: true, payment: qrData };
      }
    }

    return { isPaid: false };
  } catch (err: any) {
    console.warn("Xendit checkQrisPaymentStatus error:", err);
    return { isPaid: false, error: err.message };
  }
}

/**
 * Simulasi pembayaran berhasil di Mode Test (hanya berlaku untuk key xnd_development_...)
 */
export async function simulateQrisPayment(
  referenceId: string,
  amount: number,
  apiKeyOverride?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = getXenditConfig();
  const apiKey = (apiKeyOverride || config.apiKey).trim();

  if (!apiKey) {
    return { success: false, error: "API Key belum diatur." };
  }

  try {
    const res = await fetch(`https://api.xendit.co/qr_codes/${encodeURIComponent(referenceId)}/payments/simulate`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: Math.round(amount) }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || "Simulasi pembayaran gagal." };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menghubungi simulasi Xendit." };
  }
}

/**
 * Uji coba validitas Secret API Key dengan membuat test QR kecil
 */
export async function testXenditConnection(
  apiKey: string
): Promise<{ success: boolean; message: string; isTestMode?: boolean }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: "API Key tidak boleh kosong." };
  }

  const cleanKey = apiKey.trim();
  const isTest = isTestApiKey(cleanKey);

  try {
    const testRef = "test-ping-" + Date.now();
    const res = await createDynamicQris(1000, testRef, cleanKey);

    if (res.success && res.qr) {
      return {
        success: true,
        message: `Koneksi Berhasil! Terhubung ke Xendit (${isTest ? "Mode Uji Coba / Development" : "Mode Live / Production"}).`,
        isTestMode: isTest,
      };
    } else {
      return {
        success: false,
        message: res.error || "Gagal validasi Secret Key ke Xendit.",
        isTestMode: isTest,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal menghubungi API Xendit.",
      isTestMode: isTest,
    };
  }
}
