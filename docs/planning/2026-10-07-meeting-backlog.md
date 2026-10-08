# Backlog da reuniao de 07/10/2026 — Overview, confirmacao de agendamento e Formularios

> Fonte: `meeting-2026-10-07/` (2 partes: 60 min + 12 min; transcricao + resumo do Fathom),
> untracked e **deliberadamente nao commitada** (nomes completos, e-mails pessoais e links de
> compartilhamento) — mesmo criterio dos backlogs anteriores. O resumo do Fathom diverge da
> conversa em varios pontos; **este documento prevalece sobre o resumo** (ver "Correcoes").
> Participantes: Paulo (dev), Ruan e Joao Pedro / "jp perim" (stakeholders).
> Insumo tecnico previo: `docs/spikes/2026-10-02-viabilidade-documentos-e-orcamentos.md`
> (Ideia 2 = base dos Formularios; Ideia 1 = Documentos, **fora deste ciclo**).
> Decisoes abaixo foram fechadas por Paulo em rodada de perguntas em 07/10/2026.

---

## Como retomar (leia isto primeiro)

1. **Protocolo**: cada bloco segue a skill `development-workflow` (classificar risco → menor
   fluxo suficiente). Pre-classificacao abaixo; **banco, tenancy, rota publica e upload anonimo
   elevam para complexa** (planner antes, reviewer + database-guardian depois).
2. **Ordem fixa**: A (Overview) → B (Agenda) → C (Formularios). C3 depende de B.
3. **Uma branch por bloco** a partir de `development` (C pode ter uma por fatia). Sem push,
   deploy, migration remota ou commit sem pedido (regra do projeto).
4. **Validacao**: `pnpm check-types` + `pnpm lint` + `pnpm test` + build direcionado; toda
   mudanca observavel exige **verificacao no preview** (`docs/ai/agentic-workflow.md` §Validacao).
5. **Versao/changelog**: cada bloco que entrega feature visivel = bump **minor** via
   `pnpm version:bump minor` + item de changelog com o mesmo `semver` (skill `product-versioning`,
   ADR-0031/0030). Nunca editar `version` a mao.
6. Migrations escritas a mao (`.sql` + `.down.sql` + `_journal.json`); ultima aplicada que
   observei foi a `0084` — conferir o proximo numero livre e a nota de colisao entre branches
   em `.memory/domain-rules.md`. **Nao** usar `db:generate`.

---

## Correcoes ao resumo do Fathom

| Resumo dizia | Realidade (decidido) |
|---|---|
| Reduzir trial 60→45 era item de Ruan/jp | **Ja feito** (commit `7e5542c`) e **ja em producao**. Nada a fazer. |
| "Linktree integrado" | **Nao** ha integracao com Linktree. Constroi-se pagina propria, **similar**, com links extras (ver C4). |
| Imagem de referencia obrigatoria | **Opcional, 0 a 3 imagens**. |
| Campos opcionais = "campos personalizados" | Texto de apresentacao/regras **+ perguntas extras** (texto e sim/nao) — ver C4. |
| Cliente confirma "respondendo o e-mail" (Resend inbound) | Confirma por **link/botao no e-mail** (Confirmo / Nao poderei ir). Inbound **nao** e necessario. |
| Piso R$100/mes, desconto 50% p/ 10 primeiros | Decisao de preco/plano e **de Ruan e Joao**; nao e trabalho de codigo deste ciclo. |
| Melhorar editor de e-mail das Campanhas | **Fora do ciclo.** |
| Estudar aba Documentos com preco | **Fora do ciclo** (spike de 02/10 permanece como esta). |
| Contas a pagar | **Adiado** (risco de redundancia com filtros do caixa; org-por-profissional complica cadastro). |
| WhatsApp (jan/2027) | Nada de implementacao agora; so o estudo de custo (bloco D). |

---

## Bloco A — Overview (classificacao: intermediaria)

Sem schema novo previsto. Tocar `overview` (back) e `features/overview` (front) — `locator` primeiro.

**Escopo (decidido):**
- **A1 — Filtro de periodo global**: seletor de **mes** (anterior/proximo) que vale para **todas**
  as secoes do overview (Joao: nao pode haver secao que move data e outra que nao, gera
  discrepancia). Mes corrente continua o default. Backend aceita o mes como parametro em todas as
  queries do overview; cuidado com cache/query keys (`infrastructure/query/query-keys.ts`).
- **A2 — "Materiais mais gastos"** substitui o grafico "Entrada e Saida" (redundante com
  Desempenho: resultado/receita/despesa). Fonte: movimentos de estoque do periodo.
- **A3 — Remover "Repasse por profissional"** do grafico (ja existe "quanto transferir" abaixo).
  Manter "Receita por profissional" e "Servico por tipo".
- **A4 — Metodo de pagamento**: hoje e rosca; passar a exibir **numeros e porcentagens** claros
  (rosca com valores + lista/linhas com % — "as duas formas").
- **A5 — Personalizacao simples, no navegador**: abas fixas Operacoes / Desempenho / ABC; por aba
  o usuario escolhe o tipo de grafico/exibicao; preferencia persistida em **localStorage** (com
  try/catch; pagina deve renderizar sem ele). **Sem** persistencia no servidor.
- **Nao tocar**: o bloco superior (caixa, servicos, transacoes, clientes, saldo, desempenho,
  lucro/margem) — Ruan considera "perfeito".

**Aceite:** mes anterior carrega todos os blocos coerentes; remocoes feitas; materiais mais gastos
com dados reais; pagamento legivel; preferencia de grafico sobrevive a reload; mobile-first;
testes de use-case/lib; verificado no preview (desktop + mobile).

---

## Bloco B — Confirmacao de agendamento (classificacao: **complexa**)

Toca `calendar`, `notifications`/`mail`, cron interno, **rota publica com token** e provavelmente
migration. `locator` → `planner` → `backend-implementer` + `frontend-implementer` → `tester` →
`database-guardian` → `reviewer`.

**Problema de negocio:** cliente agenda, tatuador esquece de confirmar, cliente nao aparece,
tatuador perde dinheiro.

**Escopo (decidido):**
- **B1 — Novo tipo de evento "servico futuro"** na agenda, com **campo de e-mail do cliente** e
  vinculo **opcional** a cliente existente (`calendar_events.customer_id` ja e nullable — conferir).
  Cliente sem pre-cadastro e valido: so o e-mail no evento.
- **B2 — Envio**: ao **criar** o evento, e-mail de **confirmacao** ao cliente; **lembrete ~24h
  antes** se o status ainda estiver pendente (reaproveitar o cron interno de lembrete de agenda).
  Sem e-mail no evento: nada e enviado e o evento segue normal.
- **B3 — Confirmacao por link com token**: pagina publica com **Confirmo / Nao poderei ir**.
  Token de uso controlado (expira, nao enumeravel), rate limit; mesmo cuidado de superficie
  publica do ADR-0022. **Sem** parsing de resposta de e-mail.
- **B4 — Status no evento**: pendente / confirmado pelo cliente / cancelado pelo cliente (+ "enviado
  ou nao"), visivel ao profissional na agenda, e **notificacao in-app** quando o cliente responde.
  Respeitar escopo existente ("funcionario ve so o seu; owner em nome de").
- **Mencionado na reuniao e NAO incluso**: status de confirmacao via WhatsApp (depende do bloco
  WhatsApp, jan/2027); gatilho de campanha de confirmacao (Ruan/Paulo: isso e da agenda, nao da
  aba Campanhas).

**Aceite:** evento futuro com e-mail dispara confirmacao; lembrete 24h so se pendente; link
confirma/cancela e reflete na agenda; token invalido/expirado tratado; testes por use-case
(`jest.Mocked`); item de changelog + minor.

---

## Bloco C — Formularios + link do estudio (classificacao: **complexa**, em fatias)

Base: spike de 02/10 (Ideia 2). **Tudo atras de flag global de ambiente (env)**, no padrao do
`PublicSupportFeatureFlagGuard` (`support/interface/public-support-feature-flag.guard.ts`).
Libera-se primeiro para a Ink House; abertura geral junto do pacote WhatsApp (jan/2027). Preco/plano
**nao** e amarrado em codigo agora (sem entitlement).

**Decisoes de produto (fechadas):**
- **Entidade propria** (`orcamento`/lead), **nao** `customers` (spike: `customers` exige
  `birth_date`/`address` NOT NULL e e-mail unico por org).
- **Campos fixos**: nome, telefone, e-mail, ideia (texto). **Imagens: opcionais, 0–3**, tipos
  somente imagem, limite de tamanho, bucket privado.
- **Cada profissional tem o seu formulario** dentro da org; quem nao criou o seu **nao aparece**
  na pagina do estudio (isso resolve a decisao "membro aparece por padrao?" do spike).
- **Ciclo de vida**: profissional abre o formulario e usa **deep link `wa.me`** para falar com o
  cliente; depois marca **"respondido"**:
  - **Agendou** → informa data/hora, cria evento "servico futuro" na agenda (carregando o e-mail do
    formulario, ligando com B), e o formulario **some por completo** (dados + imagens).
  - **Nao agendou** → imagens apagadas na hora; **so contato** (nome/telefone/e-mail) retido
    **30 dias** como lead frio e depois excluido por cron. Exige **consentimento** no formulario.
  - **Nunca tratado** → expira em **30 dias** (mesmo prazo), registro + imagens removidos.
  - Limpeza de storage deve realmente apagar o arquivo (pendencia do ADR-0018 Tier 2: arquivo
    excluido hoje pode ficar orfao — **resolver para este fluxo**, nao so a linha do banco).
- **Notificacao**: nova resposta gera notificacao e **badge numerico** no item da sidebar.
- **Personalizacao**: texto de apresentacao/regras editavel **+ perguntas extras** (tipos `text` e
  `yes_no`, reaproveitando o motor da anamnese). Tipos novos (escolha, data) ficam fora.
- **Link do estudio, "tipo Linktree"** (substitui Linktree/Google Forms): paginas publicas
  - **pagina da org**: lista os profissionais **com formulario ativo** + **links extras
    configuraveis da org** (ex.: Instagram, site);
  - **pagina de cada profissional**: o formulario dele + **links extras configuraveis dele**;
  - slug estavel por org/profissional; quem edita: owner edita os da org, cada profissional os seus.

**Fatias sugeridas** (cada uma com seu planner/reviewer/database-guardian):
- **C1 — Fundacao publica**: tabelas (orcamento, imagens, link extra), RLS por org, slug, flag env,
  formulario publico com Turnstile fail-closed + rate limit + trust proxy (ADR-0022), upload anonimo
  de 0–3 imagens (so imagem, limite de tamanho/quantidade, bucket privado, captcha antes do upload),
  consentimentos (privacidade + contato 30d). **Testar no navegador interno do Instagram (iOS/Android)**
  — o spike aponta isso como risco; se nao for possivel testar, registrar como pendencia manual.
- **C2 — Caixa de entrada**: lista de orcamentos por profissional (escopo "funcionario ve so o seu"),
  detalhe com imagens (signed URL curta), botao `wa.me`, badge na sidebar, notificacao, permissao de
  modulo, navegacao e tour de onboarding (ADR-0032).
- **C3 — Conversao e ciclo de vida** (**depende de B**): "respondido → agendou? (data/hora)" cria o
  evento servico-futuro; "nao agendou" aplica retencao de lead; cron de expiracao 30d com limpeza de
  storage; auditoria das exclusoes.
- **C4 — Personalizacao + paginas Linktree**: texto de apresentacao, perguntas extras
  (`text`/`yes_no`), paginas publicas da org e do profissional, CRUD de links extras.

**Fora do escopo (decidido):** perguntas com tipos novos; metricas de funil; leads nas campanhas de
remarketing; sinal/valor no caixa (caixa e append-only, ADR-0010 — nada automatico); entitlement por
plano.

**Aceite (por fatia):** testes de regra de negocio; RLS e rollback revisados pelo database-guardian;
nenhum dado/imagem permanece apos agendar/expirar (verificar storage, nao so banco); superficie
publica protegida; verificado no preview; changelog + minor.

---

## Bloco D — Estudo de custo do WhatsApp (entregavel em documento)

Doc em `docs/spikes/` (sem codigo). Insumos da reuniao: campanha hoje so por e-mail; WhatsApp custa
centavos por mensagem mas volume por org pode estourar; Paulo estima ~R$20/mes de custo por cliente
so existindo na plataforma; Resend gratis = 3.000 e-mails/mes **compartilhados por toda a base**, proximo
nivel US$20/mes para 50 mil; piso de preco citado: R$100/mes; lancamento previsto jan/2027 junto com
Formularios. Entregar: custo por mensagem/categoria, limite de mensagens por plano, simulacao por volume
de clientes por org, e proposta de modelo de preco para Ruan e Joao. **Nao inventar precos da Meta/BSP:
citar a fonte e a data da consulta.**

---

## Acoes manuais (nao sao tarefas de codigo — nao entram no prompt de execucao)

- **Paulo/Ruan**: recap de cupom e Stripe antes de Ruan repassar o link a clientes.
- **Paulo + Isabela**: testar isolamento por organizacao (criar org, convidar, verificar visibilidade).
  Esclarecido na reuniao: super_admin ve todas as orgs; funcionario que cria a propria org so ve a dele.
- **Estudio com varios profissionais, cada um com sua org**: cobranca unica pela org do contratante,
  demais como usuarios gratuitos; mudancas de contrato/preco exigem acompanhamento manual (vinculados).
- **Ruan/Joao**: fechar piso R$100 e plano; **15/10 18h** reuniao presencial de marketing/assessoria.
- **Contas a pagar**: reabrir so apos pesquisa (redundancia com filtro de caixa; estudios com orgs separadas
  que partilham as mesmas contas).
