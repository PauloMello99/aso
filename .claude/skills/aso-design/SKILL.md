---
name: aso-design
description: Use this skill to generate well-branded interfaces for ASO (plataforma de gestão para estúdios/negócios de serviço — agendamento, clientes, estoque, caixa), either for production frontend code or throwaway prototypes/mocks. Contains the condensed visual rules; the full reference with token tables and component contracts lives in docs/design/design-system.md.
user-invocable: true
---

Read `docs/design/design-system.md` for the full reference (color tokens light/dark,
typography ramp, spacing/radius, component contracts, content rules, iconography). This
file is the condensed checklist — use it as a quick gate before/while producing UI, and
consult the full doc for exact token values, measurements, and component APIs.

## Regras-chave

- **Tipografia**: Inter única (400/500/600/700). Nenhuma outra família. Números sempre
  `tabular-nums` + peso 600.
- **Teal = marca e ação, nunca status financeiro.** `--primary`/`--primary-text` só em
  botão primário, nav ativa, evento de agenda, dia selecionado. Um único botão sólido
  primário por tela.
- **Semânticas reservadas para status/financeiro**: `--success` (entradas/pago/dinheiro),
  `--warning` (pendente/estoque baixo), `--info` (banco/digital/confirmado),
  `--destructive` (saídas/excluir/crítico). Nunca reaproveitar teal nesses contextos.
- **Light + dark obrigatórios, contraste AA.** App roda dark por padrão; marketing é
  dark-only.
- **Conteúdo pt-BR em sentence case**, nunca Title Case; CTAs imperativos curtos; estados
  vazios = fato + ação; sem emoji (exceção: `✦` em badge de novidade, bandeiras de DDI).
- **Ícones**: Lucide (`lucide-react`) exclusivamente, stroke 2. Nenhum icon font/PNG/emoji
  como ícone.
- **Elevação por borda + tinta fraca** (`--surface-1` + `--border-subtle`), nunca sombra em
  conteúdo. Sombras (`--shadow-lg/xl/2xl`) só em overlays (menu/popover/tooltip/dialog).
- **Inputs com foco neutro** (`fg/20%` ring), não teal — teal só no estado selecionado
  (check, dia de calendário, switch ligado).
- **Wordmark**: texto "aso" minúsculo, Inter 700, tracking-tight, "so" (ou a palavra) em
  teal via `--primary-text`. Nunca desenhar logo/mascote — usar
  `shared/components/brand-wordmark.tsx`.

Para tabelas de tokens (valores oklch exatos light/dark), contratos de Button/Badge/
Card/Table/Dialog/etc., receita de tela de lista e regras de agenda, ver
`docs/design/design-system.md`.
