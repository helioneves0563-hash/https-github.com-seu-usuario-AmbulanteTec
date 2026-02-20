-- ============================================================
-- AmbulanteTec — Função Segura para Baixa de Estoque (Portal do Cliente)
-- Execute este script no Editor SQL do Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_quantity integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock integer;
BEGIN
  -- Obter o estoque atual
  SELECT stock INTO v_current_stock FROM products WHERE id = p_product_id;

  -- Se o produto não existir ou estoque for null
  IF v_current_stock IS NULL THEN
    RETURN false;
  END IF;

  -- Se o estoque for suficiente, decrementar
  IF v_current_stock >= p_quantity THEN
    UPDATE products
    SET stock = stock - p_quantity
    WHERE id = p_product_id;
    RETURN true;
  ELSE
    -- Se o estoque ficar negativo, opcionalmente zerar. Vamos zerar para evitar erro.
    UPDATE products
    SET stock = 0
    WHERE id = p_product_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
