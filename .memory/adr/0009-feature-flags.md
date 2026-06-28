# ADR-0009 — Feature Flags para liberação controlada de recursos

**Status:** Aceito
**Data:** 2026-06-13
**Origem:** Reunião 11/06/2026 (regras de negócio)

## Contexto

Várias funcionalidades planejadas (mensageria por e-mail, SMS, notificações automáticas,
campanhas, reativação) têm **custo operacional relevante em escala** e dependem de validação
comercial. Ao mesmo tempo, queremos desenvolvê-las antecipadamente sem expô-las a todos os
estúdios antes de serem viáveis. Também há recursos que devem ser ligados/desligados por
organização (ex.: cashback, integração de agenda).

## Decisão

Adotar **Feature Flags** como mecanismo de liberação controlada:

- Recursos podem ser implementados antes de serem disponibilizados.
- Flags **globais** são controladas pelo **super_admin** (Assessoria Ink) — ex.: e-mail, SMS,
  notificações automáticas permanecem **desabilitados** até haver validação comercial.
- Flags podem ter granularidade **por organização** quando o recurso for opcional por estúdio
  (ex.: cashback, integração com Google Calendar).

## Consequências

- Permite *ship* de código incompleto/caro sem ativá-lo, reduzindo risco e custo.
- Exige uma camada de avaliação de flags (global + por org) consultável no backend e frontend.
- O painel do super_admin precisa expor a gestão de flags globais.
- Decisões de "fora do escopo V1" passam a poder coexistir no código atrás de uma flag
  desligada, em vez de ficarem só no backlog.

## Relacionado

- Notificações/mensageria e seus custos (reunião 11/06).
- Billing/assinatura (ADR-0005, domain-rules) — flags podem depender do plano no futuro.
