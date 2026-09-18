import { supabase, isSupabaseConfigured, uploadToStorage } from "./supabase";

export interface CustomTemplate {
  id: string;
  name: string;
  layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2";
  img: string; // Base64 data URL or Storage Public URL
  isCustom: true;
  enabled: boolean;
  presetId: string;
  photoBoxes?: { id: string; x: number; y: number; w: number; h: number }[];
}

export interface PhotoboothSession {
  id?: string;
  session_code: string;
  layout: string;
  variant?: string;
  template_url?: string;
  strip_url: string;
  thumbnail_url?: string;
  gif_url?: string;
  live_photo_url?: string;
  live_videos?: string[];
  raw_photos?: string[];
  total_photos?: number;
  print_status?: "pending" | "printed" | "skipped";
  print_copies?: number;
  printed_at?: string;
  created_at?: string;
}

// -------------------------------------------------------------
// IndexedDB Local Store (High Reliability Fallback & Cache)
// -------------------------------------------------------------
class LocalIndexedDB {
  private dbName = "YodhaPhotoboothDB";
  private storeName = "templates";

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        return reject(new Error("IndexedDB not available in current environment"));
      }
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<CustomTemplate[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Failed to read IndexedDB templates:", e);
      return [];
    }
  }

  async put(template: CustomTemplate): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.put(template);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Failed to write to IndexedDB:", e);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("Failed to delete from IndexedDB:", e);
    }
  }
}

const localDB = new LocalIndexedDB();

// -------------------------------------------------------------
// Unified TemplateDB (Supabase Database + Local IndexedDB)
// -------------------------------------------------------------
export class TemplateDB {
  /**
   * Get all templates. Prioritizes local cache for instant 0ms rendering,
   * while revalidating with Supabase in the background.
   */
  async getAllTemplates(): Promise<CustomTemplate[]> {
    const localCached = await localDB.getAll();

    // If Supabase is configured, sync in background or fetch if cache is empty
    if (isSupabaseConfigured() && supabase) {
      if (!localCached || localCached.length === 0) {
        // Cold start (no cache): wait for Supabase
        try {
          const { data, error } = await supabase
            .from("photobooth_templates")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            const templates: CustomTemplate[] = data.map((item: any) => ({
              id: item.id,
              name: item.name,
              layout: item.layout,
              img: item.img,
              isCustom: true,
              enabled: item.enabled ?? true,
              presetId: item.preset_id ?? "",
              photoBoxes: item.photo_boxes || item.photoBoxes || undefined,
            }));

            for (const t of templates) {
              localDB.put(t).catch(() => {});
            }
            return templates;
          }
        } catch (err) {
          console.warn("Supabase templates error:", err);
        }
      } else {
        // Cache exists: Return immediately (instant UI) and sync remote in background
        supabase
          .from("photobooth_templates")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              for (const item of data) {
                localDB.put({
                  id: item.id,
                  name: item.name,
                  layout: item.layout,
                  img: item.img,
                  isCustom: true,
                  enabled: item.enabled ?? true,
                  presetId: item.preset_id ?? "",
                  photoBoxes: item.photo_boxes || item.photoBoxes || undefined,
                }).catch(() => {});
              }
            }
          })
          .catch(() => {});
        return localCached;
      }
    }

    return localCached || [];
  }

  /**
   * Save a template. Uploads image to Supabase Storage, saves row in Supabase, and caches locally.
   */
  async saveTemplate(template: CustomTemplate): Promise<void> {
    let finalImgUrl = template.img;

    // If Supabase is configured and the image is base64, upload it to Storage
    if (isSupabaseConfigured() && supabase) {
      try {
        if (template.img.startsWith("data:")) {
          const path = `templates/${template.id}_${Date.now()}.png`;
          finalImgUrl = await uploadToStorage(template.img, path, "image/png");
        }

        const payload: any = {
          id: template.id,
          name: template.name,
          layout: template.layout,
          img: finalImgUrl,
          is_custom: true,
          enabled: template.enabled,
          preset_id: template.presetId || "",
          photo_boxes: template.photoBoxes || null,
          updated_at: new Date().toISOString(),
        };

        let { error } = await supabase
          .from("photobooth_templates")
          .upsert(payload, { onConflict: "id" });

        if (error && error.message?.includes("photo_boxes")) {
          delete payload.photo_boxes;
          const retry = await supabase
            .from("photobooth_templates")
            .upsert(payload, { onConflict: "id" });
          error = retry.error;
        }

        if (error) {
          console.warn("Supabase saveTemplate error:", error.message);
        }
      } catch (err) {
        console.warn("Failed to upload/save template to Supabase:", err);
      }
    }

    // Always update local IndexedDB with final data
    const localTemplate: CustomTemplate = {
      ...template,
      img: finalImgUrl,
    };
    await localDB.put(localTemplate);
  }

  /**
   * Delete a template from Supabase & IndexedDB
   */
  async deleteTemplate(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from("photobooth_templates").delete().eq("id", id);
        if (error) {
          console.warn("Supabase deleteTemplate error:", error.message);
        }
      } catch (err) {
        console.warn("Failed to delete template from Supabase:", err);
      }
    }

    await localDB.delete(id);
  }

  /**
   * Toggle enabled state of a template
   */
  async toggleTemplate(id: string, enabled: boolean): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("photobooth_templates")
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch (err) {
        console.warn("Supabase toggleTemplate error:", err);
      }
    }

    // Update locally
    const all = await localDB.getAll();
    const target = all.find((t) => t.id === id);
    if (target) {
      target.enabled = enabled;
      await localDB.put(target);
    }
  }
}

/**
 * Create a lightweight JPEG thumbnail (~30KB) from full-res base64.
 * Prevents memory bloat and eliminates UI lag when viewing many photos.
 */
export async function generateThumbnail(base64Data: string, maxDim = 380, quality = 0.65): Promise<string> {
  if (!base64Data || typeof window === "undefined" || !base64Data.startsWith("data:")) return base64Data;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(base64Data);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        resolve(base64Data);
      }
    };
    img.onerror = () => resolve(base64Data);
    img.src = base64Data;
  });
}

// -------------------------------------------------------------
// Unified Sessions / Photos DB (Save captured photos to DB)
// -------------------------------------------------------------
export class SessionDB {
  private localKey = "yodha_recent_sessions";

  async saveSession(session: PhotoboothSession): Promise<PhotoboothSession> {
    // Generate lightweight thumbnail if strip is base64
    let thumbUrl = session.thumbnail_url;
    if (!thumbUrl && session.strip_url && session.strip_url.startsWith("data:")) {
      try {
        thumbUrl = await generateThumbnail(session.strip_url, 380, 0.65);
      } catch {}
    }

    const sessionData: PhotoboothSession = {
      ...session,
      id: session.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`),
      thumbnail_url: thumbUrl || session.thumbnail_url,
      print_status: session.print_status || "pending",
      print_copies: session.print_copies || 1,
      created_at: session.created_at || new Date().toISOString(),
    };

    // Save to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const isUuid = sessionData.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionData.id);
        const insertPayload: any = {
          session_code: sessionData.session_code,
          layout: sessionData.layout,
          variant: sessionData.variant || "",
          template_url: sessionData.template_url || null,
          strip_url: sessionData.strip_url,
          gif_url: sessionData.gif_url || null,
          live_photo_url: sessionData.live_photo_url || null,
          live_videos: sessionData.live_videos || [],
          raw_photos: sessionData.raw_photos || [],
          total_photos: sessionData.total_photos || 0,
          created_at: sessionData.created_at,
        };
        if (isUuid) {
          insertPayload.id = sessionData.id;
        }

        const { data, error } = await supabase
          .from("photobooth_sessions")
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          console.error("Supabase save session error:", error.message, error.details);
        } else if (data) {
          sessionData.id = data.id;
        }
      } catch (err) {
        console.error("Failed to save session to Supabase:", err);
      }
    }

    // Always cache in localStorage for instant access (keep payload ultra-lightweight)
    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      const cachedSession: PhotoboothSession = {
        ...sessionData,
        // In local memory, use lightweight thumbnail for strip_url to reduce RAM by 99%
        strip_url: thumbUrl || sessionData.strip_url,
        thumbnail_url: thumbUrl || sessionData.thumbnail_url,
        gif_url: undefined, // Don't bloat local cache with multi-megabyte GIF
        live_videos: [], // Don't bloat local cache with video blobs
        raw_photos: [],
      };
      existing.unshift(cachedSession);
      localStorage.setItem(this.localKey, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      // Ignore localStorage quotas
    }

    return sessionData;
  }

  async updateSession(sessionCode: string, patch: Partial<PhotoboothSession>): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: any = { ...patch };
        delete updatePayload.id;
        delete updatePayload.session_code;
        delete updatePayload.created_at;
        delete updatePayload.thumbnail_url;
        delete updatePayload.print_status;
        delete updatePayload.print_copies;
        delete updatePayload.printed_at;

        await supabase
          .from("photobooth_sessions")
          .update(updatePayload)
          .eq("session_code", sessionCode);
      } catch (err) {
        console.warn("Failed updating session in Supabase:", err);
      }
    }

    // Update local cache
    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      const idx = existing.findIndex((s) => s.session_code === sessionCode || s.id === sessionCode);
      if (idx !== -1) {
        existing[idx] = { ...existing[idx], ...patch };
        localStorage.setItem(this.localKey, JSON.stringify(existing));
      }
    } catch (e) {}
  }

  async deleteSession(idOrCode: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("photobooth_sessions")
          .delete()
          .or(`session_code.eq.${idOrCode},id.eq.${idOrCode}`);
      } catch (err) {
        console.warn("Failed deleting session from Supabase:", err);
      }
    }

    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      const filtered = existing.filter((s) => s.session_code !== idOrCode && s.id !== idOrCode);
      localStorage.setItem(this.localKey, JSON.stringify(filtered));
    } catch {}
  }

  async clearAllSessions(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("photobooth_sessions")
          .delete()
          .not("session_code", "is", null);
      } catch (err) {
        console.warn("Failed clearing all sessions from Supabase:", err);
      }
    }

    try {
      localStorage.removeItem(this.localKey);
    } catch {}
  }

  /**
   * Automatically delete sessions older than retentionDays (default 30 days)
   * Deletes from both Supabase photobooth_sessions and localStorage cache
   */
  async cleanupOldSessions(retentionDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();
    let deletedCount = 0;

    // 1. Delete from Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: oldSessions, error: selectErr } = await supabase
          .from("photobooth_sessions")
          .select("id, session_code, strip_url, gif_url, raw_photos")
          .lt("created_at", cutoffIso);

        if (!selectErr && oldSessions && oldSessions.length > 0) {
          deletedCount = oldSessions.length;

          // Attempt to remove corresponding files from storage bucket
          try {
            const filesToDelete: string[] = [];
            for (const s of oldSessions) {
              if (s.strip_url && s.strip_url.includes("/photobooth/")) {
                const parts = s.strip_url.split("/photobooth/");
                if (parts[1]) filesToDelete.push(parts[1].split("?")[0]);
              }
              if (s.gif_url && s.gif_url.includes("/photobooth/")) {
                const parts = s.gif_url.split("/photobooth/");
                if (parts[1]) filesToDelete.push(parts[1].split("?")[0]);
              }
              if (Array.isArray(s.raw_photos)) {
                for (const r of s.raw_photos) {
                  if (typeof r === "string" && r.includes("/photobooth/")) {
                    const parts = r.split("/photobooth/");
                    if (parts[1]) filesToDelete.push(parts[1].split("?")[0]);
                  }
                }
              }
            }
            if (filesToDelete.length > 0) {
              await supabase.storage.from("photobooth").remove(filesToDelete.slice(0, 100));
            }
          } catch (storageErr) {
            console.warn("Storage cleanup notice:", storageErr);
          }

          // Delete rows from photobooth_sessions table
          const { error: delErr } = await supabase
            .from("photobooth_sessions")
            .delete()
            .lt("created_at", cutoffIso);

          if (delErr) {
            console.warn("Error deleting old sessions from Supabase:", delErr.message);
          }
        }
      } catch (err) {
        console.warn("cleanupOldSessions Supabase error:", err);
      }
    }

    // 2. Clean up from localStorage
    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      const filtered = existing.filter((s) => {
        if (!s.created_at) return true;
        return new Date(s.created_at).getTime() >= cutoffDate.getTime();
      });
      localStorage.setItem(this.localKey, JSON.stringify(filtered));
    } catch {}

    return deletedCount;
  }

  async getRecentSessions(limit = 40): Promise<PhotoboothSession[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffIso = cutoffDate.toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("photobooth_sessions")
          .select("*")
          .gte("created_at", cutoffIso)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("Failed to load sessions from Supabase:", err);
      }
    }

    // Fallback to localStorage
    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      const filtered = existing.filter((s) => {
        if (!s.created_at) return true;
        return new Date(s.created_at).getTime() >= cutoffDate.getTime();
      });
      return filtered.slice(0, limit);
    } catch {
      return [];
    }
  }

  async getSessionByCode(code: string): Promise<PhotoboothSession | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
        let query = supabase.from("photobooth_sessions").select("*");

        if (isUuid) {
          query = query.or(`session_code.eq.${code},id.eq.${code}`);
        } else {
          // Never compare non-UUID string to UUID column to avoid Postgres error 22P02
          query = query.eq("session_code", code);
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
        if (error) {
          console.warn("Supabase fetch session error:", error.message, error.details);
        }
      } catch (err) {
        console.warn("Failed to fetch session from Supabase:", err);
      }
    }

    // Fallback to localStorage
    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      return existing.find((s) => s.session_code === code || s.id === code) || null;
    } catch {
      return null;
    }
  }
}

// -------------------------------------------------------------
// Unified Settings DB (Camera Device, Disabled Templates, etc.)
// -------------------------------------------------------------
export class SettingsDB {
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    // 1. Try local cache first
    try {
      const local = localStorage.getItem(`yodha_setting_${key}`);
      if (local !== null) {
        defaultValue = JSON.parse(local);
      }
    } catch {}

    // 2. Fetch from Supabase if online
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("photobooth_settings")
          .select("value")
          .eq("key", key)
          .single();

        if (!error && data && data.value !== undefined) {
          const val = data.value as T;
          try {
            localStorage.setItem(`yodha_setting_${key}`, JSON.stringify(val));
          } catch {}
          return val;
        }
      } catch (err) {
        // Fallback to local
      }
    }

    return defaultValue;
  }

  async saveSetting<T>(key: string, value: T): Promise<void> {
    // 1. Save locally
    try {
      localStorage.setItem(`yodha_setting_${key}`, JSON.stringify(value));
    } catch {}

    // 2. Save to Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("photobooth_settings")
          .upsert({
            key,
            value: value as any,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn(`Failed to save setting '${key}' to Supabase:`, err);
      }
    }
  }
}
