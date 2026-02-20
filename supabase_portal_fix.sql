-- ============================================================
-- AmbulanteTec — SQL Definitivo para o Portal do Cliente
-- Execute TODO este bloco no Supabase SQL Editor de uma vez
-- ============================================================

-- 1. Remover políticas conflitantes de customers
DROP POLICY IF EXISTS "Ver próprios clientes" ON customers;
DROP POLICY IF EXISTS "Gerenciar clientes" ON customers;
DROP POLICY IF EXISTS "Leitura pública clientes" ON customers;
DROP POLICY IF EXISTS "Inserção pública clientes" ON customers;
DROP POLICY IF EXISTS "Acesso público clientes" ON customers;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portal clientes" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Remover políticas conflitantes de orders
DROP POLICY IF EXISTS "Ver próprios pedidos" ON orders;
DROP POLICY IF EXISTS "Gerenciar pedidos" ON orders;
DROP POLICY IF EXISTS "Leitura pública pedidos" ON orders;
DROP POLICY IF EXISTS "Inserção pública pedidos" ON orders;
DROP POLICY IF EXISTS "Acesso público pedidos" ON orders;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portal pedidos" ON orders
  FOR ALL USING (true) WITH CHECK (true);

-- 3. order_items
DROP POLICY IF EXISTS "Ver itens do pedido" ON order_items;
DROP POLICY IF EXISTS "Inserção pública order_items" ON order_items;
DROP POLICY IF EXISTS "Acesso público order_items" ON order_items;

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portal order_items" ON order_items
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Produtos (leitura pública para o cardápio)
DROP POLICY IF EXISTS "Leitura pública produtos" ON products;
DROP POLICY IF EXISTS "Ver produtos do estabelecimento" ON products;
CREATE POLICY "Leitura pública produtos" ON products
  FOR SELECT USING (true);

-- 5. Leitura pública de establishments (já deve existir mas garante)
DROP POLICY IF EXISTS "Leitura pública de estabelecimentos" ON establishments;
CREATE POLICY "Leitura pública de estabelecimentos" ON establishments
  FOR SELECT USING (true);

-- 6. Coluna status em customers (se não existir, adiciona)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status text DEFAULT 'Ativo';

-- 7. Coluna status em orders (se não existir, adiciona)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'Aberto';
