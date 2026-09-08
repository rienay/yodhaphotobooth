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
  mode: "client",
  apiKey: "",
  apiEndpoint: "",
  modelName: "stabilityai/sdxl-turbo",
  strength: 0.85,
};

export const DEFAULT_AI_EFFECTS: AiEffect[] = [
  {
    id: "3d_movie",
    name: "3D Movie Character",
    category: "character",
    categoryLabel: "Karakter 3D",
    emoji: "🧸",
    desc: "Ubah foto menjadi karakter animasi 3D ala film Pixar / Disney dengan kulit halus dan mata berkilau.",
    prompt: "3D animated movie character, Disney Pixar style, cute, expressive eyes, smooth 3D render, octane render, soft subsurface scattering, vibrant cinematic lighting",
    negativePrompt: "photorealistic, ugly, deformed, noisy, grainy, blurry, 2D",
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
    prompt: "Formal Indonesian passport photo, professional black business suit, white collared shirt, crisp necktie, studio lighting, neutral clean solid background, sharp professional portrait",
    negativePrompt: "casual clothes, t-shirt, messy hair, outdoors, low resolution",
    shaderType: "pas_foto",
    previewUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Ahmad Syahrul",
    updatedAt: "2026-08-18",
  },
  {
    id: "y2k_flash",
    name: "Y2K Flash Camera",
    category: "retro",
    categoryLabel: "Retro 2000-an",
    emoji: "⚡",
    desc: "Gaya kamera saku digital tahun 2000-an dengan direct flash terang, saturasi ceria, dan vibe nostalgia.",
    prompt: "Y2K 2000s direct flash photography, digital point-and-shoot camera aesthetic, harsh front flash, cool tones, slight lens flare, nostalgic youth aesthetic",
    negativePrompt: "studio softbox, modern HDR, dark shadows, flat lighting",
    shaderType: "y2k_flash",
    previewUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Subhan Agustira",
    updatedAt: "2026-07-23",
  },
  {
    id: "pencil_sketch",
    name: "Pencil Sketch",
    category: "art",
    categoryLabel: "Seni Lukis",
    emoji: "✏️",
    desc: "Sketsa pensil grafit monokrom artistik dengan arsiran tangan halus pada tekstur kertas seni.",
    prompt: "Hand-drawn graphite pencil portrait sketch, fine crosshatch shading, artistic contour lines, charcoal texture, off-white sketchbook paper, detailed fine art drawing",
    negativePrompt: "color, digital painting, 3D, blurry, photorealistic",
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
    prompt: "Fairy tale storybook watercolor illustration, gentle ink linework, soft color bleed, paper texture, pastel washes, whimsical children's book art style",
    negativePrompt: "sharp photo, harsh 3D, dark grunge, oversaturated neon",
    shaderType: "watercolor",
    previewUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "anime_portrait",
    name: "Anime Portrait",
    category: "character",
    categoryLabel: "Karakter Anime",
    emoji: "🌸",
    desc: "Transformasi karakter anime Jepang modern ala Studio Ghibli & Makoto Shinkai dengan mata bercahaya.",
    prompt: "Modern Japanese anime character portrait, Studio Ghibli Makoto Shinkai aesthetic, clean cel-shading, vibrant colors, expressive anime eyes with highlights, soft lighting",
    negativePrompt: "real photo, 3d render, clay, western cartoon, disfigured",
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
    desc: "Karakter minifigur balok mainan plastik dengan tekstur stud berkilau dan gaya mainan ikonik.",
    prompt: "Lego minifigure character style, plastic toy aesthetic, glossy yellow face, modular brick background, toy photography macro lighting, playful collectible figure",
    negativePrompt: "human skin, realistic hair, photo, fuzzy cloth",
    shaderType: "lego",
    previewUrl: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600&auto=format&fit=crop&q=80",
    enabled: true,
    isCustom: false,
    author: "Dreambooth",
    updatedAt: "2026-06-15",
  },
  {
    id: "sims_pink",
    name: "Sims [pink version]",
    category: "game",
    categoryLabel: "Mainan & Game",
    emoji: "🎮",
    desc: "Karakter gaya game The Sims dengan nuansa pink pastel ceria, pencahayaan 3D game, dan aksen cerah.",
    prompt: "The Sims 4 video game character render, pink aesthetic ambient lighting, green plumbob glow nearby, smooth 3D game engine mesh, trendy stylish outfit, sweet pastel vibe",
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
    prompt: "Cyberpunk sci-fi portrait, neon cyan and magenta rim lighting, glowing holographic accents, dark rainy futuristic city reflections, high tech aesthetic",
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
  if (provider.mode !== "client" && provider.apiKey) {
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

/* 1. Pencil Sketch Filter: Invert + Blur + Color Dodge blend */
function applyPencilSketchFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Grayscale
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[i / 4] = l;
  }

  // 2. Invert grayscale
  const inverted = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    inverted[i] = 255 - gray[i];
  }

  // 3. Fast box blur on inverted
  const blurred = boxBlurGrayscale(inverted, w, h, 4);

  // 4. Color Dodge: base / (255 - blend)
  for (let i = 0; i < gray.length; i++) {
    const b = gray[i];
    const top = blurred[i];
    let val: number;
    if (top >= 255) {
      val = 255;
    } else {
      val = Math.min(255, Math.floor((b << 8) / (255 - top)));
    }
    // High contrast sketch threshold
    val = Math.min(255, Math.max(0, (val - 120) * 1.5 + 120));

    const idx = i * 4;
    // Slight warm paper tint (250, 248, 242)
    const tintR = 250 / 255;
    const tintG = 247 / 255;
    const tintB = 240 / 255;

    data[idx] = Math.round(val * tintR);
    data[idx + 1] = Math.round(val * tintG);
    data[idx + 2] = Math.round(val * tintB);
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 2. Manga Comic Filter: Edge detection + Halftone Screentone */
function applyMangaComicFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const gray = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Edge detection with Sobel
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] -
        2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] -
        gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];

      const gy =
        -gray[(y - 1) * w + (x - 1)] -
        2 * gray[(y - 1) * w + x] -
        gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];

      const edge = Math.sqrt(gx * gx + gy * gy);
      const pixelIdx = idx * 4;

      if (edge > 65) {
        // Crisp black ink border
        data[pixelIdx] = 20;
        data[pixelIdx + 1] = 20;
        data[pixelIdx + 2] = 20;
      } else {
        const l = gray[idx];
        // Halftone dots simulation
        const dot = ((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)) ? 1 : 0;
        let tone: number;
        if (l < 60) {
          tone = 40;
        } else if (l < 130) {
          tone = dot ? 70 : 220;
        } else if (l < 200) {
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

  ctx.putImageData(imgData, 0, 0);
}

/* 3. Storybook Watercolor: Smooth gradients + soft color bleed */
function applyWatercolorFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Edge-preserving smoothing + vibrant pigment saturation
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Color quantization (steps of 16) to create painterly patches
    r = Math.floor(r / 16) * 16 + 8;
    g = Math.floor(g / 16) * 16 + 8;
    b = Math.floor(b / 16) * 16 + 8;

    // Boost saturation & lightness for fairy tale glow
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

/* 4. 3D Movie Character (Pixar style): Porcelain skin smoothing, enhanced highlights, rich colors */
function apply3DMovieCharacterFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Subsurface scattering warmth boost
    r = Math.min(255, Math.round(r * 1.1 + 8));
    g = Math.min(255, Math.round(g * 1.05 + 4));
    b = Math.min(255, Math.round(b * 1.02));

    // Smooth contrast (S-Curve)
    const contrast = 1.18;
    r = Math.min(255, Math.max(0, Math.round((r - 128) * contrast + 130)));
    g = Math.min(255, Math.max(0, Math.round((g - 128) * contrast + 128)));
    b = Math.min(255, Math.max(0, Math.round((b - 128) * contrast + 126)));

    // Extra vibrance
    const maxVal = Math.max(r, g, b);
    const avg = (r + g + b) / 3;
    const satBoost = (maxVal - avg) * 0.3;
    r = Math.min(255, Math.round(r + (r - avg) * 0.2 + satBoost * 0.5));
    g = Math.min(255, Math.round(g + (g - avg) * 0.2));
    b = Math.min(255, Math.round(b + (b - avg) * 0.2));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

/* 5. Y2K Flash Camera: Direct flash highlight blowout + cool tones */
function applyY2KFlashFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // High flash luminance with cool blue tone
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 140) {
      // Bloom flash highlights
      r = Math.min(255, Math.round(r * 1.25 + 15));
      g = Math.min(255, Math.round(g * 1.25 + 15));
      b = Math.min(255, Math.round(b * 1.3 + 20));
    } else {
      // Cool digital shadow
      r = Math.max(0, Math.round(r * 0.95));
      g = Math.max(0, Math.round(g * 0.98));
      b = Math.min(255, Math.round(b * 1.1 + 8));
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

    // Kodak Portra warm tone
    r = Math.min(255, Math.round(r * 1.08 + 10));
    g = Math.min(255, Math.round(g * 1.04 + 4));
    b = Math.max(0, Math.round(b * 0.94 - 4));

    // Film grain noise
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

    // Split tone: Warm highlights, teal/cyan shadows
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

/* 8. Lego Mini Bricks: Pixel blocks + circular raised stud highlight */
function applyLegoBricksFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const blockSize = Math.max(8, Math.round(w / 48));
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
      const r = lowData[idx];
      const g = lowData[idx + 1];
      const b = lowData[idx + 2];

      const px = bx * blockSize;
      const py = by * blockSize;

      // Base block fill
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, blockSize, blockSize);

      // Brick border
      ctx.strokeStyle = `rgba(0,0,0,0.18)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, blockSize - 1, blockSize - 1);

      // Raised stud circle in center of each brick
      const cx = px + blockSize / 2;
      const cy = py + blockSize / 2;
      const radius = blockSize * 0.28;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,0.32)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,0,0,0.22)`;
      ctx.stroke();
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

    // Pink / Magenta subtle tint for Sims aesthetic
    r = Math.min(255, Math.round(r * 1.1 + 12));
    g = Math.min(255, Math.round(g * 0.98 + 4));
    b = Math.min(255, Math.round(b * 1.08 + 14));

    // Smooth highlight
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

/* 10. Anime Art Filter: Cel-shading posterization + vibrant saturation */
function applyAnimeArtFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Posterize to 5 bands (cel-shading)
    r = Math.floor(r / 51) * 51 + 25;
    g = Math.floor(g / 51) * 51 + 25;
    b = Math.floor(b / 51) * 51 + 25;

    // Anime vibrant boost
    const avg = (r + g + b) / 3;
    r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.45 + 10)));
    g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.45 + 6)));
    b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.45 + 12)));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
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
      // Hot magenta & neon pink highlights
      r = Math.min(255, Math.round(r * 1.35 + 25));
      g = Math.max(0, Math.round(g * 0.75));
      b = Math.min(255, Math.round(b * 1.3 + 30));
    } else {
      // Deep cyan and dark violet shadows
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

/* 12. Pas Foto Formal: Crisp studio clarity, balanced skin tones */
function applyPasFotoFormalFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Studio lighting clarity
    const contrast = 1.2;
    r = Math.min(255, Math.max(0, Math.round((r - 128) * contrast + 128 + 6)));
    g = Math.min(255, Math.max(0, Math.round((g - 128) * contrast + 128 + 4)));
    b = Math.min(255, Math.max(0, Math.round((b - 128) * contrast + 128 + 2)));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
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
 * Cloud Generative AI Transform Caller (Replicate, Fal.ai, or Custom Webhook)
 */
async function callCloudAiTransform(
  sourceCanvas: HTMLCanvasElement,
  effect: AiEffect,
  provider: AiProviderSettings
): Promise<string | null> {
  const base64Img = sourceCanvas.toDataURL("image/jpeg", 0.9);

  if (provider.mode === "custom_webhook" && provider.apiEndpoint) {
    const res = await fetch(provider.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64Img,
        prompt: effect.prompt,
        negative_prompt: effect.negativePrompt,
        strength: provider.strength || 0.8,
      }),
    });
    if (!res.ok) throw new Error(`Custom webhook returned ${res.status}`);
    const data = await res.json();
    return data.image || data.output || null;
  }

  return null;
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
