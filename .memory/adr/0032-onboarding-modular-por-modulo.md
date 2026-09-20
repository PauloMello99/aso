# ADR-0032 — Onboarding modular: o tour volta só para módulos ainda não vistos (Bloco 5.2, fatia A)

**Status:** Aceito
**Data:** 2026-09-19

## Contexto

O tour (M9, driver.js) rodava **uma única vez** (`users.onboarding_completed_at`). Novos módulos nunca eram
apresentados a quem já havia concluído. Direção do produto: onboarding modular, "da forma esperada".

## Decisões

1. **Progresso por usuário em `users.onboarding_seen jsonb NOT NULL DEFAULT '{}'`** (migration 0081): mapa
   `{ "<href de nav>": <version> }`. Coluna (não tabela) pelos mesmos motivos do ADR-0030 (estado 1:1; sem
   helper `current_user_id()`; `users_update` escopa a própria linha; a coluna só guarda marcador NÃO sensível,
   embora `users_select_same_org` (0015) exponha a linha a pares de org). **CHECK `users_onboarding_seen_bounded`
   (`octet_length(::text) <= 4096`)** dá teto agregado no próprio dado (o teto de 30 chaves do DTO é por
   requisição; o merge acumula); violação vira erro cru do PG (aceito, defesa em profundidade).
2. **Escrita sempre por MERGE no servidor** (`coalesce(onboarding_seen,'{}') || $json`), nunca substituição
   (duas abas não se sobrescrevem). O `||` faz o lado direito vencer por chave: um bundle antigo pode rebaixar uma
   versão (o tour reaparece uma vez) — aceito. Via `PATCH /auth/me` `{ onboardingSeen }`, validado por FORMA e
   TAMANHO no DTO (`@ValidatorConstraint`: ≤30 chaves, `/^[a-z0-9/-]{1,32}$/`, valor int 1..1000; `null`
   rejeitado com 400 via `@ValidateIf`). Só `onboardingSeen` no input ⇒ só o merge (sem update de perfil nem audit);
   `PATCH /auth/me {}` retorna o usuário atual sem update/audit (mudança intencional).
3. **Sem backfill: `onboarding_completed_at` vira baseline legado.** Módulo é VISTO se
   `onboardingSeen[id] >= version` OU (`onboardingCompletedAt != null` E `introducedAt <= onboardingCompletedAt`).
   Quem já concluiu o tour antigo não vê nada novo; módulo cujo `introducedAt` é posterior à conclusão aparece
   como novidade. Chave = **href de nav** (não `ModuleKey`: anamnesis/services compartilham `module`).
4. **Registro explícito** `ONBOARDING_MODULE_META` (`{ version, introducedAt ISO com hora }` por href) em
   `features/dashboard/lib/onboarding-modules.ts`. Item de nav sem entrada **falha no load** (e o spec fica vermelho)
   — nunca herda `introducedAt` de outro módulo (defeito apontado no review: derivação em bloco faria todo módulo
   novo parecer "já visto"). Novo módulo ⇒ nova entrada com `introducedAt` = data/hora do deploy; re-tour de
   módulo alterado ⇒ bump de `version`. Spec de contrato: todo href tem entrada, `introducedAt` parseável, id casa
   com a regex do backend, ≤30 ids.
5. **Semântica de fechamento (anti nag-loop):** fechar por QUALQUER via (Concluir, X, ESC, clique fora) grava TODOS
   os módulos OFERECIDOS naquela execução (não só os percorridos). `onboardingCompletedAt` só é enviado no primeiro
   tour. Replay manual `?tour=1` mostra TUDO e não grava. Troca de organização descarta o tour em andamento sem
   gravar e libera o auto-start da org nova (progresso é por usuário; os módulos visíveis variam por org/role).
   Falha do PATCH é silenciosa (o tour reaparece no próximo load).

## Consequências / dívidas

- **Pré-requisito de deploy:** `db:migrate` ANTES do backend novo (o select do usuário inclui a coluna; código novo
  contra schema antigo devolve 42703).
- Não há spec do hook `use-onboarding-tour` (depende de driver.js/router): coberto por specs das funções puras e
  pelo preview (legado / novo / novidades / `?tour=1` / drawer mobile). A troca de org com tour aberto não foi
  exercitada no preview (a org de teste só tem uma).
- Um funcionário que vê poucos módulos tem só esses marcados como vistos; ao virar owner/ganhar acesso em outra org
  os demais aparecem como pendentes (comportamento desejado).
