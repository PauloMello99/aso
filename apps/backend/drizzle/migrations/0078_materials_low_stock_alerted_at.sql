-- 0077 — Marcador de transição do alerta de estoque baixo em materials.
--
-- low_stock_alerted_at registra QUANDO o alerta de estoque baixo foi disparado
-- para o "episódio" atual do material. NULL = sem alerta aberto.
-- O alerta é enviado 1x por episódio: dispara na transição (estoque cruza para
-- <= mínimo com marcador NULL) e o marcador é zerado quando o estoque volta a
-- ficar acima do mínimo. Ambas as mudanças são escritas pelo MESMO UPDATE que
-- altera o estoque, mantendo marcador e quantidade consistentes.
-- Sem backfill: materiais existentes começam sem alerta aberto.
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS low_stock_alerted_at timestamptz;
