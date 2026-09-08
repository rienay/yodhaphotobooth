// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const loadedEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");

export default defineConfig({
  vite: {
    envPrefix: ["VITE_", "SUPABASE_"],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL || loadedEnv.VITE_SUPABASE_URL || "https://jsbyuegfpbqnaasaqhto.supabase.co"
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || loadedEnv.VITE_SUPABASE_ANON_KEY || ""
      ),
      "import.meta.env.SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL || loadedEnv.VITE_SUPABASE_URL || "https://jsbyuegfpbqnaasaqhto.supabase.co"
      ),
      "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || loadedEnv.VITE_SUPABASE_ANON_KEY || ""
      ),
      "import.meta.env.VITE_XENDIT_SECRET_KEY": JSON.stringify(
        process.env.VITE_XENDIT_SECRET_KEY || loadedEnv.VITE_XENDIT_SECRET_KEY || ""
      ),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
});

