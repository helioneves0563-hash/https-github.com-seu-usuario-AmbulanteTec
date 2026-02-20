-- ============================================================
-- AmbulanteTec — Admin: tabela app_admins + RLS global
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de admins do sistema
CREATE TABLE IF NOT EXISTS app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode ver sua entrada" ON app_admins;
CREATE POLICY "Admin pode ver sua entrada" ON app_admins
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Propaganda global: establishment_id = NULL significa global
-- (a coluna já existe na tabela ads — nenhuma alteração necessária)

-- 3. Policies para admin acessar tudo em establishments
DROP POLICY IF EXISTS "Admin vê todos estabelecimentos" ON establishments;
CREATE POLICY "Admin vê todos estabelecimentos" ON establishments
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM app_admins)
    OR auth.uid() = owner_id
    OR id IN (SELECT establishment_id FROM establishment_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin cria estabelecimento" ON establishments;
CREATE POLICY "Admin cria estabelecimento" ON establishments
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM app_admins)
    OR auth.uid() = owner_id
  );

DROP POLICY IF EXISTS "Admin exclui estabelecimento" ON establishments;
CREATE POLICY "Admin exclui estabelecimento" ON establishments
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM app_admins)
    OR auth.uid() = owner_id
  );

-- 4. Policies para admin gerenciar ads globais
DROP POLICY IF EXISTS "Admin gerencia ads globais" ON ads;
CREATE POLICY "Admin gerencia ads globais" ON ads
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM app_admins)
    OR establishment_id IN (
      SELECT establishment_id FROM establishment_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- IMPORTANTE: Para tornar seu usuário admin, execute:
-- (Substitua pelo seu user_id do Supabase Auth > Users)
-- INSERT INTO app_admins (user_id) VALUES ('SEU-USER-ID-AQUI');
-- ============================================================
