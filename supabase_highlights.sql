-- ============================================================
-- AmbulanteTec — Migração: Tabela highlights (Destaque do Dia)
-- Execute este script no Editor SQL do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Promoção do Dia',
  tag text,
  description text,
  cta_text text DEFAULT 'Ativar Promoção',
  image_url text,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seller_id)
);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver próprio destaque" ON highlights;
CREATE POLICY "Ver próprio destaque" ON highlights
  FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Salvar destaque" ON highlights;
CREATE POLICY "Salvar destaque" ON highlights
  FOR ALL USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);
