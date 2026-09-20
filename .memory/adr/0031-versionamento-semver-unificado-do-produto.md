# ADR-0031 — Versionamento SemVer unificado do produto (monorepo) e ligação com o changelog

**Status:** Aceito (2026-09-19, aprovado pelo usuário com as alterações abaixo)
**Data:** 2026-09-19

## Contexto

O changelog versionado (ADR-0030) e o e-mail aos donos (fatia C do Bloco 5.2) precisam de uma noção de
"versão do release": só bump **MAJOR/MINOR** vale item de changelog e notificação (decisão do usuário). A
convenção anterior ("+1 minor nos dois apps por milestone", `docs/planning/2026-07-29-meeting-backlog.md:67`) estava
parada em **0.18.0**, com o `package.json` raiz sem `version`, `packages/*` em `0.0.0`, todos `private: true`, sem
tags git nem ferramenta de release. Os commits já seguem Conventional Commits. Como o sistema **já está em
produção**, a versão inicial é **1.0.0** (não 0.x).

## Padrões pesquisados (monorepos)

- **Fixed/unified vs independent** (Lerna, Nx release, Changesets `fixed`): unified = uma versão para tudo, indicado
  para pacotes/apps fortemente acoplados; independent = ciclos distintos, típico de bibliotecas publicadas.
- **Monoversion** (Aspect Build): uma versão única evita "viagem no tempo" entre apps e libs internas; alerta contra
  tags por projeto (complexidade, lentidão do git).
- **release-please**: pacote raiz (`"."`) com versões ligadas, bump derivado de Conventional Commits.
- Independent só se justifica com artefatos publicados a consumidores externos — não é o caso.

## Decisões

1. **Uma versão de PRODUTO para todo o monorepo (unified), inicial `1.0.0`.** Fonte: `version` no `package.json`
   raiz; `apps/backend` e `apps/frontend` SEMPRE iguais à raiz. `packages/*` (privados, `0.0.0`) fora do
   versionamento. Backend e frontend deployam juntos — versão por app não tem significado para o usuário.
2. **Não pode existir forma de criar disparidade** (raiz↔apps, app↔app). Mecanismos em camadas:
   (a) único caminho de escrita: `pnpm version:bump major|minor|patch` (`bin/scripts/release/version.mjs`) grava os
   3 arquivos (temporário + rename, com rollback best-effort do conteúdo original se um rename falhar); não existe `set` nem versão por app; recusa rodar se já houver disparidade;
   (b) `pnpm version:check` (mesmo script) roda no CI antes do type-check;
   (c) spec de guard (`product-version.spec.ts`) exige as 3 versões iguais — roda no CI via o step
   "Changelog/version guards" (`product-version`, `changelog-entries`, `changelog-semver`); o `pnpm test`
   completo roda só localmente (não está no CI, ver TODO DX-3);
   (d) a skill `product-versioning` (`.claude/skills/product-versioning/`) instrui agentes a usar só esse caminho e
   proíbe editar `version` à mão.
3. **Semântica (produto):** `MAJOR` = ruptura/redesenho da experiência de uso; `MINOR` = novidade de funcionalidade
   visível ao usuário (milestone/bloco entregue); `PATCH` = correção sem novidade visível. Quebra de contrato interno
   backend↔frontend NÃO é major (deployam juntos). Guia por Conventional Commits: `feat`⇒minor, `fix`/`perf`⇒patch,
   `!`/`BREAKING CHANGE`⇒major; a decisão final é humana no commit de release.
4. **Release:** commit `chore(release): vX.Y.Z` (3 `package.json` + changelog) + tag anotada `vX.Y.Z` (uma por release,
   não por app). Sem ferramenta externa por ora (regra de dependências); reavaliar `release-please` (pacote raiz) se o
   bump manual virar gargalo. Push/deploy só sob pedido explícito.
5. **Ligação versão ↔ changelog, nos dois sentidos, verificada por spec (não por convenção):**
   - versão do produto minor/major (`patch === 0`) ⇒ existe item de changelog com `semver` igual à versão;
   - o `semver` do item mais novo não pode exceder a versão do produto (não se anuncia release inexistente) ⇒ publicar
     item exige bumpar a versão no mesmo commit;
   - **patch nunca gera item** (todo item tem `patch === 0`); um item por release acima do corte (`semver` único e
     estritamente crescente com o ordinal);
   - `ChangelogEntry` ganha `semver`; o ordinal `version` (inteiro, high-water mark persistido em
     `users.changelog_seen_version`) NÃO é derivado do semver e NUNCA é renumerado (renumerar reexibiria o catálogo a
     todos);
   - `notifyOwners` deixa de existir: a notificação é DERIVADA — `shouldNotifyOwners(semver, previousSemver)` = bump
     MAJOR/MINOR entre releases consecutivos — e cortada por `NOTIFY_FROM_VERSION = 4` (ordinal): o catálogo baseline
     (itens `version <= 4`, todos com `semver: "1.0.0"`, pré-existentes ao versionamento) nunca gera e-mail.
     Defesa em profundidade: corte por ordinal + regra semver + janela de recência de 30 dias + elegibilidade por dia
     de cadastro (`users.created_at` até o fim do dia de `publishedAt`, UTC) + dedupe UNIQUE (ver ADR-0033).

## Consequências

- Backend e frontend não conseguem divergir de versão sem CI/teste vermelho; esquecer o bump ao publicar um item vira
  teste vermelho, não e-mail errado.
- Baseline: os 4 itens de seed do changelog (Blocos 2-5) ficam em `semver: "1.0.0"` e não notificam. O primeiro release
  notificável será o próximo minor (1.1.0) com item acima do corte.
- O versionamento passa a ter dono de processo (a skill) e de verificação (script + spec + CI).
