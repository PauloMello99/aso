# ADR-0017: Rebrand ASO — identidade visual teal, Inter, tokens semânticos

**Data**: 2026-07-19
**Status**: Aceito

## Contexto

O produto foi renomeado de "ink-ops"/"Ink Ops" para **ASO**, com pedido explícito de uma
identidade mais séria e profissional (cor primária teal, reaproveitada da paleta do
projeto irmão `larmony`), mantendo consistência de design e breakpoints entre as três
audiências do app: super-admin, org-admin/owner e funcionário.

Estado anterior: tokens em `apps/frontend/src/styles/globals.css` (Tailwind v4)
tinham primária laranja idêntica em light/dark; ~425 usos de cores Tailwind
hardcoded (orange/red/emerald/amber/sky) espalhados em ~87 componentes bypassavam o
sistema de tokens; não havia fonte custom nem `<title>`; wordmark "ink/ops" duplicado
em 9+ arquivos.

## Decisão

Entrega em 3 PRs empilhados (`feat/aso-rebrand-foundation` → `feat/aso-token-migration`
→ `feat/aso-screen-standardization`), PRs [#36](https://github.com/PauloMello99/ink-studio-manager/pull/36),
[#37](https://github.com/PauloMello99/ink-studio-manager/pull/37),
[#38](https://github.com/PauloMello99/ink-studio-manager/pull/38):

1. **Tema**: light e dark mantidos (toggle existente). Light usa teal-700
   `oklch(0.511 0.096 186.391)` (contraste AA com texto branco); dark usa o teal-500 do
   larmony `oklch(0.704 0.14 182.503)`. Novos tokens semânticos `success`/`warning`/`info`
   (+ `-foreground`) adicionados ao lado de `destructive` já existente, mapeados em
   `@theme inline`. `--chart-1..5` passaram a ser definidos por tema (antes só em `:root`).
2. **Tipografia**: Inter via `next/font/google` (`--font-inter` → `--font-sans`);
   aplicada também via classe em `document.body` (efeito client-only) porque portais
   Radix montam como irmãos de `#__next` direto no `<body>` e não herdam custom
   properties definidas só na árvore da app.
3. **Wordmark**: componente único `shared/components/brand-wordmark.tsx` substitui
   todas as instâncias do antigo split-span "ink/ops".
4. **Domínios de e-mail**: parametrizados via env (`SUPPORT_EMAIL`, reaproveitando
   `NOTIFICATIONS_FROM_EMAIL` já existente para o From) em vez de trocar hardcoded —
   troca de domínio real fica para configuração futura, não código.
5. **Migração de cores**: todo uso de `orange-*` virou `primary`; `emerald/green`→
   `success`, `red`→`destructive`, `amber/yellow`→`warning`, `sky/blue`→`info`. Hex
   fixo em charts (`overview/charts.tsx`, `admin/admin-overview.tsx`) trocado por
   `var(--token)` / `color-mix(in oklch, var(--foreground) N%, transparent)` (este
   último necessário porque os eixos/grid de gráfico eram brancos fixos e ficavam
   invisíveis no tema light).
6. **Padronização de telas**: container do admin alinhado ao padrão do resto do app
   (`max-w-7xl` + `p-4 sm:p-6`, era `max-w-6xl`); título de página unificado
   (`text-xl font-semibold` + subtítulo `text-foreground/40`); ritmo de espaçamento
   (`space-y-6`), gaps de filtro/grid e largura de dialogs pequenos (`sm:max-w-sm`)
   unificados entre org e admin.

## Invariantes preservadas (não alteradas no rebrand)

- `localStorage` key `inkops_session` (`features/auth/lib/session.ts`)
- Stripe `productKey`/`lookupKey` `ink-ops-standard*` (`plan-catalog.ts`) — são
  identificadores determinísticos usados no boot-sync idempotente; trocar quebraria
  assinaturas existentes
- Nomes de packages (`@repo/*`, root `ink-ops`), identificador RAG `ink_ops_memory`
- Organização de dado "Ink House" em fixtures/migração 0033 é nome de tenant cliente,
  não é a marca do produto

## Consequências

- Landing (antes com `bg-[#0d0d0f]` hardcoded) passou a usar classe `.dark` no root +
  tokens, preservando a estética sempre-escura sem duplicar paleta.
- Dois pontos ficaram fora do escopo, sinalizados pelo reviewer como `minor`: cores de
  provider (Google/Outlook) no calendário externo colapsaram para o mesmo token `info`
  (perda de diferenciação visual); domínios `inkops.app`/`inkops.com.br` em links/hrefs
  permanecem até decisão de infraestrutura.
- `public/` (favicon, manifest, OG) segue inexistente — não fazia parte do escopo, é
  candidato a uma PR de assets de marca futura.

## Adendo (2026-07-19): design system formalizado

Um bundle de handoff de design (`aso-design-system`) formalizou esta identidade visual em
tokens nomeados, contratos de componente e guidelines de conteúdo/iconografia — tornando-se
a **definição canônica** do design system ASO. Implementado via:

- `docs/design/design-system.md` — referência humana completa (tabelas de tokens
  light/dark, tipografia, espaçamento, elevação, contratos de componente, conteúdo pt-BR,
  iconografia, regras de agenda). Conferido contra `apps/frontend/src/styles/globals.css`
  (tokens nomeados `--primary-text`, `--primary-subtle/-border`, `--surface-1/2/-hover/
  -active`, `--border-subtle/-faint`, `--text-secondary/-muted/-faint`, `--sidebar-*` — todos
  já existentes, valores oklch idênticos ao bundle) e contra
  `apps/frontend/src/shared/components/ui/` (Badge, Card, Table etc. já existem como
  componentes compartilhados).
- `.claude/skills/aso-design/SKILL.md` — checklist operacional condensado para agentes que
  geram UI.
- `SectionCard`/`KpiCard` **não** são componentes compartilhados hoje — são padrões locais
  dentro de `features/overview/components/overview-page.tsx`; o bundle os empacotou como
  primitivas reutilizáveis, mas a extração para `shared/components/ui/` ainda não foi feita
  no código (candidato a follow-up, não decidido aqui).
- Wordmark minúsculo ("aso", Inter 700, "so" em teal) confirmado como padrão definitivo —
  nenhum logo/mascote a desenhar.

Nenhuma decisão nova de arquitetura ou paleta foi tomada neste adendo; é a formalização
documental do que já estava em vigor desde a decisão original acima.
