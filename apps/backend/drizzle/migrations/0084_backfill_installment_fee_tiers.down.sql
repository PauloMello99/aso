-- Reverte 0083: NO-OP deliberado.
--
-- A 0083 é backfill de DADOS (copia a faixa 1x de crédito para 2..12). Não há
-- como distinguir, depois, linhas criadas pelo backfill de faixas que o owner
-- passou a editar/criar; apagar seria perda de config. A 0074.down.sql já
-- remove todas as faixas com installments > 1 ao reverter a 0074.
SELECT 1;
