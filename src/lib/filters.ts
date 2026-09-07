export interface CameraFilter {
  id: string;
  name: string;
  css: string;
  emoji: string;
  desc: string;
  enabled?: boolean;
  isCustom?: boolean;
}

export interface FilterSliderSettings {
  brightness: number; // 50 - 200% (default 100)
  contrast: number;   // 50 - 200% (default 100)
  saturate: number;   // 0 - 300% (default 100)
  sepia: number;      // 0 - 100% (default 0)
  grayscale: number;  // 0 - 100% (default 0)
  hueRotate: number;  // 0 - 360deg (default 0)
  blur: number;       // 0 - 5px (default 0)
}

export const DEFAULT_SLIDER_SETTINGS: FilterSliderSettings = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  sepia: 0,
  grayscale: 0,
  hueRotate: 0,
  blur: 0,
};

export const DEFAULT_PHOTO_FILTERS: CameraFilter[] = [
  {
    id: "normal",
    name: "Alami (Normal)",
    css: "none",
    emoji: "✨",
    desc: "Warna jernih natural tanpa efek tambahan",
    enabled: true,
    isCustom: false,
  },
  {
    id: "warm",
    name: "Vintage Hangat",
    css: "sepia(0.35) contrast(1.05) brightness(1.02) saturate(1.15)",
    emoji: "🎞️",
    desc: "Sentuhan retro 90-an bernuansa hangat",
    enabled: true,
    isCustom: false,
  },
  {
    id: "bw",
    name: "Hitam Putih (B&W)",
    css: "grayscale(1) contrast(1.2) brightness(1.05)",
    emoji: "🖤",
    desc: "Monokrom klasik elegan bernuansa film noir",
    enabled: true,
    isCustom: false,
  },
  {
    id: "glow",
    name: "Soft Barbie Glow",
    css: "contrast(1.05) brightness(1.1) saturate(1.25)",
    emoji: "🌸",
    desc: "Cerah lembut bercahaya dan merona segar",
    enabled: true,
    isCustom: false,
  },
  {
    id: "cool",
    name: "Cool Cinema",
    css: "contrast(1.1) hue-rotate(185deg) saturate(0.9)",
    emoji: "❄️",
    desc: "Nuansa sejuk sinematik seperti di bioskop",
    enabled: true,
    isCustom: false,
  },
  {
    id: "cyber",
    name: "Retro Cyber",
    css: "contrast(1.3) saturate(1.4) brightness(1.04)",
    emoji: "⚡",
    desc: "Warna kontras tinggi pop energik gaya futuristik",
    enabled: true,
    isCustom: false,
  },
];

/**
 * Builds CSS filter string from slider values.
 */
export function generateFilterCss(s: FilterSliderSettings): string {
  const parts: string[] = [];

  // Brightness
  if (Math.abs(s.brightness - 100) >= 1) {
    const b = Math.round((s.brightness / 100) * 100) / 100;
    parts.push(`brightness(${b})`);
  }

  // Contrast
  if (Math.abs(s.contrast - 100) >= 1) {
    const c = Math.round((s.contrast / 100) * 100) / 100;
    parts.push(`contrast(${c})`);
  }

  // Saturate
  if (Math.abs(s.saturate - 100) >= 1) {
    const sat = Math.round((s.saturate / 100) * 100) / 100;
    parts.push(`saturate(${sat})`);
  }

  // Sepia
  if (s.sepia > 0) {
    const sep = Math.round((s.sepia / 100) * 100) / 100;
    parts.push(`sepia(${sep})`);
  }

  // Grayscale
  if (s.grayscale > 0) {
    const g = Math.round((s.grayscale / 100) * 100) / 100;
    parts.push(`grayscale(${g})`);
  }

  // Hue-Rotate
  if (s.hueRotate > 0) {
    parts.push(`hue-rotate(${Math.round(s.hueRotate)}deg)`);
  }

  // Blur
  if (s.blur > 0) {
    parts.push(`blur(${s.blur}px)`);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

/**
 * Parses existing CSS filter string back into slider values.
 */
export function parseFilterCss(css: string): FilterSliderSettings {
  const s: FilterSliderSettings = { ...DEFAULT_SLIDER_SETTINGS };
  if (!css || css.trim() === "" || css === "none") return s;

  // Brightness
  const bMatch = css.match(/brightness\(([\d.]+)%?\)/i);
  if (bMatch) {
    const val = parseFloat(bMatch[1]);
    s.brightness = Math.round(bMatch[0].includes("%") ? val : (val <= 3 ? val * 100 : val));
  }

  // Contrast
  const cMatch = css.match(/contrast\(([\d.]+)%?\)/i);
  if (cMatch) {
    const val = parseFloat(cMatch[1]);
    s.contrast = Math.round(cMatch[0].includes("%") ? val : (val <= 3 ? val * 100 : val));
  }

  // Saturate
  const satMatch = css.match(/saturate\(([\d.]+)%?\)/i);
  if (satMatch) {
    const val = parseFloat(satMatch[1]);
    s.saturate = Math.round(satMatch[0].includes("%") ? val : (val <= 4 ? val * 100 : val));
  }

  // Sepia
  const sepMatch = css.match(/sepia\(([\d.]+)%?\)/i);
  if (sepMatch) {
    const val = parseFloat(sepMatch[1]);
    s.sepia = Math.round(sepMatch[0].includes("%") ? val : (val <= 1 ? val * 100 : val));
  }

  // Grayscale
  const gMatch = css.match(/grayscale\(([\d.]+)%?\)/i);
  if (gMatch) {
    const val = parseFloat(gMatch[1]);
    s.grayscale = Math.round(gMatch[0].includes("%") ? val : (val <= 1 ? val * 100 : val));
  }

  // Hue-Rotate
  const hMatch = css.match(/hue-rotate\(([\d.]+)deg\)/i);
  if (hMatch) {
    s.hueRotate = Math.round(parseFloat(hMatch[1]));
  }

  // Blur
  const blMatch = css.match(/blur\(([\d.]+)px\)/i);
  if (blMatch) {
    s.blur = Math.round(parseFloat(blMatch[1]) * 10) / 10;
  }

  return s;
}

/**
 * Loads filters from localStorage with fallback to default filters.
 */
export function loadLocalFilters(): CameraFilter[] {
  if (typeof window === "undefined") return DEFAULT_PHOTO_FILTERS;
  try {
    const raw =
      localStorage.getItem("yodha_setting_camera_filters") ||
      localStorage.getItem("yodha_camera_filters");
    if (raw) {
      const parsed: CameraFilter[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse local camera filters:", err);
  }
  return DEFAULT_PHOTO_FILTERS;
}

/**
 * Saves filters to localStorage and dispatches change event for active booth screens.
 */
export function saveLocalFilters(filters: CameraFilter[]): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(filters);
    localStorage.setItem("yodha_setting_camera_filters", json);
    localStorage.setItem("yodha_camera_filters", json);
    window.dispatchEvent(new CustomEvent("yodha_filters_changed", { detail: filters }));
  } catch (err) {
    console.warn("Failed to save camera filters locally:", err);
  }
}
