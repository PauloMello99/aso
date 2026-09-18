-- 0073 down — limpa apenas o system_key marcado por esta migration (mesmo
-- padrao da 0035 down para 'reversal': is_protected NAO e revertido, fica
-- true permanentemente apos o rollback). NAO apaga a categoria "Funcionario":
-- transactions.category_id tem onDelete 'set null' e o caixa e append-only
-- (ADR-0010) — apagar a categoria zeraria silenciosamente o category_id de
-- pagamentos a membro ja criados, sem forma de corrigir depois.
UPDATE "transaction_categories" SET "system_key" = NULL WHERE "system_key" = 'member_payment';
