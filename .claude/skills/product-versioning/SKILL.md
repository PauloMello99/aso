---
name: product-versioning
description: Regras invioláveis de versionamento SemVer do ink-ops e sua ligação com o changelog. Usar SEMPRE que a tarefa envolver a versão do produto (package.json), um bump, um release, uma tag, um item de changelog (changelog-entries.ts) ou o aviso de novidades aos donos — e antes de qualquer commit `chore(release)`. Garante uma única versão de produto para o monorepo (raiz + backend + frontend sempre iguais) e a coerência versão ↔ changelog. Não usar para tarefas sem relação com versão/release/changelog.
---

# Product Versioning — SemVer único do monorepo (ink-ops)

Fonte de decisão: `.memory/adr/0031-versionamento-semver-unificado-do-produto.md` (versão) e
`.memory/adr/0030-changelog-versionado-e-banner-de-novidades.md` (changelog). Este arquivo é o
procedimento; em caso de conflito, os ADRs prevalecem.

## Regra de ouro

**Existe UMA versão de produto.** `package.json` raiz, `apps/backend/package.json` e
`apps/frontend/package.json` têm SEMPRE a mesma versão. Não existe versão por app, e não pode existir
disparidade entre raiz e apps nem entre os dois apps. Ninguém "bumpa só o backend".
`packages/*` (`0.0.0`, `private`) ficam fora do versionamento — não tocar.

## Como a versão muda (único caminho permitido)

```bash
pnpm version:bump major|minor|patch   # bin/scripts/release/version.mjs — atualiza os 3 package.json juntos
pnpm version:check                    # falha se raiz/backend/frontend divergirem (roda no CI e num spec local)
```

- **PROIBIDO** editar o campo `version` à mão em qualquer `package.json`, versionar um app isoladamente,
  ou criar outro caminho de escrita de versão. Se o script não serve, corrija o script (e o ADR), não contorne.
- Se `version:check` falhar antes de você começar, PARE: há disparidade herdada — conserte primeiro (com o
  usuário), não empilhe um bump em cima.

## Qual bump (produto, referência 1.0.0 = baseline em produção)

| Tipo | Quando | Changelog | E-mail aos donos |
|---|---|---|---|
| `major` | Ruptura/redesenho da experiência de uso | **item obrigatório** | sim |
| `minor` | Novidade de funcionalidade visível ao usuário (milestone/bloco entregue) | **item obrigatório** | sim |
| `patch` | Correção/ajuste sem novidade visível | **NENHUM item** | não |

- Guia por Conventional Commits do intervalo desde a última tag: `feat` ⇒ minor; `fix`/`perf` ⇒ patch;
  `!` ou `BREAKING CHANGE` ⇒ major; `docs`/`chore`/`refactor`/`test` não bumpam. A decisão final é humana.
- Quebra de contrato interno backend↔frontend NÃO é major de produto (deployam juntos).

## Ligação versão ↔ changelog (via de mão dupla — testada, não convencionada)

O spec `apps/backend/src/modules/changelog/domain/product-version.spec.ts` e o registry
`changelog-entries.ts` amarram os dois lados:

- **Bump minor/major ⇒ item de changelog com `semver` igual à nova versão** (senão o spec falha).
- **Item de changelog novo ⇒ o `semver` dele não pode passar da versão do produto** (não se anuncia release que
  não existe) ⇒ publicar um item exige bumpar a versão no mesmo commit.
- **Patch nunca tem item** (todo item tem `patch === 0`).
- Um item por release (`semver` único acima do corte `NOTIFY_FROM_VERSION`); o `version` inteiro (ordinal) do
  item só cresce (é o high-water mark persistido em `users.changelog_seen_version` — NUNCA renumerar).
- `notifyOwners` NÃO existe: notificar é DERIVADO (`shouldNotifyOwners`: só MAJOR/MINOR entre releases
  consecutivos, e só ordinal acima de `NOTIFY_FROM_VERSION`). Não recrie uma flag manual.
- O e-mail aos donos (fatia C) só sai com `CHANGELOG_ANNOUNCEMENTS_ENABLED=true` e respeitando a allowlist
  fora de produção (ADR-0028) — ver ADR do aviso de novidades.

## Procedimento de release (só executar quando o usuário PEDIR o release/commit)

1. `pnpm version:check` deve estar verde.
2. Decida o tipo (tabela acima) e rode `pnpm version:bump <tipo>`.
3. Se minor/major: adicione o item em `changelog-entries.ts` (novo `version` = último + 1; `semver` = nova
   versão; título/resumo/highlights em pt-BR curtos; `module` ∈ `CHANGELOG_MODULE_HREFS`; `audience`).
4. `pnpm check-types` + `pnpm lint` + `pnpm test` + `pnpm build` verdes (o CI roda `version:check` e o step "Changelog/version guards" — specs `product-version`/`changelog-entries`/`changelog-semver`; o `pnpm test` completo roda só localmente).
5. Commit `chore(release): vX.Y.Z` (incluindo os 3 `package.json` + o changelog) e tag anotada `vX.Y.Z` — uma
   tag por release, não por app. **Nunca** fazer push/deploy da tag sem pedido explícito.
6. Pré-requisito de deploy do release: migrations aplicadas ANTES do backend (registrar no corpo do commit se houver).

## Checklist antes de dizer "pronto"

- [ ] `pnpm version:check` ⇒ 3 versões iguais.
- [ ] Nenhuma edição manual de `version` (ver `git diff -- '**/package.json'`: só o script mexe).
- [ ] Minor/major ⇒ item de changelog com `semver` = versão; patch ⇒ nenhum item.
- [ ] Spec de guard verde; nenhum `notifyOwners` no repo.
- [ ] Ordinal `version` do changelog só cresceu.
