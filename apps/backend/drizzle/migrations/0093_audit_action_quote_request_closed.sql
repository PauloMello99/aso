-- 0093 — Novo valor de enum para auditoria da resposta ao pedido de orçamento (C3b).
-- ALTER TYPE de um enum fica em migration separada (precedente: 0076/0031/0053): o
-- migrator aplica o lote pendente numa única transação, e esta é a última do lote;
-- nenhuma migration do lote usa o literal 'quote_request_closed'.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'quote_request_closed';
