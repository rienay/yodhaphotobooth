import { supabase, isSupabaseConfigured, uploadToStorage } from "./supabase";

export interface CustomTemplate {
  id: string;
  name: string;
  layout: "3x1" | "3x2" | "2x1" | "1x1" | "2x2" | "4x2";
  img: string; // Base64 data URL or Storage Public URL
  isCustom: true;
  enabled: boolean;
  presetId: string;
}

export interface PhotoboothSession {
  id?: string;
  session_code: string;
  layout: string;
  variant?: string;
  strip_url: string;
  gif_url?: string;
  total_photos?: number;
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
   * Get all templates. Prioritizes Supabase if configured, falls back to IndexedDB.
   */
  async getAllTemplates(): Promise<CustomTemplate[]> {
    if (isSupabaseConfigured() && supabase) {
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
          }));

          // Sync back to local IndexedDB for fast cache / offline support
          for (const t of templates) {
            localDB.put(t).catch(() => {});
          }

          return templates;
        }
        if (error) {
          console.warn("Supabase fetch templates warning, using local cache:", error.message);
        }
      } catch (err) {
        console.warn("Supabase templates error:", err);
      }
    }

    // Fallback to IndexedDB
    return await localDB.getAll();
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

        const payload = {
          id: template.id,
          name: template.name,
          layout: template.layout,
          img: finalImgUrl,
          is_custom: true,
          enabled: template.enabled,
          preset_id: template.presetId || "",
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("photobooth_templates")
          .upsert(payload, { onConflict: "id" });

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

// -------------------------------------------------------------
// Unified Sessions / Photos DB (Save captured photos to DB)
// -------------------------------------------------------------
export class SessionDB {
  private localKey = "yodha_recent_sessions";

  async saveSession(session: PhotoboothSession): Promise<PhotoboothSession> {
    const sessionData: PhotoboothSession = {
      ...session,
      id: session.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`),
      created_at: session.created_at || new Date().toISOString(),
    };

    // Save to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("photobooth_sessions")
          .insert({
            id: sessionData.id,
            session_code: sessionData.session_code,
            layout: sessionData.layout,
            variant: sessionData.variant || "",
            strip_url: sessionData.strip_url,
            gif_url: sessionData.gif_url || null,
            total_photos: sessionData.total_photos || 0,
            created_at: sessionData.created_at,
          })
          .select()
          .single();

        if (!error && data) {
          sessionData.id = data.id;
        }
      } catch (err) {
        console.warn("Failed to save session to Supabase:", err);
      }
    }

    // Always cache in localStorage for instant access
    try {
      const existing: PhotoboothSession[] = JSON.parse(localStorage.getItem(this.localKey) || "[]");
      existing.unshift(sessionData);
      localStorage.setItem(this.localKey, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      // Ignore localStorage quotas
    }

    return sessionData;
  }

  async getRecentSessions(limit = 20): Promise<PhotoboothSession[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("photobooth_sessions")
          .select("*")
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
      return JSON.parse(localStorage.getItem(this.localKey) || "[]").slice(0, limit);
    } catch {
      return [];
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
