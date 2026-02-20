-- ============================================================
-- AmbulanteTec — Storage: Bucket para mídias de propagandas
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Criar bucket público para mídias de propagandas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ads-media',
  'ads-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/ogg']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Leitura pública (qualquer um pode ver as mídias)
DROP POLICY IF EXISTS "Public read ads-media" ON storage.objects;
CREATE POLICY "Public read ads-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'ads-media');

-- 3. Admin pode fazer upload
DROP POLICY IF EXISTS "Admin upload ads-media" ON storage.objects;
CREATE POLICY "Admin upload ads-media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ads-media'
    AND auth.uid() IN (SELECT user_id FROM public.app_admins)
  );

-- 4. Admin pode excluir
DROP POLICY IF EXISTS "Admin delete ads-media" ON storage.objects;
CREATE POLICY "Admin delete ads-media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ads-media'
    AND auth.uid() IN (SELECT user_id FROM public.app_admins)
  );
