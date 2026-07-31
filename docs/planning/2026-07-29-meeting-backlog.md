# Backlog da reuniao de 29/07/2026 — revisao pos-correcoes e fechamento de lancamento (ASO)

> Fonte: `2026-07-29-meeting-transcription.md` (56 min) e `2026-07-29-meeting-summary.md`
> (resumo do Fathom) — arquivos **untracked** na raiz do repo, deliberadamente **nao
> commitados**: contem nomes completos, e-mail pessoal do Paulo e link de compartilhamento
> do Fathom. Mesma decisao tomada para o par da reuniao de 10/07 (ver "Pendencias de
> repositorio" em `2026-07-10-meeting-backlog.md`).
> Participantes: Paulo (dev), Ruan (stakeholder), Joao Pedro / "jp perim" (stakeholder).
>
> **CONTEXTO**: esta reuniao e o ciclo de teste do backlog de 10/07 (M0–M11, todos
> mergeados em `development`, apps em **0.18.0**). Ruan e Joao Pedro testaram o sistema em
> staging e trouxeram o que funcionou, o que quebrou e o que nao foi entregue.
>
> **DATA DE LANCAMENTO ACORDADA: 13/08/2026** (15 dias a partir de 29/07, com gordura
> deliberada — Paulo estimou ~5 dias de dev + ciclo de teste + configuracao legal/Stripe).

---

## ⚠️ LEIA ANTES DE CORRIGIR QUALQUER COISA: risco de deploy velho

Varios itens reportados como bug **podem nao ser defeito de codigo**, e sim staging
rodando uma versao antiga. Evidencias diretas da transcricao:

| Momento | Fala do Paulo | Item afetado |
|---|---|---|
| 15:23 | "Tá, será que eu não fiz o deploy? A gente tem que investigar." | agendamento em mes futuro |
| 19:11 | "Será que deu o push? Deixa eu testar uma coisinha antes da gente seguir." | carregamento da ficha de anamnese |
| 22:54 | "Na minha cabeça tava funcional, desgraçado... Será que ele fez?" | agendamento futuro na agenda (N4/N5 — ver correcao abaixo) |

Somado a isso: **o site caiu no meio da reuniao** (09:00 — "o site não está mais no ar...
acabou de encerrar o modo trial"), ou seja o ambiente de teste estava instavel e com
hospedagem expirada. E o proprio B3 da reuniao anterior (navegacao para meses futuros na
agenda) foi registrado no M6 como **"investigado e nao reproduzido"**.

**Correcao (2026-07-30)**: apesar do padrao "deploy velho" acima, N4/N5 (agendamento em mes
futuro) era um **bug real de codigo**, nao ambiente — ver a linha N4/N5 do inventario de
bugs. O padrao de suspeita continua valido como heuristica, mas nao e garantia; cada item
precisa da propria investigacao.

**Regra para esta rodada**: todo item da classe "funcionalidade que o Paulo acredita ter
entregue" precisa ser **reproduzido localmente contra `development`** antes de virar
commit de correcao. Se nao reproduzir, e item de deploy/ambiente e deve ser registrado
como tal aqui — **nao** "corrigido" no codigo. Precedente na memoria de sessao:
`feedback_manual_e2e_catches_integrity_bugs` (o reviewer ja aprovou codigo cujos bugs
reais so apareceram em chamada HTTP de verdade).

---

## Como retomar (leia isto primeiro)

1. **Protocolo de execucao**: cada milestone segue a skill `development-workflow`
   (`.claude/skills/development-workflow/SKILL.md`) — classificar risco → menor fluxo de
   agentes suficiente (`locator` → `planner` se complexa → `implementer` → `tester` →
   `database-guardian` se tocar schema/migration → `reviewer` se complexa/alto risco).
   As milestones abaixo ja vem pre-classificadas.
2. **Branches e merges**: uma branch por milestone (`fix/<slug>` ou `features/<slug>`) a
   partir de `development`, PR para `development`, merge quando o CI estiver verde. Claude
   pode pushar, abrir PR e mergear em `development` (regra vigente desde o M2 do backlog
   anterior). **Nao** pushar `staging` nem `main` nesta rodada — ver gate de deploy abaixo.
3. **Validacao padrao**: `pnpm check-types` + `pnpm lint` + `pnpm test` + build direcionado.
   A suite existe (jest backend, vitest frontend) desde o M0 — **205 specs backend / 68
   frontend** no momento em que este doc foi escrito.
4. **Testes obrigatorios em toda entrega** (pedido explicito do Paulo): cada milestone sai
   com specs cobrindo a regra de negocio nova, nao so check-types/lint.
5. **Commits**: Conventional Commit em pt-BR sem acentos, com escopo e referencia ao
   milestone (ex.: `fix(anamnesis): ... (N2)`), corpo explicando o porque.
6. **Versionamento**: +1 minor nos dois apps (`apps/backend/package.json` e
   `apps/frontend/package.json`, mantidos sincronizados) por milestone concluida.
   Base desta rodada: **0.18.0**.
7. **Duvidas de requisito de negocio**: parar e perguntar ao Paulo. Nao adivinhar em
   dinheiro, LGPD, RLS ou contrato com Stripe.

### ✅ Gate de deploy — LEGAL_ENTITY preenchido em 2026-07-31

`apps/frontend/src/features/legal/constants/entity.ts` foi preenchido com dados reais
(razao social, CNPJ, endereco, encarregado/DPO). O gate no `apps/frontend/Dockerfile`
fica como guarda permanente contra regressao, nao bloqueia mais o lancamento. Ver
`docs/deployment.md` e ADR-0018.

---

## ✅ Confirmado funcionando (validado pelos stakeholders — nao mexer)

Entregas do backlog de 10/07 que passaram no teste:

- Limitacao/formatacao de digitos no telefone, com aviso ao exceder (M2).
- Obrigatoriedade dos campos de cliente e notificacao de e-mail duplicado (M2/M4).
- Filtro de aniversariantes do mes (M4).
- Notificacao de estoque baixo, aparecendo no topo da lista (M2/notificacoes).
- Visibilidade de evento na agenda (publico/privado) e evento coletivo com presenca (M6)
  — **com bug na confirmacao, ver N3**.
- Funcionario consegue debitar material ao lancar servico mesmo sem permissao de estoque
  (era o B1/M1 — fix critico de permissoes, confirmado).
- Remocao do metodo de pagamento "Creditos" (M2).
- Categorias de caixa gerenciaveis, incluindo renomear as pilares (M5).
- Anexo de foto no servico, ~300KB (M7).
- Tour de onboarding na primeira entrada (M9).
- Pagina de detalhe do cliente — elogiada ("ficou sensacional") — **com ressalva de UX no
  acesso, ver N8**.

---

## 🔎 CAUSA-RAIZ UNICA de N1 + N2 + N3 (diagnosticado em 2026-07-30)

Tres bugs reportados como independentes tem **um unico defeito na origem**, em
`apps/frontend/src/infrastructure/api/client.ts` (linha 123 antes da correcao):

```ts
if (res.status === 204) return undefined as T
return res.json() as Promise<T>   // <-- lanca em 200 com corpo VAZIO
```

Só 204 era tratado. O **NestJS responde 200 com corpo vazio** (nao 204) quando o handler
retorna `null` ou `void` — nesses casos `res.json()` lança
`SyntaxError: Unexpected end of JSON input`. Isso explica exatamente os tres relatos,
inclusive o "backend responde 200 mas o front da erro" que parecia contraditorio:

| Item | Endpoint | Retorno do handler | Sintoma observado |
|---|---|---|---|
| **N1** | `GET /orgs/:orgId/service-types/:serviceTypeId/anamnesis-form` | `null` quando o tipo de servico ainda nao tem ficha (deliberado) | "não foi possível carregar a ficha" **com HTTP 200** |
| **N2** | (consequencia de N1) | — | O `if (loadError) return` do form builder faz early-exit e **esconde a UI inteira**, incluindo o botao "Adicionar pergunta", que **ja existia**. Nao era feature faltando. |
| **N3** | `PUT /orgs/:orgId/calendar/events/:id/rsvp` | `Promise<void>` sem `@HttpCode(204)` | O erro literal `Failed to execute 'json' on 'Response'`. A escrita **funciona** no servidor, mas o cliente lança ao parsear e a invalidacao de cache do React Query nunca roda — e por isso "a presenca nao computa de imediato, mas aparece ao sair e entrar de novo". |

**Nao era deploy velho** — nenhum dos tres. A correcao e no cliente HTTP (tratar corpo
vazio em qualquer 2xx), nao endpoint por endpoint. Os status codes do backend ficam como
estao: mudar `void` para 204 seria mais correto em REST, mas e alteracao de contrato sem
ganho aqui, ja que o cliente passa a ser robusto aos dois.

**Licao durável**: um cliente HTTP que assume corpo JSON em toda resposta 2xx transforma
todo handler `void`/`null` do Nest num bug de frontend aparentemente sem relacao. A spec
`client.spec.ts` trava a regressao.

## 🐛 Bugs reportados (prioridade de correcao)

| Id | Bug | Evidencia da transcricao | Suspeita inicial |
|---|---|---|---|
| **N1** | **Ficha de anamnese nao carrega** — frontend mostra "não foi possível carregar a ficha de anamnese, tente novamente" **mas o backend responde 200**. Bloqueia a tela inteira, e por consequencia a criacao de perguntas. | 21:56–22:28: "o front-end reporta que não foi possível carregar a ficha de anamnese... só que a resposta do formulário é 200, não condiz, isso é bug, vamos deixar bem claro que precisa ser priorizado" | 200 + erro no front = **mismatch de shape da resposta ou de tratamento de erro no hook**, nao falha de backend. Diagnostico estreito, comecar por aqui. |
| **N2** | **Nao existe UI para criar perguntas na ficha de anamnese.** Ruan selecionou o tipo de servico e nao encontrou acao de criar pergunta. Paulo: a ficha ja existe zerada, e so iniciar — logo, e problema de descoberta/UX, agravado por N1. | 16:18–19:04, 21:24 | Provavel que N1 esconda a UI. Reavaliar **depois** de N1 corrigido; se a UI existir, virar tarefa de UX (estado vazio explicito com CTA). |
| **N3** | **Erro ao confirmar presenca em evento coletivo**: `Failed to execute 'json' on 'Response': Unexpected end of JSON input`. A presenca **nao computa de imediato**, mas aparece ao sair e entrar de novo. | 14:26–14:50; JP em 09:31 nota que no Brave nao deu erro (so nao computou), so no Opera | Resposta vazia sendo parseada como JSON (204/`res.json()` sem corpo). Bug de cliente HTTP, nao de dominio. A divergencia entre navegadores reforca. **Paulo tambem quer entender por que o Better Stack do backend nao logou** (13:48) — item separado, N12. |
| **N4/N5** | **Nao e possivel criar agendamento em mes futuro na agenda.** N4 e N5 sao o MESMO item — confirmado com o Paulo em 2026-07-30 que a fala de 22:28–22:54 ("não dá mais para lançar... para amanhã") tambem se refere a agenda, **nao a servico**. O bloqueio deliberado de data futura em SERVICO (M2, `assert-performed-at-not-future`, com spec) **nao esta em conflito com nada** — fica como esta, intocado. | 14:50–15:23, 22:28–22:54 | **NAO era deploy velho, era bug real** (diagnosticado 2026-07-30): `shared/components/ui/date-picker.tsx:65` fixa `endMonth={new Date()}` — apropriado para campos tipo data-de-nascimento — mas `features/agenda/components/event-form.tsx:302` reusa o `DatePicker` sem override nesse prop, herdando o teto do mes atual no campo de data do EVENTO. A navegacao do grid principal da agenda (`calendar-context.tsx`, `goNext`/`goPrev`) nao tem limite nenhum — o defeito e so no date-picker do formulario de criar/editar evento. |
| **N6** | **Nao e possivel lancar errata em transacao gerada por servico** pela aba Caixa — o sistema exige corrigir na aba Servico. | 29:42–31:54 | Comportamento **atual e deliberado** (`SERVICE_PAYMENT_NOT_CORRECTABLE` / guarda simetrica de PR #19). A decisao da reuniao e **permitir nos dois lugares**. Ver N6 na tabela de milestones — mexe em caixa/dinheiro ⇒ complexa. |
| **N7** | **Mensagem de estoque insuficiente em ingles e vazando ID interno**: "Insufficient stock for material \<id\>, available 0, requested 1". | 24:25–25:29 | Duas coisas: traducao (fallback ou i18n ausente) e **nao exibir identificador interno** ao usuario. Paulo sugeriu marcar a linha do material com problema no form em vez de citar id. |

---

## 🔧 Alteracoes de comportamento e UX (acordadas)

| Id | Item | Detalhe acordado | Evidencia |
|---|---|---|---|
| **N8** | **Acesso ao overview do cliente** | Hoje so por double-click. Adicionar clique simples no nome **e/ou** botao explicito "Detalhes". Motivo: double-click nao e padrao de UX e **nao funciona bem em celular/tablet**, que e o alvo. Paulo: expor todas as formas nao e problema. | 04:42–06:00 |
| **N9** | **Exportacao: formato em vez de delimitador** | Trocar o seletor de delimitador por seletor de **formato de arquivo** (`.csv` ou `.xlsx`); o delimitador passa a ser consequencia do formato. Paulo abriu a possibilidade de manter o delimitador **apenas** quando o formato for CSV. | 06:00–07:46, 20:51–21:18 |
| **N10** | **Nomenclatura de transferencia no caixa** | Destinos de transferencia devem usar **os nomes das categorias de caixa da propria org** (ex. "Dinheiro Fisico", "Banco Digital"), nao rotulos fixos como "Transferencia PIX". | 28:00–28:44 |
| **N11** | **Filtro de Estorno no caixa** | Estorno passa a ser **categoria fixa do sistema** — sempre existe, nao editavel, nao removivel (usar o `is_protected` que ja existe do M5) — e **filtravel** na busca do caixa. | 28:44–29:42 |
| **N13** | **Largura do formulario de novo servico** | O form tem informacao demais para o sheet lateral estreito atual. Ao menos **dobrar** a largura, respeitando responsividade. | 25:47–26:07 |
| **N14** | **Tipo de servico obrigatorio** | O campo Tipo virou opcional e "nunca deveria ser opcional". Tornar obrigatorio (com asterisco). | 26:07–26:24 |
| **N15** | **Quantidade de material deve ser inteiro** | O campo de quantidade de material no form de servico aceita decimal; sao sempre unidades fixas. | 26:55–27:22 |

---

## 🚧 Nao implementado (prometido na reuniao anterior, nao entregue)

| Id | Item | Situacao |
|---|---|---|
| **N16** | **Validacao de cliente menor de 18 anos** | Ruan cadastrou cliente menor e lancou servico para ele, sem nenhum aviso. Paulo acredita que foi implementado (era o F4/M7 — flag 18+ por tipo de servico) **mas que existe uma regra previa para habilitar** e nao lembrou qual: "vamos considerar como não feito para eu revisitar isso daí". ⇒ Investigar se e a flag por tipo de servico nao ativada, e tornar isso descobrivel. | 03:04–04:05 |
| **N17** | **Renomear arquivo depois do upload** | Nao funciona nem apos subir. Era parte do F7/M7 (nome interno unico + nome amigavel no download). | 04:05–04:41 |

---

## 🎯 Feature nova decidida nesta reuniao

### N18 — Overview do funcionario dirigido por permissao (a decisao mais substancial da reuniao)

**Decisao final** (fechada em 39:10–40:40 apos debate longo): a tela de overview de uma
organizacao e renderizada **de acordo com o papel e as permissoes**:

- **Admin/owner**: ve tudo.
- **Funcionario**: ve **apenas os cards dos modulos que o admin liberou**. O que nao tem
  permissao **nao aparece** — nem o card.

Bug concreto que originou a discussao: funcionario **com** acesso a estoque ve o **valor de
reposicao de estoque** (dinheiro) no overview; funcionario **sem** acesso a estoque ainda
via o card de estoque baixo. Paulo: "se eu não controlo o estoque, eu não controlo o
estoque."

**Alternativas rejeitadas** (registrar para nao reabrir):
- JP propos separar "ver quantidade" de "ver valor em dinheiro" (granularidade fina).
- Paulo propos regra-mae com sub-regras (ver/editar/remover/criar por modulo).
- **Rejeitadas** por Ruan em favor da simplicidade operacional: acesso ao modulo e
  binario, ponto final — "o cara pode ou não acessar o estoque. Ponto final. A partir do
  momento que ele pode acessar o estoque, ele pode usar todas as funções do estoque."
  JP fechou: "no fim das contas não tem nem por que o funcionário ver estoque de nenhuma
  forma, do mesmo jeito que ele não vê caixa."

**Racional de produto** (JP, 40:40): isso viabiliza **papeis especializados** sem criar
tipos de funcionario no codigo — contratar alguem so para estoque, ou uma secretaria que
so ve agenda. O admin monta o papel marcando permissoes. Layout precisa ser **dinamico e
responsivo** (numero variavel de cards).

---

## Proposta de milestones

Ordenadas por valor/urgencia. Uma branch por milestone, PR para `development`, bump de
minor nos dois apps, testes obrigatorios.

| Milestone | Conteudo | Risco (skill) | Status |
|---|---|---|---|
| **N-A — Corpo vazio em 2xx no cliente HTTP** (N1, N2, N3) | Causa-raiz unica: `apiRequest` so tratava 204 e lancava em 200 com corpo vazio. Corrige anamnese (N1), a UI de criar pergunta que estava escondida pelo early-exit (N2) e a presenca em evento coletivo (N3) de uma vez. Spec `client.spec.ts` trava a regressao. | intermediaria (contrato front↔back) | em andamento |
| **N-B — Correcoes rapidas do form de servico** (N14, N15, N13, N7) | Tipo obrigatorio, quantidade inteira, largura do form, mensagem de estoque em pt-BR sem id interno (via `details` estruturado na DomainException, seguindo o padrao de i18n proprio por code do SUBSCRIPTION_REQUIRED). | intermediaria (DTO backend + front) | ✅ concluido |
| **N-C — DatePicker: liberar mes futuro no form de evento** (N4/N5) | Tornar `startMonth`/`endMonth` do `DatePicker` compartilhado configuraveis via prop (hoje hardcoded pro caso data-de-nascimento) e o `event-form.tsx` da agenda passar um teto futuro adequado (+2 anos). Bloqueio de data futura de SERVICO (M2) intocado — confirmado sem relacao. | intermediaria (componente compartilhado, ~11 outros usos verificados) | ✅ concluido |
| ~~**N-D — Presenca em evento coletivo** (N3)~~ | **Absorvido pelo N-A** — mesma causa-raiz (corpo vazio em 2xx). Nao precisa de milestone propria; validar junto do N-A. | — | absorvido |
| **N-E — Overview por permissao** (N18) | Cards do overview dirigidos por permissao do membro; gate nos DOIS lados (backend omite a chave do modulo negado, nunca `[]`; frontend so renderiza o card permitido). `useBalance`/`BalanceCards` habilitados/renderizados juntos por `vis.cashier` (evita saldo falso de R$0,00). `canSeeCost` removido do card de estoque — nao reintroduz granularidade fina. Reviewer: approved_with_notes, 2 achados low nao-bloqueantes (guard de metodo vs classe no controller; card pode mostrar "saudavel/livre" em vez de estado de acesso negado se a permissao mudar com o cache stale). | **complexa** (auth/permissoes/tenancy) + `reviewer` | ✅ concluido |
| **N-F — Caixa: errata em transacao de servico** (N6) | Correcao pelo Caixa DELEGA para o fluxo ja existente e testado do lado Servico (`CorrectServicePaymentUseCase`) em vez de duplicar logica de sync — endpoint generico do caixa continua recusando transacao de servico, so a UI roteia. `serviceId` exposto na listagem via JOIN (sem migration). Guard de estorno solto intocado. Reviewer: approved_with_notes apos 2 rodadas; achado medium residual documentado (ver abaixo). | **complexa** (caixa/dinheiro) + `database-guardian` (approved_with_notes) + `reviewer` (approved_with_notes) | ✅ concluido |
| **N-G — Caixa: estorno como categoria fixa + filtro** (N11, N10) | Estorno protegido e filtravel; nomes de categoria da org nos destinos de transferencia. | **complexa** (caixa/dinheiro; pode precisar migration) + `database-guardian` | pendente |
| **N-H — Exportacao por formato** (N9) | Seletor de formato (.csv/.xlsx) substituindo o de delimitador. | intermediaria | pendente |
| **N-I — Acesso ao overview do cliente** (N8) | Clique simples no nome + botao "Detalhes", mobile-first. | simples | pendente |
| **N-J — Pendencias do M7** (N16, N17) | Investigar a regra 18+ (por que nao dispara) e o renomear-arquivo-pos-upload. | intermediaria + `database-guardian` se tocar storage | pendente |
| **N-K — Observabilidade do backend** (N12) | Entender por que o Better Stack do backend nao logou o erro de N3 — so o front reportou. | intermediaria | pendente |

**N12** (observabilidade) esta na tabela mas nao no inventario de bugs por ser
infraestrutura: 13:48 — "Graçado que só tem front-end reportando... eu tenho que dar uma
olhada no BetterSec, entender porque o back-end não reportou o problema". **Ja explicado
pelo diagnostico do N-A**: o backend respondeu **200 com sucesso** nos dois casos — nao
havia erro nenhum para o backend logar. O defeito era 100% no cliente HTTP, e o
`captureError` do `apiRequest` so envia em status >= 500 ou falha de rede (ADR-0014,
`project_error_tracking`), entao o `SyntaxError` de parse nao caia em nenhum dos dois.
**Pendencia real remanescente**: erros de parse/contrato no cliente hoje passam
silenciosos na telemetria — vale capturar essa classe. Reclassificado como melhoria de
observabilidade, nao investigacao.

---

## Decisoes de produto e lancamento (documentar, sem codigo)

1. **Data de lancamento: 13/08/2026.** 15 dias com gordura deliberada — Paulo: "eu acho
   que em 5 a gente resolve, mas a gente precisa de uma gordurinha pra caso dê tudo
   errado". Fluxo: correcoes → ciclo de teste dos stakeholders → reuniao de conformidade
   legal/Stripe → lancamento.
2. **Stripe em producao exige conformidade legal.** Deixar explicito ao usuario final o
   que esta sendo assinado. Reuniao dedicada pendente. ADR-0018 (Tier 1) e `LEGAL_ENTITY`
   ja preenchidos (2026-07-31) com CNPJ 42.879.564/0001-96 (Joao Pedro Siqueira Perim) —
   **nota**: a reuniao mencionou apontar para o CNPJ da Ink House; confirmar com o Paulo
   se essa e de fato a entidade correta para a configuracao do Stripe antes da reuniao
   dedicada, ja que o CNPJ preenchido e diferente.
3. **Modelo de negocio**: o ASO e o **primeiro produto da AssessorInc**; a AssessorInc e o
   produto cobrado no Stripe. Novas ferramentas ⇒ aumento do valor do plano, com o Stripe
   gerenciando a transicao de quem ja assina (preocupacao do Ruan explicitamente
   resolvida por usar o Stripe: "quem já está assinando com o valor A, vai mudar para B a
   partir da próxima" cobranca).
4. **Migracao de dados da Ink House V1**: Paulo usa IA via MCP com acesso direto ao banco
   da V1 e reestrutura para o ASO. **Acao dos stakeholders**: criar a organizacao no ASO
   como usuarios finais (com acesso gratuito concedido por super_admin) e **enviar o slug
   ao Paulo**.
5. **Importacao para clientes novos**: manual (CSV/Excel repassados ao Paulo) no inicio.
   Automatizar depois — Paulo levantou "por que a gente não faz a criação com importação
   do CSV?" como necessidade futura, nao desta rodada.

## Visao de futuro (registrar, NAO planejar milestone)

- **Pagina/painel especifico para marketing** (JP, 41:35 — "uma anotação pro futuro").
  Ruan complementou com a ideia de uma "agendona".
- **Importacao automatizada de CSV/Excel** para cadastro em massa de clientes (item 5
  acima), quando o volume justificar.
- **Perifericos da AssessorInc em torno do ASO** (ferramentas de marketing, trafego pago).
  Ruan quer manter isso vivo apos o lancamento para justificar aumento de plano; ficou
  explicitamente no campo imaginativo — lancar o ASO primeiro, coletar feedback de outros
  estudios, lapidar, e so depois investir nos perifericos.

## Debito conhecido registrado no N-F (nao bloqueante, documentado)

- **Divergencia de data pre-preenchida na correcao de pagamento de servico**:
  `Service` (backend) so expoe `paymentTransactionId`, nao a data da transacao
  de pagamento. Por isso `services-page.tsx` pre-popula o form de correcao com
  `performedAt` (execucao do servico) e `cashier-page.tsx` usa `transactedAt`
  (data real do pagamento, correto). Diverge sempre que o servico e pago em dia
  diferente da execucao (fluxo "pagar depois") — nao e caso raro. Campo e
  editavel antes do submit, entao nao ha corrupcao silenciosa, so risco de UX
  se o usuario nao revisar. Corrigir de vez requer expor a data da transacao de
  pagamento no `Service` do backend (join com `transactions.transacted_at` via
  `paymentTransactionId`) — fora de escopo desta milestone. Documentado em
  JSDoc de `ServicePaymentCorrectionTarget.dateISO`.
- **Follow-up de indice** (achado do database-guardian, low, nao bloqueante):
  `services.payment_transaction_id` nao tem indice — a query nova de
  `serviceId` na listagem do caixa faz seq scan em `services` a cada chamada.
  Sugestao do guardian: `CREATE UNIQUE INDEX ... ON services(payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL` (resolve indice + garante a
  invariante 1:1 de uma vez) — precisa validar ausencia de duplicata em dado
  real antes de criar o unique index.

## Pendencias externas (fora do controle do codigo)

- ~~**`LEGAL_ENTITY` real**~~ — **preenchido em 2026-07-31.** Confirmar com o Paulo se o
  CNPJ usado (42.879.564/0001-96, Joao Pedro Siqueira Perim) e o mesmo que devera ser
  configurado no Stripe, ja que a reuniao mencionou "CNPJ da Ink House" (ver item 2 de
  "Decisoes de produto e lancamento" acima).
- **Hospedagem/dominio**: o trial expirou e o site caiu durante a reuniao; Paulo ia
  contratar (~R$30/mes). Ambiente de teste instavel invalida o ciclo de QA — resolver
  antes de pedir novo round de testes aos stakeholders.
- **Slug da organizacao da Ink House no ASO** — depende de Ruan/JP criarem a org.
- **Logo vetorizado + paleta** (pendencia herdada da reuniao de 10/07, item de branding).
