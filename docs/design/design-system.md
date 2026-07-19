# Design System ASO

Referência visual do produto **ASO** (rebrand do ink-ops, ADR-0017). Fonte canônica desta
formalização: o handoff de design (`aso-design-system` bundle) — tokens, componentes e
guidelines conferidos contra `apps/frontend/src/styles/globals.css` e
`apps/frontend/src/shared/components/ui/`. Este documento é a referência humana; a skill
`.claude/skills/aso-design/SKILL.md` é o resumo operacional para agentes.

## 1. Identidade

- **Nome**: ASO. Tom sério e profissional, "sem ser corporativo-frio". Áudiências: dono do
  negócio (org-admin/owner), funcionário e super-admin de plataforma.
- **Wordmark**: texto puro — `"aso"` minúsculo, Inter 700, `tracking-tight`. O trecho `"so"`
  (ou a palavra inteira) é renderizado em teal (`--primary-text`). **Nunca** desenhar logo,
  ícone de marca ou mascote — não existe arquivo de logo nas fontes; o header sempre
  renderiza o wordmark como texto (padrão herdado do antigo `ink/ops` bicolor).
- Componente único: `shared/components/brand-wordmark.tsx` (ADR-0017) — qualquer nova tela
  reaproveita esse componente, nunca duplica o split de texto manualmente.

## 2. Cor

Tokens definidos em `oklch`, tema `light` (`:root`) e `dark` (`.dark`). App roda **dark por
padrão**; marketing é **dark-only**. Fonte: `apps/frontend/src/styles/globals.css` (ADR-0017).

### Base

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.141 0.005 285.823)` |
| `--foreground` | `oklch(0.18 0.004 285.8)` | `oklch(0.985 0 0)` |
| `--card` / `--popover` | `oklch(1 0 0)` | `oklch(0.21 0.006 285.885)` |
| `--secondary` / `--muted` / `--accent` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |

### Marca (brand — teal)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--primary` | `oklch(0.511 0.096 186.391)` (teal-700) | `oklch(0.704 0.14 182.503)` (teal-500) | Fundo de botão primário, AA com texto contrastante |
| `--primary-hover` | `oklch(0.437 0.078 188.216)` (teal-800) | `oklch(0.777 0.152 181.912)` (teal-400) | Hover do botão primário |
| `--primary-text` | `oklch(0.511 0.096 186.391)` | `oklch(0.777 0.152 181.912)` | Texto/ícone de marca sobre `--background` |
| `--primary-subtle` | teal 10% | teal 15% | Fundo de pill/nav ativa |
| `--primary-border` | teal 30% | teal 30% | Borda de destaque de marca |

**Regra de ouro**: teal = **marca e ação** — botão primário, item de nav ativo, evento de
agenda, dia selecionado no calendário. **Nunca** usar teal para status financeiro (isso é
papel das cores semânticas abaixo).

### Semânticas (status/financeiro)

| Token | Light | Dark | Significado |
|---|---|---|---|
| `--success` (+`-subtle`) | `oklch(0.596 0.145 163.225)` emerald-600 | `oklch(0.765 0.177 163.223)` emerald-400 | Entradas, "Pago", dinheiro |
| `--warning` (+`-subtle`) | `oklch(0.666 0.179 58.318)` amber-600 | `oklch(0.828 0.189 84.429)` amber-400 | Pendente, estoque baixo |
| `--info` (+`-subtle`) | `oklch(0.588 0.158 241.966)` sky-600 | `oklch(0.746 0.16 232.661)` sky-400 | Banco/digital, confirmado |
| `--destructive` (+`-subtle`) | `oklch(0.637 0.237 25.331)` red-500 | `oklch(0.704 0.191 22.216)` red-400 | Saídas, excluir, crítico |

`-subtle` = 12% (light) / 15% (dark) de opacidade, para fundo de pill. Nunca reaproveitar
`--primary` nesses contextos, mesmo que visualmente "combine".

### Hairlines e superfícies

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--border` | preto 10% | branco 10% | Borda padrão |
| `--border-subtle` | preto 6% | branco 6% | Borda de card de conteúdo |
| `--border-faint` | preto 4% | branco 4% | Divisores discretos |
| `--surface-1` | preto 2% | branco 2% | Tinta de card/linha |
| `--surface-2` | preto 4% | branco 4% | Tinta de campo de formulário |
| `--surface-hover` | preto 6% | branco 6% | Hover de linha/item |
| `--surface-active` | preto 8% | branco 8% | Estado pressed |

### Rampa de texto

| Token | Opacidade sobre `--foreground` | Uso |
|---|---|---|
| `--text-primary` | 100% | Texto principal |
| `--text-secondary` | 60% | Subtítulos, descrições |
| `--text-muted` | 40% | Meta-informação, ícones inativos |
| `--text-faint` | 30% | Headers de tabela, rótulos discretos |

### Charts (1–5)

Rampa multi-hue teal/emerald/amber/violet/sky — `--chart-1` (teal, = `--primary`),
`--chart-2` (emerald), `--chart-3` (amber), `--chart-4` (violet), `--chart-5` (sky).
Definida por tema (light e dark têm valores próprios), nunca hex fixo em componente.

### Sidebar

Tokens dedicados `--sidebar`, `--sidebar-foreground`, `--sidebar-primary` (=teal),
`--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` — permitem a sidebar ter uma
superfície ligeiramente distinta do conteúdo sem duplicar a paleta base.

## 3. Tipografia

Fonte única: **Inter** (400 regular, 500 medium, 600 semibold, 700 bold/wordmark), via
`next/font/google` (ADR-0017). Nenhuma outra família tipográfica é usada no produto.

| Tamanho | Peso | Uso |
|---|---|---|
| 10px (`--text-2xs`) | 500, uppercase, `tracking-widest` | Rótulos de seção, micro-labels |
| 12px (`--text-xs`) | 500 | Meta-informação, headers de tabela (uppercase, `tracking-wider`) |
| 14px (`--text-sm`) | 400 | Corpo/UI padrão (tamanho de trabalho do app, denso) |
| 16px (`--text-base`→`--text-lg` conforme contexto) | 600 | Título de dialog |
| 20px (`--text-xl`) | 600 | Título de página |
| 24px (`--text-2xl`) | 600 | KPIs, título de card |

Regras não negociáveis:
- Números **sempre** `tabular-nums` (classe `.tabular` ou `font-variant-numeric`) + peso
  **600**.
- Entradas financeiras: prefixo `+` em `--success`. Saídas: prefixo `−` em `--destructive`.
- Estornos: `line-through` + opacidade reduzida (linha "morta" mas ainda auditável).

## 4. Espaçamento e layout

- **Grade**: 4px (`--space-1` a `--space-16`: 4/8/12/16/20/24/32/40/64px).
- **Header**: 56px fixo (`--header-height`).
- **Sidebar**: 224px expandida (`--sidebar-width`), colapsa para 56px
  (`--sidebar-width-collapsed`), transição `200ms ease-in-out` (`--transition-base`).
- **Conteúdo**: `max-w-7xl` (1280px, `--content-max-width`) centralizado + padding 24px
  (`p-4 sm:p-6` em telas menores, mobile-first).
- **Controles**: altura padrão 40px (`--control-height`), `sm` 36px, `lg` 44px.
- **Raios** (base `--radius: 0.45rem`):
  - `--radius-md` (base − 2px): botões, inputs, itens de menu.
  - `--radius-lg` (= base): cards, menus/popovers.
  - `--radius-xl` (base + 4px = 0.75rem): KPI cards, dialogs.
  - `--radius-full`: badges/pills, switch.

## 5. Elevação

Elevação de **conteúdo** (cards, linhas de tabela, seções) é feita por **borda hairline +
tinta fraca** — `--surface-1` (fundo) + `--border-subtle` (borda) — **nunca sombra**. Campos
de formulário usam `--surface-2` + borda `--border` (fg 8–12%).

Sombras são reservadas para **overlays** (elementos que flutuam sobre o conteúdo):

| Token | Uso |
|---|---|
| `--shadow-lg` | Menus, popovers |
| `--shadow-xl` | Select, tooltip |
| `--shadow-2xl` | Dialogs, sheets |

Overlays ficam sobre um scrim `rgb(0 0 0 / 0.6)` + `backdrop-blur(4px)`. Sem glassmorphism
pesado, sem skeuomorfismo.

## 6. Componentes

Contratos visuais resumidos (implementação real em
`apps/frontend/src/shared/components/ui/`):

- **Button**: alturas 40/36/44/40×40 (default/sm/lg/icon). Variantes `default` (teal
  sólido), `outline`, `ghost`, `destructive`. Regra: **um único botão primário sólido por
  tela/view** — ações secundárias usam `outline` ou `ghost`.
- **Badge**: variantes sólidas (marketing/plano) e variantes **subtle** — `success`,
  `warning`, `info`, `destructive-subtle`, `brand`. Pills de status financeiro: Pago
  (`success`), Pendente (`warning`), Cancelado (`ghost` + `line-through`).
- **Card / SectionCard / KpiCard**:
  - `Card` (+`CardHeader/Title/Description/Content/Footer`) — componente compartilhado em
    `shared/components/ui/card.tsx`, superfície `--card` sólida, usado em settings/forms/auth.
  - `SectionCard` — card de módulo do dashboard: tinta `--surface-1`, ícone teal + título
    sm/semibold, link "Ver todos"; conteúdo é lista dividida, não tabela. **Hoje é um
    padrão local** (função `SectionCard` dentro de
    `features/overview/components/overview-page.tsx`), não um componente compartilhado —
    candidato a extração para `shared/components/ui/` se reaproveitado por outro módulo.
  - `KpiCard` — label xs muted + valor 24px/600 `tabular-nums`; `emphasis` = tingido de teal
    (ex.: card "Total"); `iconColor` segue semântica (Dinheiro=`--success`, Banco=`--info`).
    Mesmo status de `SectionCard`: padrão local em `overview-page.tsx`, ainda não extraído.
- **Table**: headers 12px uppercase `tracking-wider` em `--text-faint`, altura 40px; células
  `padding: 12px`; hover de linha = `--surface-1`/`--surface-hover`; valores monetários
  alinhados à direita + `tabular-nums`. Toolbar padrão: busca (`Input`) + `FilterPopover` +
  `ExportMenu`.
- **Inputs** (Input/Select/Switch/PhoneInput/Calendar/DatePicker): `fieldBase` = fundo
  `fg/4%` (`--surface-2`) + borda `fg/8%` (`--input`). **Foco é neutro** —
  ring `fg/20%`, **não teal**. Teal só aparece em estado *selecionado* (check do Select, dia
  selecionado do Calendar, Switch ligado).
- **Dialog / Sheet**: painel `--popover` + borda hairline + `--shadow-2xl`, sobre scrim.
  Footer padrão: `Cancelar` (`outline`) + ação primária (`default`).
- **DropdownMenu / Popover / Tooltip**: painel `--popover` + borda hairline + `--shadow-lg`
  (menu/popover) ou `--shadow-xl` (tooltip). Itens destrutivos: texto/ícone
  `--destructive` + hover `--destructive-subtle`.

## 7. Receita de tela de lista

Toda tela de listagem (Clientes, Serviços, Estoque, Caixa) segue a mesma receita:

1. Toolbar: `Input` de busca + `FilterPopover` (com contador de filtros ativos) +
   `ExportMenu` + botão primário de criação, alinhados numa linha (`flex gap-2`).
2. Banner de aviso (`--warning-subtle` + ícone `triangle-alert`) quando aplicável — ex.:
   estoque abaixo do mínimo.
3. `Table` dentro de um container `rounded-xl border` (borda `--border-subtle`).

## 8. Conteúdo (pt-BR)

- **Sentence case sempre** — "Nova transação", nunca Title Case. Uppercase só em
  micro-rótulos de seção/tabela (10–12px, `tracking-widest`/`tracking-wider`).
- **CTAs**: imperativos curtos — "Salvar", "Exportar", "Começar grátis", "Falar com
  vendas".
- **Estados vazios**: fato + ação — "Nenhum serviço ainda" + link teal "Registrar
  atendimento".
- **Confirmações**: frases mínimas — "Taxas salvas."; erros diretos — "E-mail ou senha
  inválidos".
- **Voz**: confiante e transparente ("Sem taxas escondidas. Cancele quando quiser."),
  calorosa mas **nunca lúdica**; fala com "você"/imperativo.
- **Emoji**: não usado na UI, com duas exceções herdadas — `✦` como glifo decorativo em
  badge de novidade, e bandeiras de país (`🇧🇷`) no seletor de DDI do `PhoneInput`.
- **Datas/moeda**: locale pt-BR ("14 jul.", "segunda-feira, 14 de julho"); moeda sempre
  "R$ 1.234,56" (valores em `_cents` no backend, formatados na borda).

## 9. Iconografia

- **Sistema**: [Lucide](https://lucide.dev) exclusivamente (`lucide-react`), `stroke-width`
  2, `currentColor`. Nenhum icon font, PNG, ou emoji-como-ícone (fora das exceções da seção
  8).
- **Tamanhos**: 16px padrão (chrome, botões), 14px em linhas densas, 12px em deltas
  (setas de variação), 24px em estados vazios.
- **Cor**: ícones de nav/seção usam `--primary-text` quando ativos, `--text-muted` quando
  inativos; ícones semânticos seguem a semântica do dado (ex.: `banknote`=`--success`,
  `landmark`=`--info`).
- **Mapeamento de módulos**:

  | Módulo | Ícone |
  |---|---|
  | Overview | `layout-grid` |
  | Serviços | `package` |
  | Clientes | `users` |
  | Agenda | `calendar-days` |
  | Estoque | `archive` |
  | Caixa | `wallet` |
  | Configurações | `settings` |
  | Assinatura | `credit-card` |
  | Anamnese | `clipboard-list` |

## 10. Agenda

- **Evento**: pill `--primary-subtle` com borda esquerda teal de 2px.
- **Indisponibilidade**: hachura diagonal em cinza (`repeating-linear-gradient`).
- **Cancelado**: `line-through` + opacidade 40%.
- **Hoje**: círculo teal sólido (`--primary`) no indicador de dia.

## 11. Modos

- **Light + dark obrigatórios**, contraste **AA** em ambos.
- App roda **dark por padrão** (`<html class="dark">`); usuário pode alternar (toggle no
  header).
- Marketing/landing é **dark-only** — não implementa toggle nem tema light.

## Referências

- `.memory/adr/0017-rebrand-aso-identidade-visual-teal.md` — decisão original do rebrand
  (paleta, fonte, wordmark, migração de cores).
- `.claude/skills/aso-design/SKILL.md` — resumo operacional para geração de UI por agentes.
- `apps/frontend/src/styles/globals.css` — implementação real dos tokens.
- `apps/frontend/src/shared/components/ui/` — implementação real dos componentes.
