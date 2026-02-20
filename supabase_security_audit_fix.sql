-- ============================================================
-- AmbulanteTec — Fix de Segurança Crítica: Fechando Brechas RLS
-- Execute este script no Editor SQL do Supabase IMEDIATAMENTE
-- ============================================================

-- 1. Fechando a brecha na tabela CUSTOMERS (Clientes)
DROP POLICY IF EXISTS "Portal clientes" ON customers;

CREATE POLICY "Gestores gerenciam clientes" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Clientes inserem clientes" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Clientes leem clientes" ON customers
  FOR SELECT USING (auth.role() = 'anon');


-- 2. Fechando a brecha na tabela ORDERS (Pedidos)
DROP POLICY IF EXISTS "Portal pedidos" ON orders;

CREATE POLICY "Gestores gerenciam pedidos" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Clientes inserem pedidos" ON orders
  FOR INSERT WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Clientes leem pedidos" ON orders
  FOR SELECT USING (auth.role() = 'anon');


-- 3. Fechando a brecha na tabela ORDER_ITEMS (Itens dos Pedidos)
DROP POLICY IF EXISTS "Portal order_items" ON order_items;

CREATE POLICY "Gestores gerenciam itens" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Clientes inserem itens" ON order_items
  FOR INSERT WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Clientes leem itens" ON order_items
  FOR SELECT USING (auth.role() = 'anon');
