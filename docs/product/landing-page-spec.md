# Landing page do ASO — spec de seções, dados e disposição

> **Status:** implementada (2026-08-17). Fases 1–5 de §8 concluídas — código real em
> `apps/frontend/src/features/landing/` já reflete esta spec. Documento mantido como
> referência de decisões e proveniência de cada afirmação, não como plano em aberto.
>
> **Regra que rege este documento:** *toda afirmação na landing precisa ser verificável no
> produto hoje.* A auditoria que originou esta spec encontrou métricas inventadas e cinco
> integrações inexistentes no ar (ver §9). Nada aqui pode ser aspiracional sem estar
> explicitamente rotulado como "em breve".

## 1. Decisões de posicionamento (fechadas com o time)

| Ponto | Decisão |
|---|---|
| Posicionamento | **Vertical de tatuagem, explícito.** Nada de "estúdios criativos". A copy fala de estúdio de tatuagem, tatuador, sessão, anamnese. |
| Prova social | **Dogfooding da Ink House** (estúdio real operando dentro da plataforma) + **contagem agregada de pilotos**, sem nomes nem logos. |
| Integrações | Seção **removida**. O espaço vira **Segurança & LGPD**. |
| CTA primário | **"Testar 60 dias grátis"** + microcopy `Cartão necessário · cancele quando quiser`. |
| Tema | Landing permanece **dark-only** (`className="dark"` em `landing-page.tsx`) — decisão deliberada do THEME-1, não re-litigar. |

Por que a verticalização importa: anamnese versionada com assinatura, consumo de material por
sessão e taxa de cartão virando líquido no caixa são coisas que **nenhum CRM horizontal faz**.
Vender "gestão para estúdios criativos" joga fora exatamente a única vantagem defensável.

## 2. Arquitetura de seções (ordem final)

Padrão base: **Feature-Rich Showcase + Pricing-Focused**, com FAQ — que hoje não existe e é
onde as objeções B2B morrem.

| # | Seção | Papel na jornada | Estado |
|---|---|---|---|
| 0 | Nav | Âncoras + CTA persistente | ajustar |
| 1 | Hero | Promessa vertical + CTA + produto real à vista | reescrever |
| 2 | Faixa de credibilidade | Tirar o visitante da dúvida "isso existe?" | **nova** |
| 3 | Problema → virada | Nomear a dor antes de vender a cura | **nova** |
| 4 | Grid de recursos | Cobertura funcional em varredura rápida | reescrever |
| 5 | Spotlights de módulo (3) | Profundidade + screenshot real | **nova** |
| 6 | Equipe & permissões | Objeção nº 1 do dono de estúdio | **nova** |
| 7 | Segurança & LGPD | Substitui Integrações | **nova** |
| 8 | Preços | Conversão | manter, evoluir |
| 9 | FAQ | Matar objeções residuais | **nova** |
| 10 | CTA final | Última captura | **nova** |
| 11 | Footer | Identificação legal (CDC) + legal | manter |

Ritmo visual (o que "traz vida" — ver §8): as seções alternam entre **contida** (`max-w-7xl`)
e **full-bleed com fundo `surface-1`**, para a página deixar de ser um scroll uniforme de
cards idênticos. Sequência de fundos: `bg` · `surface-1` · `bg` · `bg` · `surface-1` · `bg` ·
`surface-1` · `bg` · `bg` · `primary-subtle` · `bg`.

---

## 3. Seção a seção — conteúdo e dados

### 0. Nav

- Âncoras: **Recursos · Segurança · Preços · Perguntas** (troca `Integrações` e `Sobre`).
- CTA: `Entrar` (outline) + `Testar grátis` (primary).
- **Novo:** a nav ganha estado `scrolled` — abaixo de 80px de scroll, borda inferior e blur
  aparecem; no topo ela é transparente. Detalhe barato que faz a página parecer viva.

### 1. Hero

| Elemento | Conteúdo |
|---|---|
| Eyebrow | `Feito por um estúdio de tatuagem, para estúdios de tatuagem` |
| H1 | **Seu estúdio inteiro** / *em um só lugar.* (segunda linha em `text-primary`) |
| Sub | Agenda, clientes, anamnese assinada, materiais e caixa — sem planilha, sem caderno, sem "depois eu lanço". |
| CTA primário | `Testar 60 dias grátis` → `/auth/signup` |
| CTA secundário | `Ver como funciona` → âncora `#recursos` (**precisa de destino real** — hoje o botão "Ver demonstração" não tem `href` nem handler) |
| Microcopy | `60 dias grátis · cartão necessário · cancele quando quiser` |
| Visual | **Screenshot real do Overview**, não o wireframe falso atual |

**Ação obrigatória:** o mock de hero atual (`hero.tsx:41-107`) inventa "24 agendamentos / 142
clientes / R$8.4k receita" e um gráfico de barras aleatório. Substituir por captura real do
`/dashboard/.../overview` com dados de demonstração coerentes. Se a captura ficar para depois,
o mock **precisa** de rótulo "ilustrativo".

### 2. Faixa de credibilidade (nova)

Faixa fina logo abaixo do hero, sem título de seção — três itens em linha, separados:

1. **Operado pela Ink House** — "o estúdio que construiu o ASO usa o ASO todo dia"
2. **`{N}` estúdios em operação** — número agregado, sem nomes
3. **Dados no Brasil, conforme a LGPD**

> **Decidido (2026-08-16):** `N = 5`, placeholder assumido pelo time até termos o número
> real de estúdios em operação. Vive em **uma única constante**
> (`features/landing/constants/proof.ts`), nunca espalhado na copy — trocar o valor ali
> quando o número real chegar, sem caçar ocorrências pela página.

### 3. Problema → virada (nova)

Duas colunas em desktop, empilhadas em mobile. Esquerda = "hoje", direita = "com o ASO".

| Hoje | Com o ASO |
|---|---|
| Agenda no WhatsApp, confirmação que ninguém lembra de pedir | Agenda por profissional, com lembrete automático por e-mail |
| Ficha de anamnese em papel, guardada numa gaveta | Ficha digital assinada, versionada, com PDF e consentimento registrado |
| Caixa no caderno, taxa da maquininha descoberta no fim do mês | Lançamento já entra líquido, com a taxa do cartão descontada |
| Material que acaba no meio da sessão | Estoque que baixa sozinho a cada serviço, com alerta de mínimo |
| "Quanto sobrou desse trabalho?" | Custo do material vs. receita, com margem por serviço |

Cada linha é comprovável: agenda com lembrete (cron), ADR-0020 (anamnese), ADR-0010 +
`org_payment_fees` (caixa/taxa), `service_materials` (estoque), RPT-3 (margem).

### 4. Grid de recursos

Seis cards, **todos construídos sobre o que está no ar** — os seis atuais são filler genérico
de SaaS e um deles ("lembretes por WhatsApp") é falso.

| # | Ícone | Título | Descrição | Prova |
|---|---|---|---|---|
| 1 | `CalendarDays` | Agenda por profissional | Cada tatuador vê a própria agenda; o dono vê tudo e agenda em nome de qualquer um. Lembrete automático antes da sessão. | módulo `calendar` + cron |
| 2 | `FileSignature` | Anamnese digital assinada | Formulário por tipo de serviço, versionado. O cliente responde por link, assina e o PDF fica anexado à sessão. | ADR-0020 |
| 3 | `Wallet` | Caixa que não mente | Lançamentos imutáveis com correção por errata — nada é apagado. A taxa do cartão já entra descontada. | ADR-0010 |
| 4 | `Boxes` | Estoque real | Descartável ou compartilhado, baixa automática por serviço, alerta de mínimo e quanto custa repor tudo. | módulo `materials` + RPT-3 |
| 5 | `Users` | Clientes com histórico | Sessões, origem, anexos, observações e todas as fichas de anamnese num só lugar. | módulo `customers` |
| 6 | `TrendingUp` | Números do estúdio | Receita, despesa, ticket médio, novos clientes e margem por serviço. Exporta em CSV escolhendo as colunas. | RPT-2 + RPT-3 |

**Removidos por serem falsos:** "lembretes por WhatsApp", "confirmações digitais" (o que
existe é anamnese assinada, não confirmação de agendamento), "follow-ups pós-sessão".

### 5. Spotlights de módulo (novos)

Três blocos alternados (texto/imagem invertendo o lado), cada um com **screenshot real**.
É aqui que a página ganha densidade sem virar parede de texto.

| Spotlight | Foco | Bullets |
|---|---|---|
| **Anamnese** | O diferencial mais defensável | link público por cliente · assinatura manuscrita · PDF com termo de consentimento · nova versão do formulário obriga refazer a ficha |
| **Caixa & margem** | Onde dói dinheiro | append-only com errata · taxa por método de pagamento vira líquido · custo de material vs. receita por serviço · filtros + export CSV |
| **Estoque** | Operação diária | consumível vs. compartilhável · baixa automática ao lançar o serviço · alerta de mínimo · valor estimado para repor |

### 6. Equipe & permissões (nova)

Bento de 4 blocos, um deles maior. Responde à objeção real: *"meu tatuador vai ver o meu
faturamento?"*

- **Bloco grande:** cada funcionário vê **apenas o que é dele** — serviços, agenda e caixa
  próprios. O dono vê tudo e lança em nome de qualquer membro.
- **Permissões por módulo:** o dono liga e desliga acesso a Caixa, Estoque, Clientes,
  Agenda e Serviços por pessoa.
- **Convite por link:** membro entra por convite; recusar apaga o convite e permite reenviar.
- **Múltiplas unidades:** cada organização tem dados isolados; a mesma conta transita entre elas.

### 7. Segurança & LGPD (nova — substitui Integrações)

Quatro cards. Tudo abaixo é verificável nos ADRs 0005, 0010 e 0018.

| Card | Conteúdo |
|---|---|
| **Isolamento por estúdio** | Cada organização só enxerga os próprios dados, garantido no banco (RLS), não só na aplicação. |
| **Caixa imutável** | Lançamento nunca é editado nem apagado; correção gera errata rastreável. |
| **Anamnese conforme a LGPD** | Dado de saúde é sensível (art. 11). O consentimento é gerado no servidor, versionado e impresso no PDF assinado. |
| **Sem rastreadores** | Nenhum Google Analytics, pixel ou cookie de terceiros. Fontes servidas pelo próprio domínio. |

Rodapé da seção, em texto pequeno: papéis controlador/operador declarados + links para as 4
páginas legais (`/legal/termos`, `/privacidade`, `/cookies`, `/tratamento-de-dados`).

> A ausência de rastreadores é um diferencial real e raro — e já está auditada no ADR-0018.
> Vale dizer em voz alta.

### 8. Preços

Mantém `PublicBillingPlan[]` via `getStaticProps` + ISR (ADR-0024). Evoluções:

1. **Toggle de intervalo** (Mensal · Semestral · Anual) no topo, em vez da linha
   `ou R$X/semestre · ou R$Y/ano` espremida sob o preço. Ao escolher anual, exibir a economia
   calculada dos dados reais — **nunca** um "-20%" chumbado.
2. **Destaque de plano recomendado.** Requer um campo no catálogo (`highlighted` /
   `popular`) — hoje `PublicBillingPlan` não tem. Sem esse campo, não inventar destaque no
   frontend por índice do array.
3. **Trial explícito no card:** `60 dias grátis · depois R$X/mês`.
4. **Lista de features por plano.** Cards hoje mostram só nome, preço e descrição — muito
   pouco para decidir. Depende de `features[]` no catálogo público.
5. Estado vazio já existe e está correto; manter.

> Itens 2 e 4 são **dependências de backend**, não de UI. Se não entrarem neste ciclo, a
> seção fica como está + toggle + trial.

### 9. FAQ (nova)

Accordion. Seis perguntas, todas escolhidas por serem objeções reais deste produto:

1. **Preciso colocar cartão para testar?** Sim. O teste é de 60 dias, cobrado só ao final se
   você não cancelar. **§10.1 resolvido em 2026-08-17** — a ressalva anterior (trial
   queimado ao *abrir* o checkout, não ao concluí-lo) não se aplica mais; a resposta acima
   já é verdadeira sem ajuste.
2. **Meus tatuadores vão ver o faturamento do estúdio?** Não. Cada membro vê só o que é dele,
   e o dono liga/desliga o acesso por módulo.
3. **Como fica a ficha de anamnese perante a LGPD?** Dado de saúde é sensível; o
   consentimento é registrado com data, versão e assinatura, e vai impresso no PDF.
4. **Consigo migrar o que já tenho em planilha?** Ainda não temos importador automático,
   mas nosso time ajuda a migrar seus dados manualmente — é só abrir um chamado no nosso
   canal de suporte. Estamos à disposição em qualquer etapa, não só na migração inicial.
5. **Tenho mais de uma unidade. Funciona?** Sim, cada unidade é uma organização com dados
   isolados, acessadas pela mesma conta.
6. **Posso cancelar quando quiser?** Sim, pelo portal de assinatura, sem multa nem fidelidade.

### 10. CTA final (nova)

Faixa com fundo `primary-subtle`, centralizada. H2 curto (`Comece hoje. Leve 60 dias para
decidir.`), CTA primário + microcopy do cartão, e uma linha secundária de suporte: `Precisa
de ajuda para migrar seus dados ou só quer tirar uma dúvida antes? Fale com a gente` →
canal de suporte. A disponibilidade do time — inclusive para migração de dados — é mensagem
recorrente da página (aqui e no FAQ #4), não um detalhe escondido.

### 11. Footer

Manter. Ajustar apenas o bloco `Produto` (remover `Integrações`, adicionar `Segurança` e
`Perguntas`) e a tagline, que ainda diz "estúdios criativos".

---

## 4. O que dá vida à página

O problema visual atual não é a paleta — é que **tudo tem o mesmo peso**: onze blocos de
`bg-foreground/[0.03]` com borda `foreground/5`, mesmo raio, mesmo espaçamento, sem
movimento e sem nenhuma imagem real. Cinco alavancas, em ordem de impacto:

1. **Screenshots reais.** Nada convence um dono de estúdio como ver a tela. Substitui o
   wireframe falso do hero e alimenta os 3 spotlights.
2. **Ritmo de fundo alternado** (§2). Seções contíguas com o mesmo fundo é o que faz a página
   parecer um scroll infinito de cards.
3. **Hierarquia tipográfica maior.** H1 hoje é `md:text-7xl` mas os H2 são `md:text-5xl` —
   pouco contraste. Descer os H2 para `text-4xl` e subir o peso do eyebrow cria degraus.
4. **Cor com intenção.** `--primary` (steel) hoje aparece em tudo. Reservar para CTA e um
   número de destaque por seção; usar `--chart-2` (emerald) e `--chart-3` (amber) nos
   momentos de dado — o produto **é** sobre dados, a landing pode mostrar isso.
5. **Movimento discreto.** Stagger de entrada por scroll (`opacity 0→1`, `y 16→0`,
   ~400ms, `back.out(1.4)`, 60ms entre itens) nos grids, nav com estado `scrolled`, hover de
   card em 200ms. **Obrigatório:** `prefers-reduced-motion` respeitado — sem exceção.

Anti-padrões a evitar aqui: animação decorativa sem significado; animar `width`/`height` em
vez de `transform`/`opacity`; e carrossel de depoimentos (não temos depoimentos).

## 5. Acessibilidade e responsivo (não-negociáveis)

- Alvos de toque ≥ 44×44px; CTAs full-width em mobile (padrão já seguido).
- Contraste ≥ 4.5:1. **Auditar:** `text-foreground/40` e `/30`, usados hoje no footer e nas
  descrições de integrações, provavelmente falham sobre o fundo dark.
- Accordion do FAQ navegável por teclado com foco visível (usar o `Accordion` do Radix já
  presente no projeto, não implementar do zero).
- Breakpoints validados em 375 / 768 / 1024 / 1440.
- Ícones SVG (lucide), nunca emoji.
- Sem scroll horizontal em nenhum breakpoint.

## 6. Dados e contratos

| Dado | Origem | Situação |
|---|---|---|
| Planos e preços | `getStaticProps` → `ListPublicBillingPlansUseCase` (ISR 6h) | ✅ existe |
| Plano destacado | campo novo no catálogo público | ❌ **falta backend** |
| Features por plano | campo novo no catálogo público | ❌ **falta backend** |
| Nº de estúdios piloto | constante em `features/landing/constants/proof.ts` | ⏳ **falta o número real** |
| Screenshots dos módulos | `public/screenshots/*.webp` | ⏳ **falta capturar** |
| ↳ captura de anamnese | idem, **só com dados sintéticos** | ⚠️ ver aviso abaixo |
| Entidade legal | `LEGAL_ENTITY` | ✅ preenchido (ADR-0018) |

Tudo estático continua compatível com ISR — nenhuma seção nova exige dado por request.

> ⚠️ **Screenshots de anamnese: dado sintético, sem exceção.** O spotlight nº 1 mostra uma
> ficha preenchida com assinatura — isso é **dado sensível de saúde (LGPD art. 11)**. A
> captura tem de usar cliente semeado fictício, respostas fictícias e assinatura desenhada na
> hora; **nunca** uma ficha real, um PDF real ou uma imagem de assinatura real, nem
> borrada/recortada. Vale para todas as capturas, mas aqui o erro é incidente de proteção de
> dados, não defeito estético. O mesmo cuidado se aplica a nomes de clientes em qualquer
> outra tela capturada.

## 7. Estrutura de arquivos proposta

```
features/landing/
  constants/
    proof.ts            # nº de pilotos, itens da faixa de credibilidade
    features.ts         # grid de recursos
    faq.ts              # perguntas e respostas
    security.ts         # cards de Segurança & LGPD
  components/
    nav.tsx             # + estado scrolled
    hero.tsx            # reescrito, screenshot real
    credibility-bar.tsx # novo
    problem-shift.tsx   # novo
    features-section.tsx# reescrito
    module-spotlight.tsx# novo (componente parametrizado, usado 3x)
    team-permissions.tsx# novo (bento)
    security-section.tsx# novo (substitui integrations.tsx)
    pricing.tsx         # + toggle de intervalo
    faq-section.tsx     # novo
    final-cta.tsx       # novo
    footer.tsx          # ajuste de links
    reveal.tsx          # novo — wrapper de scroll-reveal com reduced-motion
```

**Fora de `features/landing/` — não esquecer:**

- `shared/config/site.ts` — `SITE_DEFAULT_TITLE` (`"ASO — Gestão para estúdios"`) e
  `SITE_DEFAULT_DESCRIPTION` (`"…Gestão completa para estúdios criativos."`) alimentam o
  `<Seo>`, o JSON-LD `SoftwareApplication.description`, o OG e o sitemap/robots.
- `landing-page.tsx:51` — o title `"Gestão completa para estúdios criativos"` está chumbado
  na prop do `<Seo>`.

Sem esses dois, a página diz *estúdio de tatuagem* enquanto o Google, o card de
compartilhamento e o structured data continuam dizendo *estúdios criativos*.

**Deletar:** `integrations.tsx`, `about.tsx` (as métricas falsas morrem com ele; os bullets
úteis migram para a faixa de credibilidade e o FAQ).

## 8. Ordem de implementação sugerida

1. **Correções de honestidade** (bloqueante, pode ir sozinho): remover `about.tsx` e
   `integrations.tsx`, tirar "WhatsApp" do grid, dar destino ao botão morto do hero, corrigir
   o CTA para "Testar 60 dias grátis" (§10.1 resolvido em 2026-08-17 — afirmação já é
   verdadeira, sem ressalva a carregar) e atualizar `shared/config/site.ts` + o `title` do
   `<Seo>` em `landing-page.tsx:51` para o posicionamento vertical. *Isso é o que não pode
   ficar no ar como está.*
2. Reescrever grid de recursos + FAQ + Segurança & LGPD (só copy e estrutura, sem
   dependências).
3. Faixa de credibilidade, problema→virada, equipe & permissões, CTA final.
4. Capturar screenshots → hero real + 3 spotlights.
5. `reveal.tsx` + ritmo de fundo + ajuste tipográfico.
6. Preços: toggle de intervalo (frontend) e, se o backend acompanhar, destaque + features.

## 9. Auditoria que originou esta spec

Levantada em 2026-08-16 contra o código no ar:

| Alegação na landing | Realidade verificada |
|---|---|
| "500+ estúdios ativos", "98% satisfação", "12k+ agendamentos/mês", "R$2M+ processados" | **Inventados.** Modelo é trial + estúdios convidados |
| WhatsApp, Instagram, Notion, Zapier, Pix | Aparecem **só** em `integrations.tsx`. Zero ocorrências no backend |
| Google Calendar | BL-1: fundação sem OAuth, flag `EXTERNAL_CALENDARS_ENABLED` default **off** |
| "lembretes por WhatsApp" | Notificações são in-app + e-mail (Resend) |
| "Suporte via WhatsApp em português" (`about.tsx:15`) | Suporte é portal B2B + e-mail-to-ticket (ADR-0021/0022). Não há canal WhatsApp |
| "Ver demonstração" | Sem `href`, sem handler. Botão morto |
| "Começar grátis" | Trial de 60 dias via Stripe Checkout com `paymentMethodCollection: "always"` — **exige cartão**. Era queimado ao abrir o checkout; **corrigido em 2026-08-17** (§10.1) |

## 10. Em aberto

### 10.1. ~~O trial é queimado ao abrir o checkout~~ — RESOLVIDO (2026-08-17)

**Status: RESOLVIDO.** Caminho escolhido: **correção no produto**, não na copy. A marcação
de `trial_consumed` foi movida da criação da checkout session para a confirmação via
webhook do Stripe (+ reconciliação cron como rede de segurança), sem rate-limit por
organização e sem coluna nova — decisão explícita registrada em
`.memory/adr/0016-billing-stripe-assinatura.md` (Addendum 2026-08-17). Detalhe:
`create-checkout-session.use-case.ts` não escreve mais `trialConsumed`; a escrita passou
para o predicado `shouldMarkTrialConsumed`
(`modules/subscriptions/domain/subscription-sync.ts`), chamado por
`HandleStripeWebhookUseCase::syncNormalizedSubscription` e por
`ReconcileSubscriptionsUseCase`, condicionado a `trial_end` vir preenchido pelo Stripe.
Migration de dados `0050_subscriptions_restore_unstarted_trials` restaurou
`trial_consumed=false` para organizações atingidas pelo bug no passado (predicado
conservador, limitação documentada no cabeçalho da própria migration).

Consequência para quem implementa a landing: **"Testar 60 dias grátis" agora é uma
afirmação verdadeira sem ressalva** — abrir o checkout e fechar a aba sem pagar não queima
o trial. A ressalva "sujeito a §10.1" antes anexada ao item 1 de §8 e a nota "hoje o trial é
queimado ao abrir o checkout" em §3 seção 9 (FAQ #1) **podem ser removidas**; a resposta
final do FAQ #1 (copy da landing) permanece tarefa do fluxo de implementação da landing, não
deste documento — ver nota em §10.2.

<details>
<summary>Histórico do problema (resolvido, mantido para contexto)</summary>

`create-checkout-session.use-case.ts:104-107` marcava `trialConsumed = true` **antes** de
chamar o Stripe, e nenhum webhook revertia (`trialConsumed` só era escrito nesse arquivo).
Consequência real: o estúdio clicava em "Testar 60 dias grátis", caía no Stripe, hesitava,
fechava a aba — e ficava **sem trial, permanentemente, para aquela organização**. O
comentário no código dizia que era intencional (evitar retry infinito de trial após
abandono).

Anunciar "60 dias grátis" no hero enquanto isso valia era a mesma classe de afirmação que as
métricas inventadas — e encostava no direito de arrependimento que o ADR-0018 já trata.

> Handoff criado em 2026-08-16 (`task_af244514`) para conduzir a correção via skill
> `development-workflow` — tratada como complexa (integração externa/billing) por elevação
> de risco do CLAUDE.md. Correção landou em 2026-08-17.

</details>

### 10.2. Outros pontos

1. ~~**Nº de estúdios piloto**~~ — **Resolvido (2026-08-16):** placeholder `5`, decisão do
   time até termos o número real (ver §3, seção 2).
2. ~~**Migração de planilha (FAQ #4)**~~ — **Resolvido (2026-08-16):** sem importador
   automático, mas suporte ajuda manualmente via canal de suporte (ADR-0021/0022). Reforçado
   também no CTA final (§3, seção 10).
3. ~~**Trial queimado ao abrir checkout (§10.1)**~~ — **Resolvido (2026-08-17):** ver §10.1.
   Conferido nos componentes React (`faq-section.tsx`): a resposta do FAQ #1 já usava
   redação neutra ("começa quando você inicia o checkout"), sem ressalva nem menção a
   §10.1 no texto visível — nada a remover na landing.
4. **Destaque e features por plano** — dependem de campos novos no catálogo público.
5. **Screenshots** — quem captura e com quais dados de demonstração (lembrete: anamnese
   exige dado sintético, ver §6).
