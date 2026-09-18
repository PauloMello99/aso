# ADR-0027 — Taxa de cartão de crédito parcelado: `installments` como atributo, sem fallback entre faixas

**Status:** Aceito
**Data:** 2026-09-18

## Contexto

Na reunião de **2026-09-15** (Paulo · Ruan · JP) ficou decidido que a taxa de cartão de
crédito cobrada pela maquininha/adquirente **varia pelo número de parcelas** — hoje o
ASO só modela uma taxa única por método de pagamento
(`org_payment_fees`/`org_member_payment_fees`, migration `0070`), sem distinguir à vista
de parcelado.

## Decisão

### 1. Parcelamento é um ATRIBUTO, não um método novo nem um catálogo de condições

`installments` (`smallint`) foi adicionado a 4 tabelas — não um valor novo de
`payment_method`, nem um "catálogo de condições" genérico. Duas alternativas foram
descartadas deliberadamente:

- **Enum novo de método** (ex.: `credit_card_6x`): rejeitado porque rollback exigiria
  `UPDATE` em linhas do livro append-only (`transactions`), violando o ADR-0010.
- **Catálogo de condições genérico** (tabela `payment_conditions` desacoplada):
  rejeitado por ser abstração cara e prematura logo após a migration `0070` ter acabado
  de estabelecer o modelo atual — sem demanda concreta além de parcelamento.

Parcelamento **só existe para `payment_method = 'credit_card'`** — imposto por CHECK em
todas as 4 tabelas (`org_payment_fees`, `org_member_payment_fees`, `transactions`,
`services`).

- Nas tabelas de **CONFIG** (`org_payment_fees`, `org_member_payment_fees`):
  `installments smallint NOT NULL DEFAULT 1`. Chave composta:
  `(org_id, payment_method, installments)` e
  `(org_id, user_id, payment_method, installments)` respectivamente (a de membro,
  parcial `WHERE active`).
- Nas tabelas de **NEGÓCIO** (`transactions`, `services`): `installments smallint`
  NULLABLE, sem default — `NULL` cobre 3 significados distintos e nunca é ambíguo na
  prática porque cada um se resolve por outro dado da mesma linha: **(a)** método sem
  parcelamento (`cash`/`bank_transfer`/`debit_card`); **(b)** linha anterior à migration
  `0074` (legado); **(c)** perna de ESTORNO de um lançamento em crédito
  (`reverses_transaction_id IS NOT NULL`) — estorno não é nova cobrança, não carrega
  faixa.

Migration `0074_installment_payment_fees`. Teto oferecido na UI: constante de produto
`MAX_INSTALLMENTS = 12` (mais estrito que o CHECK do banco, que permite até 24 —
barato de elevar depois sem migration nova).

### 2. SEM fallback entre faixas — faixa sem config cobra taxa ZERO

Se o owner configurar 1x e 6x mas deixar 2x–5x/7x–12x em branco, lançar em 3x cobra
**0%** — nunca cai silenciosamente na taxa de 1x. Decisão deliberada para evitar dois
riscos piores: inflar a comissão do funcionário em modo `net` (taxa maior reduz
comissão) e subfaturar o estúdio.

**Mitigação: invariante de UI, não fallback de backend.** A tela de config da ORG
(`payment-fees-form.tsx`) sempre submete as 13 linhas configuráveis (12 faixas de
crédito + 1 débito) a cada save, mesmo as deixadas em branco (viram `percent:"0"`).
Nenhuma faixa fica "sem linha" depois do primeiro save. O backend **não tem guarda**
contra esse buraco além dessa invariante de UI — aceito conscientemente (registrado
pelo `database-guardian` no gate do passo 15, severidade medium).

A config **por membro** segue outra regra, também deliberada: envia só **deltas**
(linhas efetivamente tocadas), não a matriz completa de 13 linhas — arquitetura decidida
no passo 8 (elevou `ArrayMaxSize` de 200→2000) exatamente porque, ao contrário da tela da
ORG, a ausência de override por membro já tem fallback correto e testado (cai na taxa da
ORG para aquela faixa), então omitir uma faixa não configurada é seguro.

### 3. Correção de lançamento com mudança de faixa honra a taxa do MEMBRO

Achado HIGH do gate do `database-guardian` (passo 15): `create-transaction.use-case.ts`
forçava `feeUserId = null` em toda correção, então corrigir 6x→1x (o próprio critério de
aceitação do bloco) sempre reprecificava pela taxa da ORG, ignorando um eventual
override do membro para a faixa nova — divergente de
`correct-service-payment.use-case.ts`, que já resolvia pelo membro.

**Decisão do usuário: a correção deve considerar a taxa do MEMBRO**, alinhando os dois
caminhos. Fix: `feeUserId = createdBy` (em vez de `null`) no ramo de correção; quando
`createdBy` não resolve a um membro válido (linha legada com `auth.users.id`
pré-2026-09-02), o lookup retorna `null` e cai na taxa da ORG naturalmente — sem
tratamento de erro novo.

**Escopo da convergência**: os dois caminhos convergem em **honrar a taxa do MEMBRO**
antes da ORG. Eles NÃO convergem em reuso-vs-reprecificação: `create-transaction`
reusa o snapshot da taxa quando método E faixa não mudam;
`correct-service-payment.use-case.ts` sempre reprecifica pela config vigente,
independente de método/faixa terem mudado — comportamento PRÉ-EXISTENTE a este bloco
(comentário original do arquivo já dizia "reconsulta a config de taxa vigente, sem
preservar snapshot de fee"), não uma divergência introduzida ou deixada aqui. Achado
`low` do `reviewer` no gate do passo 22, registrado para decisão futura, não corrigido
neste bloco.

### 4. `services` e `transactions` ganham `installments` por motivo FUNCIONAL, não só auditoria

Achado do `planner` além do levantamento original:

- **`services`**: `register-payment.use-case.ts` resolve a taxa **no momento do
  pagamento**, lendo `service.paymentMethod`. Sem persistir a faixa em `services` no
  momento da CRIAÇÃO (mesmo pendente), um serviço vendido em 6x e pago depois seria
  cobrado na taxa de à vista — bug funcional real, não só perda de rastro. Verificado em
  produção real nesta sessão: serviço criado pendente em 5x, pago depois, gerou
  `fee_cents = 0` (taxa de 5x da org, deliberadamente não configurada) em vez de
  `R$ 42,50` (taxa de 1x) — confirma que NÃO caiu no fallback errado.
- **`transactions`**: `correct-transaction.use-case.ts` decidia reusar o snapshot de
  taxa do lançamento original comparando só `paymentMethod`. Com parcelas na chave da
  taxa, essa igualdade deixa de significar "mesma taxa" — corrigir um 6x para 1x (ou
  vice-versa) precisa reprecificar, não reusar o snapshot antigo.

### 5. UX: tabela de 12 faixas, não uma tela por faixa

Gate de `design` (agente indisponível nesta sessão outra vez, como no Bloco 2 — spec
escrita no thread principal). Decisão: reaproveitar a estrutura de card/input já
existente (`payment-fees-form.tsx`), só que `credit_card` vira uma **tabela compacta de
12 linhas** (Parcelas | Percentual | Valor fixo) em vez de 1 linha; `debit_card`
continua 1 linha, sem seletor de parcelas (installments sempre 1, nunca editável). Mesmo
padrão de tabela dentro do diálogo por-membro já existente em `member-list.tsx` — evita
explosão de UX em grade N-membros × 13-combinações porque o diálogo continua abrindo 1
membro por vez, como antes.

## Anti-escopo (debatido/mencionado, descartado)

- Filtro de listagem por faixa de parcelas, ou coluna de parcelas no export
  CSV/XLSX — decisão explícita do passo 21 ("Q4 do levantamento sem resposta"), só
  exibição read-only nas listagens (extrato do caixa, extrato do cliente, detalhe de
  serviço).
- Mudança em `incomeByPaymentMethod`/gráficos por método — crédito continua **uma série
  só**, independente da faixa (nenhuma agregação por parcela).
- Repasse da taxa ao cliente (quem absorve a taxa continua sendo o estúdio, default
  atual, sem mudança).

## Achados fora de escopo, registrados mas não corrigidos neste bloco

- **Bug pré-existente do Bloco 2, achado e corrigido durante a verificação deste
  bloco**: nenhum item do menu kebab de `member-list.tsx` (Permissões/Comissão/Taxas de
  cartão/Classificação/etc.) funcionava por clique — o evento sintético do React
  borbulhava pela árvore de COMPONENTES (não pelo DOM do Portal do Radix) até o
  `onClick` da linha inteira do membro, navegando para a página de detalhe em vez de
  abrir o diálogo da ação. O trigger do kebab já tinha `stopPropagation()`; nenhum
  `DropdownMenuItem` tinha. Corrigido (adicionado `stopPropagation()` nos 7 itens do
  menu — o de "Permissões" só existe quando `member.role === "employee"`) e
  validado — sem essa correção, o diálogo de taxa por membro deste bloco (passo 19)
  seria inalcançável na prática.
- **Achado NÃO corrigido, registrado para o backlog**: em viewport de 375px, o botão
  kebab da linha de membro fica fora da área visível (`x=464` com viewport de 375px) —
  a linha não encolhe nome+badges o suficiente. Pré-existente do Bloco 2 (a linha do
  membro não foi tocada neste bloco, só o conteúdo do diálogo). Torna o menu de ações —
  e por consequência a tela de taxa por membro — inacessível no mobile.

## Consequências

- Owner e por-membro definem e recuperam, separadamente, taxa de à vista e de cada
  faixa de parcelamento.
- Serviço pendente parcelado, pago depois, é cobrado na taxa da faixa correta —
  verificado em produção real, não só em teste unitário.
- Corrigir a faixa de um lançamento/pagamento reprecifica corretamente, honrando
  overrides de membro nos dois fluxos (caixa e serviço) de forma consistente.
- Custo aceito: faixa sem config cobra zero (mitigado só por invariante de UI, não por
  guarda de backend) — decisão deliberada, não lacuna.
- Contrato HTTP mudou (campo `installments` obrigatório nos DTOs de config de taxa) —
  backend e frontend deste bloco foram ao ar juntos, nunca promovidos isolados.
