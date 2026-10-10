# Prompt de handoff — ciclo pos-reuniao 07/10/2026

> Cole o bloco abaixo numa **nova sessao** aberta em `C:\Repos\Pessoal\aso` (branch base
> `development`). Fonte de verdade das decisoes: `docs/planning/2026-10-07-meeting-backlog.md`.

---

```text
Voce vai executar o ciclo de desenvolvimento definido na reuniao de 07/10/2026 do ink-ops.

LEIA PRIMEIRO (nesta ordem, antes de qualquer codigo):
1. docs/planning/2026-10-07-meeting-backlog.md  — decisoes fechadas e blocos A, B, C (+ D em doc).
   Ele PREVALECE sobre qualquer resumo de reuniao. "Correcoes ao resumo do Fathom" lista o que
   NAO deve ser feito (integracao com Linktree, resposta por e-mail via Resend inbound, editor de
   campanhas, Documentos, trial 60->45 que ja esta em producao).
2. docs/spikes/2026-10-02-viabilidade-documentos-e-orcamentos.md — so a "Ideia 2" (orcamento),
   que e a base tecnica do bloco C. Onde ele conflitar com o backlog de 07/10, vale o backlog.
3. docs/ai/agentic-workflow.md, docs/ai/development-style-profile.md, .memory/domain-rules.md e
   os ADRs citados no backlog (0010, 0013, 0018, 0022, 0030, 0031, 0032).
Antes de varrer codigo, use memory_search (MCP ink-memory) para "onde/como funciona X".

COMO TRABALHAR
- Siga a skill development-workflow. Use o MENOR fluxo suficiente por bloco, mas respeite a
  elevacao por risco: A = intermediaria (locator -> implementer -> tester); B e C = complexas
  (locator -> planner -> implementers -> tester -> database-guardian se houver migration ->
  reviewer). Apresente o plano de cada bloco/fatia e AGUARDE minha aprovacao antes de implementar
  B e C.
- Ordem obrigatoria: A (Overview) -> B (Confirmacao de agendamento) -> C (Formularios, fatias
  C1..C4; C3 depende de B). Uma branch por bloco (C: uma por fatia) a partir de `development`.
- Apenas backend-implementer e frontend-implementer editam codigo.
- PROIBIDO sem eu pedir: commit, push, deploy, migration remota, reset/clean destrutivo.
  Migrations sao escritas A MAO (.sql + .down.sql + _journal.json); NUNCA db:generate. Confira o
  proximo numero livre (ultima que vi: 0084) e a nota de colisao de migrations em
  .memory/domain-rules.md.
- Validacao por bloco: pnpm check-types + pnpm lint + pnpm test + build direcionado. Toda mudanca
  observavel no navegador deve ser VERIFICADA no preview (dev server do .claude/launch.json),
  em desktop e mobile, com evidencia — nao me peca para checar manualmente.
- Cada bloco com feature visivel: bump minor via `pnpm version:bump minor` + item de changelog com o
  mesmo semver (skill product-versioning). NUNCA editar `version` a mao.
- Nao amplie escopo: problemas proximos fora do backlog so sao mencionados, nao corrigidos.
- Dinheiro em centavos; caixa append-only; organization_id vem da sessao, nunca do cliente;
  DRIZZLE_ADMIN so onde a regra do projeto permite.

DECISOES-CHAVE JA FECHADAS (nao reabrir; detalhes no backlog)
- A: seletor de MES global (todas as secoes); "Materiais mais gastos" no lugar de Entrada/Saida;
  remover Repasse por profissional; pagamento com numero + %; personalizacao simples por aba
  persistida em localStorage (try/catch), sem servidor.
- B: evento "servico futuro" com e-mail do cliente (cliente pode nao existir); e-mail de
  confirmacao ao criar + lembrete 24h antes se pendente (cron interno existente); confirmacao por
  LINK/BOTAO com token (Confirmo / Nao poderei ir) — SEM Resend inbound; status e notificacao
  in-app ao profissional.
- C: tudo atras de flag GLOBAL de ambiente no padrao do PublicSupportFeatureFlagGuard; entidade
  propria (nao `customers`); campos fixos nome/telefone/e-mail/ideia; imagens OPCIONAIS 0-3;
  formulario por profissional (sem formulario = nao aparece na pagina do estudio); deep link wa.me;
  "agendou" -> cria evento servico-futuro e apaga TUDO; "nao agendou" -> imagens apagadas na hora e
  so contato por 30d (com consentimento); nunca tratado expira em 30d; limpeza deve apagar o ARQUIVO
  no storage (ADR-0018); notificacao + badge na sidebar; texto editavel + perguntas extras
  (text/yes_no); paginas publicas tipo Linktree da ORG e de cada PROFISSIONAL, ambas com links extras
  configuraveis (owner edita os da org; cada profissional os seus); Turnstile fail-closed + rate
  limit + trust proxy; testar no navegador interno do Instagram (se nao der, registre como
  pendencia manual explicita).

PONTOS DE ATENCAO A VERIFICAR NO CODIGO (nao assuma — confirme)
- calendar_events.customer_id e nullable? Como o lembrete de agenda do cron funciona hoje?
- O motor da anamnese reaproveita bem para perguntas extras text/yes_no?
- Como o PublicSupportFeatureFlagGuard le a env e como replicar para o orcamento.
- Existe cron/infra de retencao (ADR-0018 Tier 2) ou precisa ser criada para os 30 dias.

ENTREGA FINAL POR BLOCO: o que mudou / por que / verificacao realizada (com evidencia do preview)
/ riscos restantes. Ao fechar cada bloco, registre decisoes duraveis e gotchas em .memory/ (ou
novo ADR) e atualize recent-decisions.md. Pare ao fim de cada bloco e aguarde meu OK para o proximo.

BLOCO D (documento, sem codigo; pode rodar em paralelo): docs/spikes/ — estudo de custo e limites de
WhatsApp para campanhas + proposta de modelo de preco (insumos no backlog). Cite fonte e data de
qualquer preco externo; nao invente valores.

NAO FAZER: integrar Linktree; Resend inbound; editor de e-mail de Campanhas; aba Documentos; Contas
a pagar; WhatsApp em producao; entitlement por plano; alterar trial.
```
