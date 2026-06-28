# 13 — Feature Flags · 🆕 Novo (ADR-0009)

## Visão
Liberar recursos de forma controlada: desenvolver antes, **habilitar só quando viável**
(custo/validação), com controle global e/ou por organização.

## Estado atual (ink-ops)
Inexistente.

## Legado a portar
**Nenhum.**

## Decisões das reuniões (11/06) · ADR-0009
- Recursos caros (mensageria e-mail/SMS, notificações automáticas, campanhas) podem ficar
  **desabilitados** até haver validação comercial.
- **Flags globais** controladas pelo **Super Admin** (Assessoria Ink).
- **Flags por org** quando o recurso é opcional por estúdio (ex.: **cashback**, **integração
  Google Calendar**).

## Comportamento alvo (V1)
1. **Modelo:** `feature_flags` global (`key, enabled, description`) + override por org
   `org_feature_flags(org_id, key, enabled)`. Resolução: org override → global default.
2. **Avaliação:** helper consultável no backend (guard/serviço) e exposto ao frontend (ex.: no
   payload da org/me) para esconder/mostrar UI.
3. **Gestão:** painel do super_admin para flags globais; owner pode alternar flags marcadas como
   "por org" (ex.: cashback).
4. **Uso inicial:** gate de notificações/mensageria (spec 14), cashback (spec 07), integração de
   agenda (spec 08).

## Regras de negócio
- Flag desligada = recurso indisponível (UI escondida + endpoint bloqueado).
- Apenas super_admin altera flags **globais**; owner altera apenas as **por org** permitidas.

## Pendências
- Catálogo inicial de flags (chaves) da V1.
- Onde materializar a avaliação (claims do token? endpoint `me`/`org`?).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §10 e §12](../reunioes/2026-revisao-funcionalidades-por-modulo.md#10-notificações--mensageria).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ✅ **Decisão:** tudo que gera custo (e-mail/SMS/WhatsApp/IA) fica atrás de flag, **desligado
  até validação comercial**; controle global do super_admin.
- ⏳ **Flag por org — cashback** (substitui o antigo "crédito"; opcional por estúdio, com regra de
  expiração, ex.: 1 ano) e **integração Google Calendar**.
- ⏳ Possíveis **planos/níveis** (funcionalidades com valor adicional) — a equipe preferiu, na V1,
  **oferecer o sistema completo** e cobrar a mais por outros produtos (audiovisual etc.).
