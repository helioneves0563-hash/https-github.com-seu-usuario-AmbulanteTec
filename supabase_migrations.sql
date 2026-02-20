-- ============================================================
-- AmbulanteTec — Migração: Sistema de Estabelecimentos + Anúncios
-- Execute este script no Editor SQL do Supabase
-- SEGURO para re-execução: usa IF NOT EXISTS e DROP IF EXISTS
-- ============================================================

-- 1. Tabela de Estabelecimentos
CREATE TABLE IF NOT EXISTS establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. Membros do Estabelecimento (Vendedores)
CREATE TABLE IF NOT EXISTS establishment_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES establishments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  role text DEFAULT 'seller', -- 'owner' ou 'seller'
  created_at timestamptz DEFAULT now(),
  UNIQUE(establishment_id, user_id)
);

-- 3. Tabela de Anúncios
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES establishments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  cta_text text DEFAULT 'Saiba mais',
  cta_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. Adicionar establishment_id nas tabelas existentes (sem erro se já existir)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES establishments(id);
ALTER TABLE products  ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES establishments(id);
ALTER TABLE orders    ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES establishments(id);

-- ============================================================
-- RLS (Row Level Security) — Políticas de Segurança
-- DROP IF EXISTS antes de criar para evitar erro de duplicata
-- ============================================================

ALTER TABLE establishments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads                 ENABLE ROW LEVEL SECURITY;

-- establishments
DROP POLICY IF EXISTS "Leitura pública de estabelecimentos" ON establishments;
CREATE POLICY "Leitura pública de estabelecimentos" ON establishments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Criação de estabelecimento" ON establishments;
CREATE POLICY "Criação de estabelecimento" ON establishments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Edição de estabelecimento" ON establishments;
CREATE POLICY "Edição de estabelecimento" ON establishments
  FOR UPDATE USING (auth.uid() = owner_id);

-- establishment_members
DROP POLICY IF EXISTS "Ver membros do estabelecimento" ON establishment_members;
CREATE POLICY "Ver membros do estabelecimento" ON establishment_members
  FOR SELECT USING (
    establishment_id IN (
      SELECT establishment_id FROM establishment_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Inserir membro" ON establishment_members;
CREATE POLICY "Inserir membro" ON establishment_members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Remover membro (apenas owner)" ON establishment_members;
CREATE POLICY "Remover membro (apenas owner)" ON establishment_members
  FOR DELETE USING (
    establishment_id IN (
      SELECT id FROM establishments WHERE owner_id = auth.uid()
    )
  );

-- ads
DROP POLICY IF EXISTS "Ver anúncios" ON ads;
CREATE POLICY "Ver anúncios" ON ads
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gerenciar anúncios" ON ads;
CREATE POLICY "Gerenciar anúncios" ON ads
  FOR ALL USING (
    establishment_id IN (
      SELECT establishment_id FROM establishment_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Função auxiliar: buscar establishment_id do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_establishment_id()
RETURNS uuid AS $$
  SELECT establishment_id
  FROM establishment_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
