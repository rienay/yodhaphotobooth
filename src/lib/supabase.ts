import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("yodha_supabase_url");
    if (saved && saved.trim()) return saved.trim();
  }
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    "https://jsbyuegfpbqnaasaqhto.supabase.co"
  );
}

export function getSupabaseAnonKey(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("yodha_supabase_anon_key");
    if (saved && saved.trim()) return saved.trim();
  }
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    ""
  );
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("yodha_supabase_url", url.trim());
    } else {
      localStorage.removeItem("yodha_supabase_url");
    }
    if (anonKey && anonKey.trim()) {
      localStorage.setItem("yodha_supabase_anon_key", anonKey.trim());
    } else {
      localStorage.removeItem("yodha_supabase_anon_key");
    }
    cachedClient = null;
    lastKey = "";
    lastUrl = "";
  }
}

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return (
    typeof url === "string" &&
    url.trim().length > 0 &&
    !url.includes("your-project-ref") &&
    typeof key === "string" &&
    key.trim().length > 0 &&
    !key.includes("your-anon-key")
  );
};

let cachedClient: SupabaseClient | null = null;
let lastKey = "";
let lastUrl = "";

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!cachedClient || key !== lastKey || url !== lastUrl) {
    cachedClient = createClient(url, key);
    lastKey = key;
    lastUrl = url;
  }
  return cachedClient;
}

// Proxy wrapper so any direct supabase.* access dynamically resolves to current client
export const supabase: SupabaseClient | null = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

/**
 * Convert base64 data URL to Blob for upload
 */
export function base64ToBlob(base64Data: string, fallbackMime = "image/png"): Blob {
  try {
    let mime = fallbackMime;
    let base64 = base64Data;

    if (base64Data.startsWith("data:")) {
      const parts = base64Data.split(",");
      const match = parts[0].match(/:(.*?);/);
      if (match) mime = match[1];
      base64 = parts[1];
    }

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  } catch (err) {
    console.error("Failed to convert base64 to Blob:", err);
    throw err;
  }
}

/**
 * Upload base64 image or file to Supabase Storage bucket 'photobooth'
 * Returns the public URL of the uploaded file.
 */
export async function uploadToStorage(
  fileData: string | Blob,
  filePath: string,
  contentType = "image/png"
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured. Masukkan Anon Key di Dashboard Admin.");
  }

  const blob = typeof fileData === "string" ? base64ToBlob(fileData, contentType) : fileData;
  const bucketName = "photobooth";

  const { error: uploadError } = await client.storage
    .from(bucketName)
    .upload(filePath, blob, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error(`Storage upload error (${filePath}):`, uploadError);
    throw uploadError;
  }

  const { data } = client.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured() || !client) {
    return {
      success: false,
      message: "Supabase URL atau Anon Key belum diisi. Masukkan Anon Key di form di bawah ini.",
    };
  }

  try {
    const { error } = await client.from("photobooth_templates").select("id").limit(1);
    if (error) {
      // Check if table missing
      if (error.code === "42P01") {
        return {
          success: false,
          message: "Terkoneksi ke Supabase, namun tabel belum dibuat. Jalankan file supabase_schema.sql di SQL Editor.",
        };
      }
      return { success: false, message: `Error Supabase: ${error.message}` };
    }
    return { success: true, message: "Koneksi Supabase aktif dan berhasil!" };
  } catch (err: any) {
    return { success: false, message: `Gagal terkoneksi: ${err.message || String(err)}` };
  }
}
