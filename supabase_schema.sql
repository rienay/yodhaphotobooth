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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS & Policies for Templates
ALTER TABLE public.photobooth_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read templates" 
ON public.photobooth_templates FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert templates" 
ON public.photobooth_templates FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update templates" 
ON public.photobooth_templates FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete templates" 
ON public.photobooth_templates FOR DELETE 
USING (true);


-- 2. TABEL SESI HASIL FOTO (STRIP & GIF)
CREATE TABLE IF NOT EXISTS public.photobooth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code TEXT NOT NULL,
    layout TEXT NOT NULL,
    variant TEXT DEFAULT '',
    strip_url TEXT NOT NULL,
    gif_url TEXT,
    total_photos INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS & Policies for Sessions
ALTER TABLE public.photobooth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read sessions" 
ON public.photobooth_sessions FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert sessions" 
ON public.photobooth_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete sessions" 
ON public.photobooth_sessions FOR DELETE 
USING (true);


-- 3. TABEL PENGATURAN BOOTH (CAMERA, DISABLED TEMPLATES, DLL)
CREATE TABLE IF NOT EXISTS public.photobooth_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS & Policies for Settings
ALTER TABLE public.photobooth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read settings" 
ON public.photobooth_settings FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert/update settings" 
ON public.photobooth_settings FOR ALL 
USING (true)
WITH CHECK (true);


-- 4. BUCKET STORAGE UNTUK ASSET FOTO DAN TEMPLATE
-- Membuat bucket 'photobooth' jika belum ada
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photobooth', 'photobooth', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies untuk Storage Bucket
CREATE POLICY "Public read photobooth storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'photobooth');

CREATE POLICY "Public insert photobooth storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photobooth');

CREATE POLICY "Public update photobooth storage"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photobooth');

CREATE POLICY "Public delete photobooth storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'photobooth');
