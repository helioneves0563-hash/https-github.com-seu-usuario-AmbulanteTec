-- ============================================================
-- AmbulanteTec — Fix Completo: Recursão Infinita RLS
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Função SECURITY DEFINER para eliminar recursão
CREATE OR REPLACE FUNCTION get_user_establishment_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT establishment_id
  FROM public.establishment_members
  WHERE user_id = auth.uid();
$$;

-- 2. Corrigir policy de establishment_members
DROP POLICY IF EXISTS "Ver membros do estabelecimento" ON establishment_members;
CREATE POLICY "Ver membros do estabelecimento" ON establishment_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR establishment_id IN (SELECT get_user_establishment_ids())
    OR auth.uid() IN (SELECT user_id FROM public.app_admins)
  );

DROP POLICY IF EXISTS "Inserir membro" ON establishment_members;
CREATE POLICY "Inserir membro" ON establishment_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.app_admins)
  );

-- 3. Corrigir policy de establishments
DROP POLICY IF EXISTS "Admin vê todos estabelecimentos" ON establishments;
DROP POLICY IF EXISTS "Leitura pública de estabelecimentos" ON establishments;
CREATE POLICY "Leitura pública de estabelecimentos" ON establishments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin exclui estabelecimento" ON establishments;
CREATE POLICY "Admin exclui estabelecimento" ON establishments
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR auth.uid() = owner_id
  );

DROP POLICY IF EXISTS "Admin cria estabelecimento" ON establishments;
CREATE POLICY "Admin cria estabelecimento" ON establishments
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR auth.uid() = owner_id
  );

-- 4. Corrigir policy de ads (usava establishment_members diretamente → recursão)
DROP POLICY IF EXISTS "Admin gerencia ads globais" ON ads;
DROP POLICY IF EXISTS "Gerenciar anúncios" ON ads;
CREATE POLICY "Gerenciar ads" ON ads
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR establishment_id IN (SELECT get_user_establishment_ids())
    OR establishment_id IS NULL
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR establishment_id IN (SELECT get_user_establishment_ids())
    OR establishment_id IS NULL
  );

-- Leitura pública de ads globais (para o portal do cliente)
DROP POLICY IF EXISTS "Leitura pública ads globais" ON ads;
CREATE POLICY "Leitura pública ads globais" ON ads
  FOR SELECT USING (
    establishment_id IS NULL
    OR auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR establishment_id IN (SELECT get_user_establishment_ids())
  );
