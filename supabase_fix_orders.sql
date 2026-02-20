-- ============================================================
-- AmbulanteTec — Correção de Pedidos Fechados
-- Execute no Supabase SQL Editor
-- ============================================================

-- A coluna payment_method estava faltando, o que fazia o Supabase falhar 
-- silenciosamente ao tentar fechar um pedido na tela de checkout.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text;
