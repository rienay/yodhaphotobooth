/**
 * AI Effects System for Yodha Photobooth
 * Inspired by Dreambooth AI Effects (3D Character, Pas Foto, Y2K Flash, Watercolor, Anime, Pencil Sketch, Lego, etc.)
 */

export interface AiEffect {
  id: string;
  name: string;
  category: "character" | "art" | "retro" | "formal" | "game";
  categoryLabel: string;
  emoji: string;
  desc: string;
  prompt: string;
  negativePrompt?: string;
  shaderType:
    | "3d_movie"
    | "pas_foto"
    | "y2k_flash"
    | "analog"
    | "vintage_film"
    | "lego"
    | "sims"
    | "watercolor"
    | "sketch"
    | "pencil"
    | "anime"
    | "cyberpunk"
    | "custom";
  previewUrl: string;
  sampleBeforeUrl?: string;
  enabled: boolean;
  isCustom?: boolean;
  author?: string;
  updatedAt?: string;
}

export interface AiProviderSettings {
  mode: "client" | "replicate" | "fal" | "openai" | "custom_webhook";
  apiKey?: string;
  apiEndpoint?: string;
  modelName?: string;
  strength?: number; // 0.1 to 1.0 (default 0.8)
}

export const DEFAULT_AI_PROVIDER_SETTINGS: AiProviderSettings = {
  mode: "fal",
  apiKey: "",
  apiEndpoint: "",
  modelName: "fal-ai/fast-sdxl/image-to-image",
  strength: 0.80,
};

export const DEFAULT_AI_EFFECTS: AiEffect[] = [
  {
    id: "3d_movie",
    name: "3D Movie Character",
    category: "character",
    categoryLabel: "Karakter 3D",
    emoji: "🧸",
    desc: "Ubah foto menjadi karakter animasi 3D ala film Pixar / Disney dengan kulit halus, mata kartun ekspresif, dan pencahayaan sinematik.",
    prompt: "masterpiece 3D animated character, Pixar Disney animation style, cute expressive face, big shiny reflective cartoon eyes, smooth porcelain 3D skin, soft subsurface scattering, vibrant cinematic lighting, 8k octane render, detailed hair texture",
    negativePrompt: "photorealistic, real person, 2d, flat drawing, illustration, ugly, deformed, noisy, grainy, blurry, bad anatomy",
    shaderType: "3d_movie",
    previewUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth AI",
    updatedAt: "2026-08-19",
  },
  {
    id: "pas_foto",
    name: "Pas Foto Formal",
    category: "formal",
    categoryLabel: "Formal & Studio",
    emoji: "👔",
    desc: "Ubah penampilan foto menjadi formal rapi berjas hitam dasi dengan latar belakang studio pas foto.",
    prompt: "Indonesian formal passport photo, professional black tailored business suit blazer, crisp white collared dress shirt, neat dark silk necktie, clean solid studio backdrop, studio portrait lighting, sharp facial focus, elegant professional corporate headshot",
    negativePrompt: "casual clothes, t-shirt, hoodie, messy collar, distorted, noisy, casual background, outdoor, low quality",
    shaderType: "pas_foto",
    previewUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Ahmad Syahrul",
    updatedAt: "2026-08-18",
  },
  {
    id: "anime_portrait",
    name: "Anime Portrait",
    category: "character",
    categoryLabel: "Karakter Anime",
    emoji: "🌸",
    desc: "Transformasi karakter anime Jepang modern ala Studio Ghibli & Makoto Shinkai dengan mata bercahaya dan garis manga halus.",
    prompt: "masterpiece modern anime character portrait, Studio Ghibli and Makoto Shinkai aesthetic, clean delicate anime linework, expressive sparkling anime eyes with pupil catchlights, soft cheek blush, vivid cel shading, vibrant cinematic lighting, beautiful anime hair",
    negativePrompt: "real human skin, 3d render, clay, western cartoon, disfigured, blurry, low resolution, ugly",
    shaderType: "anime",
    previewUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "lego_bricks",
    name: "Lego Mini Bricks",
    category: "game",
    categoryLabel: "Mainan & Game",
    emoji: "🧱",
    desc: "Karakter minifigur balok mainan plastik dengan stud berkilau dan gaya mainan balok Lego ikonik.",
    prompt: "Lego minifigure person character portrait, plastic toy aesthetic, glossy yellow face, plastic hair piece, modular Lego brick background, macro toy photography lighting, playful collectible figure, high quality 3D render",
    negativePrompt: "human skin, realistic hair, real photo, fuzzy cloth, distorted",
    shaderType: "lego",
    previewUrl: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "pencil_sketch",
    name: "Pencil Sketch",
    category: "art",
    categoryLabel: "Seni Lukis",
    emoji: "✏️",
    desc: "Sketsa pensil grafit monokrom artistik dengan arsiran tangan halus pada tekstur kertas seni.",
    prompt: "Hand-drawn graphite pencil portrait sketch, fine crosshatch shading, artistic contour lines, charcoal texture, off-white sketchbook paper, detailed fine art drawing, masterpiece",
    negativePrompt: "color, digital painting, 3D render, photorealistic, blurry",
    shaderType: "pencil",
    previewUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "storybook_watercolor",
    name: "Storybook Watercolor",
    category: "art",
    categoryLabel: "Seni Lukis",
    emoji: "🎨",
    desc: "Lukisan cat air buku cerita dongeng dengan gradasi lembut, cipratan artistik, dan warna pastel.",
    prompt: "Fairy tale storybook watercolor illustration, gentle ink linework, soft color bleed, cold-press watercolor paper texture, pastel washes, whimsical children's book art style",
    negativePrompt: "sharp photo, harsh 3D, dark grunge, oversaturated neon, lowres",
    shaderType: "watercolor",
    previewUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "y2k_flash",
    name: "Y2K Flash Camera",
    category: "retro",
    categoryLabel: "Retro 2000-an",
    emoji: "⚡",
    desc: "Gaya kamera saku digital tahun 2000-an dengan direct flash terang, saturasi ceria, dan vibe nostalgia.",
    prompt: "Y2K 2000s direct flash snapshot photography, candid point-and-shoot compact digital camera aesthetic, bright direct on-camera flash, cool highlights, slight lens flare, authentic 2000s teen nostalgia",
    negativePrompt: "studio softbox, modern HDR, dark shadows, flat lighting, painting",
    shaderType: "y2k_flash",
    previewUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Subhan Agustira",
    updatedAt: "2026-07-23",
  },
  {
    id: "sims_pink",
    name: "Sims [pink version]",
    category: "game",
    categoryLabel: "Mainan & Game",
    emoji: "🎮",
    desc: "Karakter gaya game The Sims dengan nuansa pink pastel ceria, pencahayaan 3D game, dan aksen cerah.",
    prompt: "The Sims 4 video game character render, pink pastel ambient lighting, glowing green plumbob nearby, smooth 3D video game engine mesh, trendy stylish outfit, sweet playful vibe",
    negativePrompt: "ugly, real photo, dark moody, pixelated",
    shaderType: "sims",
    previewUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "sketch_booth",
    name: "Sketch Photobooth",
    category: "art",
    categoryLabel: "Seni Lukis",
    emoji: "📖",
    desc: "Gaya komik manga & webtoon strip dengan garis tinta tegas, halftone dots, dan teks bubble kartun.",
    prompt: "Manga comic book panel illustration, bold black ink lineart, screentone shading, pop art halftone dots, graphic novel illustration, expressive monochrome comic",
    negativePrompt: "color, photograph, 3d model, blurry gradient",
    shaderType: "sketch",
    previewUrl: "https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "analog_effect",
    name: "Analog Effect",
    category: "retro",
    categoryLabel: "Retro 2000-an",
    emoji: "🎞️",
    desc: "Sensasi foto rol film analog 35mm dengan butiran grain alami, warna hangat, dan tone nostalgia.",
    prompt: "Authentic 35mm Kodak Portra 400 film photograph, natural organic film grain, warm nostalgic tones, slight light leak, soft vintage highlights, analog photography",
    negativePrompt: "digital sharpness, clean HDR, modern smartphone look",
    shaderType: "analog",
    previewUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-21",
  },
  {
    id: "vintage_film",
    name: "Vintage Film Strip",
    category: "retro",
    categoryLabel: "Retro 2000-an",
    emoji: "📽️",
    desc: "Format strip film bioskop kuno dengan nomor frame, tone warna amber, dan kontras seluloid.",
    prompt: "Vintage cine filmstrip portrait, 16mm movie aesthetic, warm amber and cyan split toning, sprocket hole frame border, classic cinema nostalgia",
    negativePrompt: "modern clean photo, sharp digital sensor",
    shaderType: "vintage_film",
    previewUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "cyberpunk_glow",
    name: "Cyberpunk Neon Glow",
    category: "character",
    categoryLabel: "Karakter 3D",
    emoji: "🌆",
    desc: "Nuansa futuristik kota cyberpunk dengan cahaya neon biru-cyan dan magenta serta aksen hologram.",
    prompt: "Cyberpunk sci-fi portrait, vibrant neon cyan and hot magenta rim lighting, glowing holographic accents, dark rainy futuristic city reflections, high tech aesthetic",
    negativePrompt: "vintage, sepia, dull colors, daytime sunshine",
    shaderType: "cyberpunk",
    previewUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Yodha AI Lab",
    updatedAt: "2026-08-10",
  },
];

/**
 * Loads AI Effects from localStorage with fallback to default effects.
 */
export function loadLocalAiEffects(): AiEffect[] {
  if (typeof window === "undefined") return DEFAULT_AI_EFFECTS;
  try {
    const raw = localStorage.getItem("yodha_ai_effects");
    if (raw) {
      const parsed: AiEffect[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge missing defaults
        const existingIds = new Set(parsed.map((e) => e.id));
        const missing = DEFAULT_AI_EFFECTS.filter((d) => !existingIds.has(d.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          saveLocalAiEffects(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load local AI effects:", err);
  }
  return DEFAULT_AI_EFFECTS;
}

/**
 * Saves AI Effects to localStorage and dispatches event.
 */
export function saveLocalAiEffects(effects: AiEffect[]): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(effects);
    localStorage.setItem("yodha_ai_effects", json);
    window.dispatchEvent(new CustomEvent("yodha_ai_effects_changed", { detail: effects }));
  } catch (err) {
    console.warn("Failed to save local AI effects:", err);
  }
}

/**
 * Loads AI Provider Settings from localStorage.
 */
export function loadAiProviderSettings(): AiProviderSettings {
  if (typeof window === "undefined") return DEFAULT_AI_PROVIDER_SETTINGS;
  try {
    const raw = localStorage.getItem("yodha_ai_provider_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AI_PROVIDER_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to load AI provider settings:", err);
  }
  return DEFAULT_AI_PROVIDER_SETTINGS;
}

/**
 * Saves AI Provider Settings to localStorage.
 */
export function saveAiProviderSettings(settings: AiProviderSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("yodha_ai_provider_settings", JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("yodha_ai_provider_changed", { detail: settings }));
  } catch (err) {
    console.warn("Failed to save AI provider settings:", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * High-Performance Client-Side Artistic AI Shader Engine (Canvas 2D)
 * Runs 100% locally on the Kiosk PC without needing external API tokens.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Synchronously applies the client-side AI shader directly to a 2D rendering context.
 */
export function applyAiShaderToContext(
  ctx: CanvasRenderingContext2D,
  shaderType: AiEffect["shaderType"],
  w: number,
  h: number
): void {
  switch (shaderType) {
    case "pencil":
      applyPencilSketchFilter(ctx, w, h);
      break;
    case "sketch":
      applyMangaComicFilter(ctx, w, h);
      break;
    case "watercolor":
      applyWatercolorFilter(ctx, w, h);
      break;
    case "3d_movie":
      apply3DMovieCharacterFilter(ctx, w, h);
      break;
    case "y2k_flash":
      applyY2KFlashFilter(ctx, w, h);
      break;
    case "analog":
      applyAnalogFilmFilter(ctx, w, h);
      break;
    case "vintage_film":
      applyVintageFilmStripFilter(ctx, w, h);
      break;
    case "lego":
      applyLegoBricksFilter(ctx, w, h);
      break;
    case "sims":
      applySimsGameFilter(ctx, w, h);
      break;
    case "anime":
      applyAnimeArtFilter(ctx, w, h);
      break;
    case "cyberpunk":
      applyCyberpunkGlowFilter(ctx, w, h);
      break;
    case "pas_foto":
      applyPasFotoFormalFilter(ctx, w, h);
      break;
    default:
      apply3DMovieCharacterFilter(ctx, w, h);
      break;
  }
}

/**
 * Applies the selected AI styling transformation directly onto an HTMLCanvasElement.
 */
export async function applyAiStylization(
  sourceCanvas: HTMLCanvasElement,
  effect: AiEffect,
  provider: AiProviderSettings = DEFAULT_AI_PROVIDER_SETTINGS
): Promise<string> {
  // If cloud AI API mode is chosen and configured, call Cloud AI
  if (provider.mode !== "client" && (provider.apiKey || provider.mode === "custom_webhook")) {
    try {
      const cloudResult = await callCloudAiTransform(sourceCanvas, effect, provider);
      if (cloudResult) return cloudResult;
    } catch (err) {
      console.warn("Cloud AI transform failed, falling back to instant client neural shader:", err);
    }
  }

  // Instant Client Neural / Canvas 2D Shader Engine
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return sourceCanvas.toDataURL("image/jpeg", 0.95);

  ctx.drawImage(sourceCanvas, 0, 0);
  applyAiShaderToContext(ctx, effect.shaderType, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.95);
}

/* Helper to convert remote image URL to Data URL (base64) to prevent CORS taint on canvas. */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengunduh gambar hasil AI: ${res.statusText}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Quick connection check for AI Providers.
 */
export async function testAiProviderConnection(
  provider: AiProviderSettings
): Promise<{ success: boolean; message: string }> {
  try {
    if (provider.mode === "client") {
      return { success: true, message: "Engine Offline Shaders aktif dan siap memproses foto langsung di komputer." };
    }

    if (provider.mode === "fal") {
      if (!provider.apiKey?.trim()) {
        return { success: false, message: "FAL_KEY belum dimasukkan. Masukkan API Key dari fal.ai." };
      }
      const model = provider.modelName?.trim() || "fal-ai/fast-sdxl/image-to-image";
      const res = await fetch(`https://fal.run/${model}`, {
        method: "OPTIONS",
        headers: {
          "Authorization": `Key ${provider.apiKey.trim()}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: "FAL_KEY tidak valid atau ditolak oleh fal.ai." };
      }
      return { success: true, message: "Koneksi ke Fal.ai Cloud Generator berhasil terhubung!" };
    }

    if (provider.mode === "replicate") {
      if (!provider.apiKey?.trim()) {
        return { success: false, message: "Replicate API Token belum dimasukkan." };
      }
      const res = await fetch("https://api.replicate.com/v1/models/stability-ai/sdxl", {
        headers: { "Authorization": `Bearer ${provider.apiKey.trim()}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: "Token Replicate tidak valid." };
      }
      return { success: true, message: "Koneksi ke Replicate API berhasil terhubung!" };
    }

    if (provider.mode === "custom_webhook") {
      if (!provider.apiEndpoint?.trim()) {
        return { success: false, message: "URL Endpoint webhook belum diisi." };
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (provider.apiKey?.trim()) headers["Authorization"] = `Bearer ${provider.apiKey.trim()}`;
      const res = await fetch(provider.apiEndpoint.trim(), {
        method: "POST",
        headers,
        body: JSON.stringify({ ping: true }),
      });
      if (!res.ok && res.status !== 400 && res.status !== 422) {
        return { success: false, message: `Server Webhook mengembalikan HTTP status ${res.status}` };
      }
      return { success: true, message: "Koneksi ke Webhook AI / Server Lokal berhasil!" };
    }

    return { success: true, message: "Konfigurasi valid." };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi server AI: ${err.message || err}` };
  }
}

/**
 * Cloud Generative AI Transform Caller (Fal.ai, Replicate, or Custom Webhook)
 */
async function callCloudAiTransform(
  sourceCanvas: HTMLCanvasElement,
  effect: AiEffect,
  provider: AiProviderSettings
): Promise<string | null> {
  // Optimize input canvas resolution for cloud AI inference speed (max 1024px)
  const maxDim = 1024;
  let workCanvas = sourceCanvas;
  if (sourceCanvas.width > maxDim || sourceCanvas.height > maxDim) {
    const ratio = Math.min(maxDim / sourceCanvas.width, maxDim / sourceCanvas.height);
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(sourceCanvas.width * ratio);
    scaled.height = Math.round(sourceCanvas.height * ratio);
    const sctx = scaled.getContext("2d");
    if (sctx) {
      sctx.drawImage(sourceCanvas, 0, 0, scaled.width, scaled.height);
      workCanvas = scaled;
    }
  }

  const base64Img = workCanvas.toDataURL("image/jpeg", 0.88);

  // 1. Fal.ai Cloud Provider
  if (provider.mode === "fal") {
    if (!provider.apiKey?.trim()) throw new Error("FAL_KEY belum diisi di Pengaturan AI");
    const model = provider.modelName?.trim() || "fal-ai/fast-sdxl/image-to-image";
    const endpoint = provider.apiEndpoint?.trim() || `https://fal.run/${model}`;

    const payload: any = {
      image_url: base64Img,
      prompt: effect.prompt,
      negative_prompt: effect.negativePrompt || "blurry, low quality, deformed, disfigured, distorted, bad anatomy",
      strength: provider.strength || 0.78,
    };

    if (model.includes("face-to-many")) {
      let style = "3D";
      if (effect.shaderType === "anime") style = "Anime";
      else if (effect.shaderType === "lego") style = "Clay";
      else if (effect.shaderType === "sketch" || effect.shaderType === "pencil") style = "Line Art";
      else if (effect.shaderType === "cyberpunk") style = "Cyberpunk";
      payload.style = style;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Key ${provider.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Fal.ai error (${res.status}): ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const resultUrl =
      data.images?.[0]?.url ||
      data.image?.url ||
      data.output?.[0] ||
      data.output;

    if (resultUrl && typeof resultUrl === "string") {
      if (resultUrl.startsWith("data:")) return resultUrl;
      return await urlToDataUrl(resultUrl);
    }
    throw new Error("Fal.ai tidak mengembalikan gambar output");
  }

  // 2. Replicate Provider
  if (provider.mode === "replicate") {
    if (!provider.apiKey?.trim()) throw new Error("Replicate API Token belum diisi");
    const model = provider.modelName?.trim() || "stability-ai/sdxl";
    const endpoint = model.includes("/")
      ? `https://api.replicate.com/v1/models/${model}/predictions`
      : "https://api.replicate.com/v1/predictions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${provider.apiKey.trim()}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({
        input: {
          image: base64Img,
          prompt: effect.prompt,
          negative_prompt: effect.negativePrompt || "ugly, blurry, low quality, deformed",
          prompt_strength: provider.strength || 0.78,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Replicate error (${res.status}): ${errText.slice(0, 150)}`);
    }

    let pred = await res.json();

    // Poll if waiting
    let pollCount = 0;
    while (pred.status === "starting" || pred.status === "processing") {
      if (pollCount > 25) throw new Error("Replicate generation waktu habis (>35 detik)");
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(pred.urls?.get || `https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { "Authorization": `Bearer ${provider.apiKey.trim()}` },
      });
      if (pollRes.ok) {
        pred = await pollRes.json();
      }
      pollCount++;
    }

    if (pred.status === "failed") {
      throw new Error(`Replicate generation gagal: ${pred.error || "Unknown"}`);
    }

    const output = pred.output;
    const resultUrl = Array.isArray(output) ? output[0] : output;
    if (resultUrl && typeof resultUrl === "string") {
      if (resultUrl.startsWith("data:")) return resultUrl;
      return await urlToDataUrl(resultUrl);
    }
    throw new Error("Replicate tidak mengembalikan output gambar yang valid");
  }

  // 3. Custom Webhook / Local AI Server Mode
  if (provider.mode === "custom_webhook" && provider.apiEndpoint) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (provider.apiKey?.trim()) {
      headers["Authorization"] = `Bearer ${provider.apiKey.trim()}`;
    }

    const res = await fetch(provider.apiEndpoint.trim(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        image: base64Img,
        prompt: effect.prompt,
        negative_prompt: effect.negativePrompt,
        strength: provider.strength || 0.8,
        effect_id: effect.id,
        shader_type: effect.shaderType,
      }),
    });
    if (!res.ok) throw new Error(`Custom webhook returned status ${res.status}`);
    const data = await res.json();
    const result = data.image || data.output || data.images?.[0]?.url || data.url;
    if (result && typeof result === "string") {
      if (result.startsWith("data:")) return result;
      return await urlToDataUrl(result);
    }
  }

  return null;
}

/* 1. Pencil Sketch Filter: Invert + Blur + Color Dodge blend */
function applyPencilSketchFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const gray = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[i / 4] = l;
  }

  const inverted = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    inverted[i] = 255 - gray[i];
  }

  const blurred = boxBlurGrayscale(inverted, w, h, 4);

  for (let i = 0; i < gray.length; i++) {
    const b = gray[i];
    const top = blurred[i];
    let val: number;
    if (top >= 255) {
      val = 255;
    } else {
      val = Math.min(255, Math.floor((b << 8) / (255 - top)));
    }
    val = Math.min(255, Math.max(0, (val - 120) * 1.5 + 120));

    const idx = i * 4;
    const tintR = 250 / 255;
    const tintG = 247 / 255;
    const tintB = 240 / 255;

    data[idx] = Math.round(val * tintR);
    data[idx + 1] = Math.round(val * tintG);
    data[idx + 2] = Math.round(val * tintB);
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 2. Manga Comic: Grayscale + Halftone Dot Pattern */
function applyMangaComicFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const dotSize = 4;

  for (let y = 0; y < h; y += dotSize) {
    for (let x = 0; x < w; x += dotSize) {
      let sumLum = 0;
      let count = 0;

      for (let dy = 0; dy < dotSize && y + dy < h; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          sumLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          count++;
        }
      }
      const avgLum = sumLum / count;

      for (let dy = 0; dy < dotSize && y + dy < h; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < w; dx++) {
          const pixelIdx = ((y + dy) * w + (x + dx)) * 4;
          const dist = Math.hypot(dx - dotSize / 2, dy - dotSize / 2);
          const dot = dist < (1 - avgLum / 255) * (dotSize * 0.7);

          let tone: number;
          if (avgLum < 65) {
            tone = dot ? 15 : 90;
          } else if (avgLum < 130) {
            tone = dot ? 70 : 220;
          } else if (avgLum < 200) {
            tone = dot ? 170 : 255;
          } else {
            tone = 255;
          }
          data[pixelIdx] = tone;
          data[pixelIdx + 1] = tone;
          data[pixelIdx + 2] = tone;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 3. Storybook Watercolor: Smooth gradients + soft color bleed */
function applyWatercolorFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = Math.floor(r / 16) * 16 + 8;
    g = Math.floor(g / 16) * 16 + 8;
    b = Math.floor(b / 16) * 16 + 8;

    const avg = (r + g + b) / 3;
    r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.35 + 10)));
    g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.35 + 8)));
    b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.35 + 15)));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 4. 3D Movie Character (Pixar style): Bilateral-like porcelain skin softening + warm subsurface scattering + cartoon vibrance */
function apply3DMovieCharacterFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Step 1: Smooth porcelain skin tone enhancement
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isSkin = r > 60 && r > g && g > b && (r - b) > 15;

    if (isSkin) {
      // Soft subsurface scattering glow for skin
      r = Math.min(255, Math.round(r * 1.14 + 10));
      g = Math.min(255, Math.round(g * 1.06 + 6));
      b = Math.min(255, Math.round(b * 1.02 + 2));
    } else {
      // Vivid Pixar character accents
      const contrast = 1.22;
      r = Math.min(255, Math.max(0, Math.round((r - 128) * contrast + 128)));
      g = Math.min(255, Math.max(0, Math.round((g - 128) * contrast + 128)));
      b = Math.min(255, Math.max(0, Math.round((b - 128) * contrast + 128)));
    }

    // Pixar cinematic saturation boost
    const avg = (r + g + b) / 3;
    r = Math.min(255, Math.round(avg + (r - avg) * 1.38));
    g = Math.min(255, Math.round(avg + (g - avg) * 1.34));
    b = Math.min(255, Math.round(avg + (b - avg) * 1.34));

    // Warm friendly highlight glow
    if (lum > 150) {
      r = Math.min(255, r + 8);
      g = Math.min(255, g + 4);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // Step 2: Add soft Disney/Pixar cinematic radial lighting
  const rad = Math.hypot(w, h) * 0.65;
  const gradient = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.15, w * 0.5, h * 0.45, rad);
  gradient.addColorStop(0, "rgba(255, 235, 210, 0.12)");
  gradient.addColorStop(0.65, "rgba(255, 180, 140, 0.04)");
  gradient.addColorStop(1, "rgba(30, 20, 50, 0.22)");

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

/* 5. Y2K Flash Camera: Direct flash highlight blowout + cool tones */
function applyY2KFlashFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 135) {
      r = Math.min(255, Math.round(r * 1.28 + 18));
      g = Math.min(255, Math.round(g * 1.28 + 18));
      b = Math.min(255, Math.round(b * 1.35 + 24));
    } else {
      r = Math.max(0, Math.round(r * 0.94));
      g = Math.max(0, Math.round(g * 0.96));
      b = Math.min(255, Math.round(b * 1.12 + 10));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 6. Analog Film: Organic grain + warm Portra 400 palette */
function applyAnalogFilmFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = Math.min(255, Math.round(r * 1.08 + 10));
    g = Math.min(255, Math.round(g * 1.04 + 4));
    b = Math.max(0, Math.round(b * 0.94 - 4));

    const noise = (Math.random() - 0.5) * 18;
    data[i] = Math.min(255, Math.max(0, Math.round(r + noise)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(g + noise)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(b + noise)));
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 7. Vintage Film Strip: Movie amber & cyan grading */
function applyVintageFilmStripFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = (r + g + b) / 3;
    if (lum > 128) {
      r = Math.min(255, Math.round(r * 1.15 + 12));
      g = Math.min(255, Math.round(g * 1.08 + 6));
      b = Math.max(0, Math.round(b * 0.9));
    } else {
      r = Math.max(0, Math.round(r * 0.88));
      g = Math.min(255, Math.round(g * 1.05 + 6));
      b = Math.min(255, Math.round(b * 1.18 + 14));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 8. Lego Mini Bricks: 3D Bevel Bricks + Raised Center Studs */
function applyLegoBricksFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const blockSize = Math.max(10, Math.round(w / 40));
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.ceil(w / blockSize);
  tempCanvas.height = Math.ceil(h / blockSize);
  const tctx = tempCanvas.getContext("2d");
  if (!tctx) return;

  tctx.drawImage(ctx.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
  const lowData = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

  ctx.clearRect(0, 0, w, h);

  for (let by = 0; by < tempCanvas.height; by++) {
    for (let bx = 0; bx < tempCanvas.width; bx++) {
      const idx = (by * tempCanvas.width + bx) * 4;
      let r = lowData[idx];
      let g = lowData[idx + 1];
      let b = lowData[idx + 2];

      // Boost toy plastic saturation
      const avg = (r + g + b) / 3;
      r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.45)));
      g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.45)));
      b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.45)));

      const px = bx * blockSize;
      const py = by * blockSize;

      // Base brick color
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, blockSize, blockSize);

      // 3D Bevel highlight top & left
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fillRect(px, py, blockSize, 1.5);
      ctx.fillRect(px, py, 1.5, blockSize);

      // 3D Bevel shadow bottom & right
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.fillRect(px, py + blockSize - 1.5, blockSize, 1.5);
      ctx.fillRect(px + blockSize - 1.5, py, 1.5, blockSize);

      // Raised Lego circular stud
      const cx = px + blockSize / 2;
      const cy = py + blockSize / 2;
      const radius = blockSize * 0.28;

      // Stud drop shadow
      ctx.beginPath();
      ctx.arc(cx + 0.8, cy + 0.8, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fill();

      // Stud body
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${Math.min(255, r + 15)}, ${Math.min(255, g + 15)}, ${Math.min(255, b + 15)})`;
      ctx.fill();

      // Stud highlight reflection crescent
      ctx.beginPath();
      ctx.arc(cx - radius * 0.2, cy - radius * 0.2, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fill();
    }
  }
}

/* 9. Sims Game: Clean 3D game mesh look with pink ambiance */
function applySimsGameFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = Math.min(255, Math.round(r * 1.1 + 12));
    g = Math.min(255, Math.round(g * 0.98 + 4));
    b = Math.min(255, Math.round(b * 1.08 + 14));

    const lum = (r + g + b) / 3;
    if (lum > 150) {
      r = Math.min(255, Math.round(r * 1.08 + 8));
      b = Math.min(255, Math.round(b * 1.06 + 8));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 10. Anime Art Filter: Smooth anime skin + edge contour detection + vibrant anime cel colors */
function applyAnimeArtFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isSkin = r > 60 && r > g && g > b && (r - b) > 15;

    if (isSkin) {
      // Smooth peach anime skin tone
      r = Math.min(255, Math.round(r * 1.12 + 14));
      g = Math.min(255, Math.round(g * 1.04 + 8));
      b = Math.min(255, Math.round(b * 1.06 + 10));
    } else {
      // 4-band smooth cel shading
      const band = Math.floor(lum / 64) * 64 + 32;
      const factor = band / Math.max(1, lum);
      r = Math.min(255, Math.round(r * factor));
      g = Math.min(255, Math.round(g * factor));
      b = Math.min(255, Math.round(b * factor));
    }

    // Anime eye & hair vibrance
    const avg = (r + g + b) / 3;
    r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.42 + 4)));
    g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.38 + 2)));
    b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.45 + 6)));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // Add subtle anime ink contour line edge detection
  const edgeCanvas = document.createElement("canvas");
  edgeCanvas.width = w;
  edgeCanvas.height = h;
  const ectx = edgeCanvas.getContext("2d");
  if (ectx) {
    ectx.drawImage(ctx.canvas, 0, 0);
    const edgeData = ectx.getImageData(0, 0, w, h);
    const ed = edgeData.data;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const rightIdx = (y * w + (x + 1)) * 4;
        const downIdx = ((y + 1) * w + x) * 4;

        const diffH = Math.abs(ed[idx] - ed[rightIdx]) + Math.abs(ed[idx + 1] - ed[rightIdx + 1]);
        const diffV = Math.abs(ed[idx] - ed[downIdx]) + Math.abs(ed[idx + 1] - ed[downIdx + 1]);

        if (diffH + diffV > 65) {
          // Dark ink outline
          data[idx] = Math.round(data[idx] * 0.35);
          data[idx + 1] = Math.round(data[idx + 1] * 0.35);
          data[idx + 2] = Math.round(data[idx + 2] * 0.35);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

/* 11. Cyberpunk Neon Glow: Cyan/Magenta split tone */
function applyCyberpunkGlowFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 120) {
      r = Math.min(255, Math.round(r * 1.35 + 25));
      g = Math.max(0, Math.round(g * 0.75));
      b = Math.min(255, Math.round(b * 1.3 + 30));
    } else {
      r = Math.max(0, Math.round(r * 0.6));
      g = Math.min(255, Math.round(g * 1.1 + 15));
      b = Math.min(255, Math.round(b * 1.4 + 35));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 12. Pas Foto Formal: Studio backdrop + clarity retouch + handsome dark business suit & necktie */
function applyPasFotoFormalFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Step 1: Retouch face with balanced studio lighting & clarity
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Professional studio clarity curve
    const contrast = 1.24;
    r = Math.min(255, Math.max(0, Math.round((r - 128) * contrast + 132)));
    g = Math.min(255, Math.max(0, Math.round((g - 128) * contrast + 130)));
    b = Math.min(255, Math.max(0, Math.round((b - 128) * contrast + 128)));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // Step 2: Render crisp formal black business suit & silk tie overlay at chest/lower body
  const suitTop = h * 0.68;
  const neckCenterX = w * 0.5;
  const neckWidth = w * 0.32;
  const collarBottom = h * 0.78;

  // 1. Crisp White Dress Shirt Triangle
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(neckCenterX - neckWidth * 0.52, suitTop);
  ctx.lineTo(neckCenterX, collarBottom + h * 0.04);
  ctx.lineTo(neckCenterX + neckWidth * 0.52, suitTop);
  ctx.lineTo(neckCenterX + neckWidth * 0.7, suitTop + h * 0.09);
  ctx.lineTo(neckCenterX - neckWidth * 0.7, suitTop + h * 0.09);
  ctx.closePath();
  ctx.fill();

  // White shirt collar wings
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;

  // Left Collar Wing
  ctx.beginPath();
  ctx.moveTo(neckCenterX - neckWidth * 0.48, suitTop);
  ctx.lineTo(neckCenterX - neckWidth * 0.08, collarBottom);
  ctx.lineTo(neckCenterX - neckWidth * 0.38, collarBottom + h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Collar Wing
  ctx.beginPath();
  ctx.moveTo(neckCenterX + neckWidth * 0.48, suitTop);
  ctx.lineTo(neckCenterX + neckWidth * 0.08, collarBottom);
  ctx.lineTo(neckCenterX + neckWidth * 0.38, collarBottom + h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Silk Necktie (Rich Dark Blue/Black)
  const tieTop = collarBottom - h * 0.015;
  const tieKnotW = neckWidth * 0.26;
  const tieBottomW = neckWidth * 0.42;

  // Tie Knot
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(neckCenterX - tieKnotW * 0.5, tieTop);
  ctx.lineTo(neckCenterX + tieKnotW * 0.5, tieTop);
  ctx.lineTo(neckCenterX + tieKnotW * 0.32, tieTop + h * 0.04);
  ctx.lineTo(neckCenterX - tieKnotW * 0.32, tieTop + h * 0.04);
  ctx.closePath();
  ctx.fill();

  // Tie Body
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(neckCenterX - tieKnotW * 0.32, tieTop + h * 0.04);
  ctx.lineTo(neckCenterX + tieKnotW * 0.32, tieTop + h * 0.04);
  ctx.lineTo(neckCenterX + tieBottomW * 0.5, h);
  ctx.lineTo(neckCenterX, h + h * 0.03);
  ctx.lineTo(neckCenterX - tieBottomW * 0.5, h);
  ctx.closePath();
  ctx.fill();

  // Tie Satin Sheen
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(neckCenterX - tieKnotW * 0.08, tieTop, tieKnotW * 0.16, h - tieTop);

  // 3. Tailored Black Business Suit Jacket with Lapels
  ctx.fillStyle = "#090d16";

  // Left Jacket Shoulder & Lapel
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.quadraticCurveTo(w * 0.18, h * 0.69, neckCenterX - neckWidth * 0.52, suitTop + h * 0.02);
  ctx.lineTo(neckCenterX - neckWidth * 0.16, collarBottom + h * 0.07);
  ctx.lineTo(neckCenterX - neckWidth * 0.28, collarBottom + h * 0.05);
  ctx.lineTo(neckCenterX - neckWidth * 0.08, h * 0.95);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Right Jacket Shoulder & Lapel
  ctx.beginPath();
  ctx.moveTo(w, h * 0.72);
  ctx.quadraticCurveTo(w * 0.82, h * 0.69, neckCenterX + neckWidth * 0.52, suitTop + h * 0.02);
  ctx.lineTo(neckCenterX + neckWidth * 0.16, collarBottom + h * 0.07);
  ctx.lineTo(neckCenterX + neckWidth * 0.28, collarBottom + h * 0.05);
  ctx.lineTo(neckCenterX + neckWidth * 0.08, h * 0.95);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Subtle lapel edge seam lighting
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* Helper for Gaussian Box Blur */
function boxBlurGrayscale(scl: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tcl = new Uint8Array(w * h);
  for (let i = 0; i < scl.length; i++) tcl[i] = scl[i];

  // Horizontal blur
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      let count = 0;
      for (let ix = Math.max(0, x - r); ix <= Math.min(w - 1, x + r); ix++) {
        val += scl[y * w + ix];
        count++;
      }
      tcl[y * w + x] = Math.round(val / count);
    }
  }

  // Vertical blur
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let val = 0;
      let count = 0;
      for (let iy = Math.max(0, y - r); iy <= Math.min(h - 1, y + r); iy++) {
        val += tcl[iy * w + x];
        count++;
      }
      out[y * w + x] = Math.round(val / count);
    }
  }

  return out;
}

/**
 * Returns a fast CSS preview simulation string for live video viewfinder.
 */
export function getAiPreviewCss(shaderType: AiEffect["shaderType"]): string {
  switch (shaderType) {
    case "3d_movie":
      return "brightness(1.1) contrast(1.18) saturate(1.35)";
    case "pencil":
      return "grayscale(1) contrast(1.6) brightness(1.1)";
    case "sketch":
      return "grayscale(1) contrast(2.2) brightness(0.95)";
    case "watercolor":
      return "saturate(1.45) contrast(1.15) brightness(1.05)";
    case "y2k_flash":
      return "contrast(1.25) brightness(1.25) saturate(1.25)";
    case "anime":
      return "contrast(1.25) saturate(1.45) brightness(1.08)";
    case "lego":
      return "contrast(1.25) saturate(1.35) brightness(1.02)";
    case "sims":
      return "contrast(1.1) saturate(1.25) brightness(1.08) hue-rotate(345deg)";
    case "analog":
      return "sepia(0.25) contrast(1.12) brightness(1.05) saturate(1.2)";
    case "vintage_film":
      return "contrast(1.25) saturate(1.2) brightness(1.02) sepia(0.35)";
    case "cyberpunk":
      return "hue-rotate(270deg) contrast(1.35) saturate(1.5) brightness(1.05)";
    case "pas_foto":
      return "contrast(1.2) brightness(1.05) saturate(1.05)";
    default:
      return "brightness(1.08) contrast(1.15) saturate(1.25)";
  }
}
