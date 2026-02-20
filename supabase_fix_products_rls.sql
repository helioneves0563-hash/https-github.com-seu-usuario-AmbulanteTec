-- ============================================================
-- AmbulanteTec — Fix: Permissão de Edição de Produtos
-- Execute este script no Editor SQL do Supabase
-- ============================================================

-- Remover políticas antigas de gerenciamento se existirem para evitar conflitos
DROP POLICY IF EXISTS "Gerenciar produtos" ON products;
DROP POLICY IF EXISTS "Inserir produtos" ON products;
DROP POLICY IF EXISTS "Atualizar produtos" ON products;
DROP POLICY IF EXISTS "Excluir produtos" ON products;

-- Adicionar permissão total (INSERT, UPDATE, DELETE) para o dono ou membros do estabelecimento
CREATE POLICY "Gerenciar produtos" ON products
  FOR ALL USING (
    auth.uid() = seller_id
    OR auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR establishment_id IN (SELECT public.get_user_establishment_ids())
  )
  WITH CHECK (
    auth.uid() = seller_id
    OR auth.uid() IN (SELECT user_id FROM public.app_admins)
    OR establishment_id IN (SELECT public.get_user_establishment_ids())
  );
