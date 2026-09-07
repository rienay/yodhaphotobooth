-- ============================================================
-- YODHA PHOTOBOOTH - SUPABASE DATABASE SCHEMA & STORAGE SETUP
-- ============================================================
-- Jalankan query ini di Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- 1. TABEL TEMPLATE CUSTOM PHOTOBOOTH
CREATE TABLE IF NOT EXISTS public.photobooth_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    layout TEXT NOT NULL,
    img TEXT NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT true,
    enabled BOOLEAN NOT NULL DEFAULT true,
    preset_id TEXT DEFAULT '',
    photo_boxes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.photobooth_templates ADD COLUMN IF NOT EXISTS photo_boxes JSONB;

ALTER TABLE public.photobooth_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read templates" ON public.photobooth_templates;
CREATE POLICY "Allow public read templates" ON public.photobooth_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert templates" ON public.photobooth_templates;
CREATE POLICY "Allow public insert templates" ON public.photobooth_templates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update templates" ON public.photobooth_templates;
CREATE POLICY "Allow public update templates" ON public.photobooth_templates FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete templates" ON public.photobooth_templates;
CREATE POLICY "Allow public delete templates" ON public.photobooth_templates FOR DELETE USING (true);


-- 2. TABEL SESI HASIL FOTO (STRIP, GIF, LIVE PHOTO, DAN FOTO MENTAH)
CREATE TABLE IF NOT EXISTS public.photobooth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code TEXT NOT NULL,
    layout TEXT NOT NULL,
    template_url TEXT,
    strip_url TEXT NOT NULL,
    gif_url TEXT,
    live_photo_url TEXT,
    live_videos JSONB DEFAULT '[]'::jsonb,
    raw_photos JSONB DEFAULT '[]'::jsonb,
    total_photos INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migrasi jika tabel sudah ada sebelumnya:
ALTER TABLE public.photobooth_sessions ADD COLUMN IF NOT EXISTS template_url TEXT;
ALTER TABLE public.photobooth_sessions ADD COLUMN IF NOT EXISTS live_photo_url TEXT;
ALTER TABLE public.photobooth_sessions ADD COLUMN IF NOT EXISTS live_videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.photobooth_sessions ADD COLUMN IF NOT EXISTS raw_photos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.photobooth_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read sessions" ON public.photobooth_sessions;
CREATE POLICY "Allow public read sessions" ON public.photobooth_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert sessions" ON public.photobooth_sessions;
CREATE POLICY "Allow public insert sessions" ON public.photobooth_sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update sessions" ON public.photobooth_sessions;
CREATE POLICY "Allow public update sessions" ON public.photobooth_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete sessions" ON public.photobooth_sessions;
CREATE POLICY "Allow public delete sessions" ON public.photobooth_sessions FOR DELETE USING (true);

-- Index untuk mempercepat query scan QR pencarian session_code
CREATE INDEX IF NOT EXISTS idx_photobooth_sessions_code ON public.photobooth_sessions (session_code);


-- 3. TABEL PENGATURAN BOOTH (CAMERA, DISABLED TEMPLATES, DLL)
CREATE TABLE IF NOT EXISTS public.photobooth_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.photobooth_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read settings" ON public.photobooth_settings;
CREATE POLICY "Allow public read settings" ON public.photobooth_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update settings" ON public.photobooth_settings;
CREATE POLICY "Allow public insert/update settings" ON public.photobooth_settings FOR ALL USING (true) WITH CHECK (true);


-- 4. BUCKET STORAGE UNTUK ASSET FOTO DAN TEMPLATE
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photobooth', 'photobooth', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read photobooth storage" ON storage.objects;
CREATE POLICY "Public read photobooth storage" ON storage.objects FOR SELECT USING (bucket_id = 'photobooth');

DROP POLICY IF EXISTS "Public insert photobooth storage" ON storage.objects;
CREATE POLICY "Public insert photobooth storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photobooth');

DROP POLICY IF EXISTS "Public update photobooth storage" ON storage.objects;
CREATE POLICY "Public update photobooth storage" ON storage.objects FOR UPDATE USING (bucket_id = 'photobooth');

DROP POLICY IF EXISTS "Public delete photobooth storage" ON storage.objects;
CREATE POLICY "Public delete photobooth storage" ON storage.objects FOR DELETE USING (bucket_id = 'photobooth');


-- 5. FUNCTION AUTO-DELETE / RETENSI SESI FOTO 30 HARI
-- Menghapus seluruh sesi foto pengunjung yang usianya sudah lebih dari 30 hari secara otomatis
CREATE OR REPLACE FUNCTION public.cleanup_old_photobooth_sessions(days_retention INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.photobooth_sessions
    WHERE created_at < (NOW() - (days_retention || ' days')::INTERVAL);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Beri izin eksekusi function jika dipanggil via RPC dari frontend
GRANT EXECUTE ON FUNCTION public.cleanup_old_photobooth_sessions(INTEGER) TO anon, authenticated, service_role;

