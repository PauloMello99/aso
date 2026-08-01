# ADR-0019: Paleta steel/azul-aço, domínio assessorink-so.com, rename de repositório

**Data**: 2026-08-01
**Status**: Aceito
**Supersede**: a seção de cor do [ADR-0017](0017-rebrand-aso-identidade-visual-teal.md) (a
identidade — nome ASO, wordmark Inter 700 minúsculo, tokens semânticos, estrutura geral —
continua válida; só a cor de marca muda).

## Contexto

O ADR-0017 fechou o rebrand de ink-ops para ASO com cor primária **teal**. Esta rodada:

1. Troca a cor de marca de teal para **steel/azul-aço dessaturado** — sério pelo peso, não
   pela saturação, mais adequado a telas densas de dados.
2. Fecha o domínio real do produto: **assessorink-so.com** (produção) /
   **staging.assessorink-so.com** (staging) — marketing e app no mesmo host, sem
   subdomínio `app.` (a estrutura de rotas já separa `/` do `/dashboard`).
3. Completa a limpeza de nome que o ADR-0017 deixou pendente (domínios `inkops.app`/
   `inkops.com.br` em links/hrefs) e adiciona uma camada de SEO/assets de marca que não
   existia (favicon, manifest, OG image, robots.txt, sitemap.xml, meta tags por página).
4. Renomeia o repositório e o tooling local (RAG/MCP) de `ink-ops`/`ink-studio-manager`
   para `assessorink-so`.

## Decisão

### Paleta — steel (matiz ~245–250, croma ~0.09–0.105)

| Degrau | oklch |
|---|---|
| 100 | `oklch(0.90 0.04 245)` |
| 400 | `oklch(0.75 0.09 245)` |
| 500 | `oklch(0.68 0.105 245)` |
| 600 | `oklch(0.58 0.10 248)` |
| 700 | `oklch(0.48 0.09 250)` |
| 800 | `oklch(0.42 0.075 250)` |
| 900 | `oklch(0.37 0.06 250)` |

Aplicada em `--primary`/`-hover`/`-text`/`-subtle`/`-border`, `--ring`, `--chart-1`,
`--sidebar-primary`, `--sidebar-ring` (light: 700/800; dark: 500/400). Correções feitas
junto: `--primary-foreground` e `--sidebar-primary-foreground` no dark eram teal-950
(sobra literal, texto puxava pro verde sobre botão azul) → steel-950
`oklch(0.27 0.045 250)`; `--sidebar-ring` no dark era zinc neutro (nunca tinha sido
rebrandado) → segue a primária nova.

Rampa de gráficos retunada: o teal aposentado assume o slot `--chart-5` (antes ocupado por
sky) — final steel/emerald/amber/violet/teal — porque `--chart-1` (steel, matiz 250) e
`--info`/`--chart-5` antigo (sky, matiz ~242) ficariam próximos demais.

`--info` **não foi movido** nesta rodada — fica a 7° de matiz da marca, separado só pelo
croma (0.134 vs 0.09). Ao criar UI nova, comparar pill `info` + botão primário lado a lado
nos dois temas antes de reaproveitar cores próximas.

### Domínio e e-mails

`assessorink-so.com` — escolhido pelo dono do produto, preserva "ink" de propósito.
E-mails: `no-reply@` (envio transacional via Resend), `suporte@` (rodapé dos e-mails),
`contato@` (mailto da landing e `LEGAL_ENTITY.emailContato`). Requer domínio **verificado
no Resend** antes de qualquer envio funcionar — passo de infra, fora deste ADR.

### SEO e assets de marca (gap que não existia antes)

- `shared/config/site.ts` — fonte única de `SITE_URL`/nome/e-mails.
- `shared/components/seo.tsx` — title/description/canonical/OG/Twitter/robots por página.
- `apps/frontend/public/` criado (não existia): favicons, `apple-touch-icon`, ícones PWA,
  `og-image.png`, `manifest.webmanifest` — **precisou de `apps/frontend/Dockerfile`**
  (não copiava `public/` para o runner; sem esse ajuste os assets funcionariam em dev e
  dariam 404 em produção).
- `robots.txt`/`sitemap.xml` como rotas Next (`pages/robots.txt.tsx`/`sitemap.xml.tsx`),
  não arquivos estáticos — evita depender do ajuste do Dockerfile para o texto.
- Rotas autenticadas (`/dashboard/**`, `/admin/**`) e formulários com token
  (`/anamnesis/[token]`, `/invite/accept`) marcadas `noindex`.
- `404.tsx` deixou de redirecionar para rota autenticada (`/dashboard/organizations`) e
  passou a ser uma 404 real — o redirect anterior mandava crawler e visitante deslogado
  para dentro do guard.

### Ícone/favicon: Nasalization, wordmark do produto: Inter (decisão explícita)

O favicon/ícone de app usa a fonte Nasalization (caps "ASO") sobre a cor de marca — decisão
tomada apesar de o `docs/design/design-system.md` (herdado do ADR-0017) dizer "nunca
desenhar logo". O wordmark do **header/produto** continua texto puro "aso" minúsculo em
Inter 700 via `shared/components/brand-wordmark.tsx` — não mudou. São duas coisas
diferentes: o favicon é um asset de plataforma (obrigatório ter alguma coisa visual em
32×32px), o wordmark é o nome da marca dentro do produto.

> Nota de licenciamento: Nasalization é fonte comercial (Typodermic) — uso comercial
> rasterizado em PNG requer licença. Os PNGs gerados nesta rodada usam uma fonte de sistema
> como substituta temporária (Nasalization não está instalada no ambiente de build); trocar
> pelos PNGs com a fonte real assim que a licença estiver resolvida.

### Rename do repositório

`ink-studio-manager` (GitHub) e a pasta local `ink-ops` → **`assessorink-so`**. Inclui slug
GitHub, pasta local, venv WSL do RAG e coleção Qdrant. Executado por último e manualmente —
ver `.memory/domain-rules.md` ou a sessão que criou este ADR para o checklist; não pode
rodar com a sessão do Claude Code ativa dentro da pasta sendo renomeada.

## Consequências

- `inkops_session` (chave de `localStorage`) **não foi renomeada** — interna, invisível,
  renomear deslogaria todos os usuários sem ganho.
- `subscriptions/domain/plan-catalog.ts` (`ink-ops-standard*`) **não foi tocado** — precisa
  bater com os objetos vivos no Stripe; renomear no código sem sincronizar quebra checkout.
- `supabase/config.toml` (`project_id: ink-ops`) **não foi tocado** — dirige nomes de
  container/volume do Supabase local.
- Comentários em migrations históricas (ex.: `0033_billing_stripe.sql:90`, menção a "Ink
  House") **não foram reescritos** — registro do estado no momento da migration.
- Copy de posicionamento ("tatuadores", "estúdios", placeholders "Ex.: Tatuagem") **não foi
  alterada** — fora de escopo desta rodada, que é sobre nome/cor, não reposicionamento de
  produto.
