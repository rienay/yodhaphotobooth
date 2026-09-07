import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read environment variables from Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === "string" &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes("your-project-ref") &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes("your-anon-key")
  );
};

// Create client if configured, otherwise null
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const blob = typeof fileData === "string" ? base64ToBlob(fileData, contentType) : fileData;
  const bucketName = "photobooth";

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, blob, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error(`Storage upload error (${filePath}):`, uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      message: "Supabase URL atau Anon Key belum diisi di environment variables.",
    };
  }

  try {
    const { error } = await supabase.from("photobooth_templates").select("id").limit(1);
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
