# 12 — Auditoria · 🟡 Parcial (schema)

## Visão
Rastrear ações relevantes para segurança e suporte: **quem fez o quê, quando, em qual org, e o
que mudou**.

## Estado atual (ink-ops)
Tabela `audit_logs` existe (`database/schema/studio/audit.ts`) e enum `audit_action`
(`create | update | delete | invite_sent | invite_accepted | subscription_changed`). **Sem**
escrita de logs nos use-cases ainda.

## Legado a portar
**Nenhum** — o legado não tinha auditoria estruturada.

## Decisões das reuniões (04/06)
Registrar **todas as ações relevantes**: usuário que executou, ação, momento, org e alterações
efetuadas. Objetivo: rastreabilidade e segurança operacional (suporte da Assessoria Ink).

## Comportamento alvo (V1)
1. **Registro:** `audit_logs(org_id, actor_user_id, action, entity_type, entity_id, changes_json?,
   created_at)`.
2. **Onde gravar:** em pontos de mutação relevantes (criar/editar/excluir cliente, serviço,
   transação, membro, billing). Preferir um **interceptor/decorator** ou camada no use-case para
   não espalhar lógica.
3. **Leitura:** consultável pelo `owner` (sua org) e `super_admin` (todas).
4. Ações sensíveis (mudança de assinatura, convites) já previstas no enum.

## Regras de negócio
- Log é **append-only**; nunca editado/excluído.
- Sempre carrega `org_id` e `actor_user_id`.

## Pendências
- Escolher mecanismo (interceptor global vs chamada explícita por use-case).
- Definir quais entidades/ações entram na V1 (provável: cliente, serviço, transação, membros, billing).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §11](../reunioes/2026-revisao-funcionalidades-por-modulo.md#11-auditoria).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ⏳ Rastrear **quem fez / quando / o quê / qual org / quais alterações** (distinguir funcionário
  vs admin); base para suporte quando a comunicação passa a ser dev → admin → cliente final.
- ✅ Toda entidade carrega **criado em / atualizado em**; a **data de lançamento** do serviço
  (≠ data de execução) vira justamente campo de auditoria.
- 🔮 **Rastrear envios de e-mail/SMS** (válido/falhou — só se sabe após o envio); entra junto com
  a mensageria (spec 14).
