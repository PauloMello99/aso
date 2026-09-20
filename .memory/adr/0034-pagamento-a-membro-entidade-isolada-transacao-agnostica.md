# ADR-0034 — Pagamento a membro: `transactions` agnóstica + entidade de pagamento isolada e append-only

**Status:** Aceito
**Data:** 2026-09-16

## Contexto

Na reunião de **2026-09-15** (Paulo · Ruan · JP) ficou decidido que o ASO passa a ter um
fluxo de **pagamento real ao profissional**: um botão "Pagar" na tela do membro que cria
uma **saída (`outcome`) no caixa**, categorizada como pagamento de funcionário.

Isso **reverte** uma decisão anterior e é a principal armadilha de recall deste domínio
(ver seção "Reversões" abaixo).

O que já existia e **não** foi refeito:

- `org_member_commissions` (migration `0051`) — percentual/modo de comissão por
  `(org_id, user_id)`, com histórico imutável via `active` + `superseded_at`;
- snapshot de comissão desnormalizado em `services`
  (`commission_percent`/`commission_mode`/`commission_base_cents`/`commission_cents`);
- taxa de cartão por membro (`org_member_payment_fees`, migration `0070`);
- `commission-calculator.ts` e as categorias de transação do caixa.

O que **não** existia: qualquer vínculo entre uma transação do caixa e o **membro
beneficiário** do dinheiro. `transactions` tem `created_by` (quem *lançou*), `category_id`
e `fee_config_id` — nenhuma referência a beneficiário.

A pergunta em aberto era: onde mora a marcação *"esta transação é o pagamento do membro X"*?

## Decisão

### 1. `transactions` permanece AGNÓSTICA

`transactions` é **apenas um registro de movimentação de dinheiro**. **Nenhuma coluna de
membro/beneficiário é adicionada a `transactions`.**

Motivo: o caixa é um livro append-only genérico (ADR-0010). Acoplá-lo ao domínio de
membros faria toda evolução do domínio de membros passar por uma migration no caixa, e
abriria precedente para "só mais uma coluna" por cada domínio que movimenta dinheiro.

### 2. A marcação vive numa entidade própria, isolada, que referencia a transação

Uma entidade dedicada de **pagamento a membro** guarda o vínculo
`(organization_id, user_id beneficiário, transaction_id, valor em centavos, período,
descrição)`. A seta aponta **do domínio de membros para o caixa**, nunca o contrário.

RLS por organização, como todo o resto (ADR-0005). Leitura escopada por ator: owner vê
qualquer membro, funcionário vê **só a própria linha** — mesmo padrão de `resolveActor`
já usado em `get-balance` / `list-transactions` / `GetMemberCommissionsUseCase`.

### 3. A entidade de pagamento é APPEND-ONLY, espelhando o caixa

Decidido por Paulo em 2026-09-16, fechando uma ambiguidade que D8 deixava aberta.

O registro de pagamento **nunca sofre `UPDATE`/`DELETE`**. Uma correção é uma **linha de
reversão** apontando para a original, exatamente como o caixa faz com
`reverses_transaction_id` (ADR-0010, `correct-transaction.use-case`). "Estornado" é
**derivado** (existe uma linha que o reverte), nunca um campo mutável. Saldo devido =
agregação das linhas vivas.

Motivo: duas semânticas de correção diferentes no mesmo fluxo de dinheiro é exatamente o
tipo de inconsistência que o ADR-0010 existe para evitar; e a auditoria do lado da
entidade é preservada. O precedente interno é `org_member_commissions`
(`active` + `superseded_at`) e `billing_plan_prices` (ADR-0024).

### 4. REGRA FECHADA — toda alteração de pagamento ecoa no caixa

Se um registro de pagamento a membro for **apagado ou editado**, isso **DEVE gerar a
transação de estorno correspondente no caixa**, para que a correção reflita no saldo.
Editar = **estorno + relançamento na mesma ação**, seguindo `correct-transaction.use-case`.

**Não existe alteração de pagamento que fique só na entidade de pagamento sem eco no
caixa.** As duas escritas (transação do caixa + registro de pagamento) acontecem na
**mesma transação de banco**. Dinheiro sempre em **centavos inteiros**.

### 5. A tela do membro não lança nada sozinha

A tela de detalhe do membro é **exclusivamente de leitura**. O único caminho que cria
movimentação é o **clique explícito do owner** no botão "Pagar". Não existe saída
automática derivada do que a tela exibe.

O valor do form abre com o **saldo devido sugerido** (comissão acumulada no período −
já pago), **editável** — pagamento parcial continua livre.

## Reversões que este ADR registra

`docs/planning/2026-08-19-meeting-backlog.md`, item 3, diz literalmente:
*"**Nao criar** um fluxo de pagamento real ao profissional dentro do ASO nesta fatia."*

Esse item está **SUPERADO** desde 2026-09-15. Quem fizer recall vai encontrar o doc antigo
e tentar "corrigir" o escopo de volta — **não corrija**.

1. **(2026-09-15, revoga 2026-08-19)** Passa a existir fluxo de pagamento ao profissional
   dentro do ASO — botão "Pagar" → transação `outcome` no caixa.
2. **(2026-09-15)** O pagamento é **valor único agregado, NÃO vinculado a serviços
   específicos**, e a tela do funcionário é **exclusivamente de leitura**. Paulo assumiu
   conscientemente a perda de rastro serviço-a-serviço: *"a gente perde em auditoria… é só
   entrada e saída mesmo"*.

## Anti-escopo (debatido na call e descartado)

Não implementar, mesmo que a transcrição de 15/09 discuta:

- vincular pagamento a serviços específicos / abater serviço a serviço;
- saída automática no caixa disparada pela tela do funcionário;
- integração bancária ou com Mercado Pago para puxar extrato;
- notificação por WhatsApp (descartado; e-mail só);
- caixa/carteira própria por funcionário (saldo org ↔ funcionário).

## Addendum (2026-09-17) — `org_member_payments` (migration 0073)

Schema aplicado: `org_member_payments` segue o padrão **LEDGER** (como `transactions`),
não o padrão CONFIG (0051/0070) — sem `active`/`superseded_at`; "estornado" é
**derivado** (existe uma linha com `reverses_payment_id` apontando para a original).
`transaction_id` é `NOT NULL UNIQUE` (1 pagamento por transação); índice único parcial
em `reverses_payment_id WHERE NOT NULL` (no máximo 1 estorno por linha). Trigger
`BEFORE UPDATE` rejeita incondicionalmente (não há clamp — nada pode mudar depois de
inserido). RLS: `SELECT` é por organização inteira (qualquer membro pode ler qualquer
linha da própria org via RLS); a restrição "funcionário só vê a própria linha" é
**camada de aplicação** (`resolveActor`), não RLS — mesmo padrão de
`org_member_commissions`/`org_member_payment_fees`.

**Escopo de organização reforçado em banco**: `transaction_id` e `reverses_payment_id`
são FKs **compostas** com `org_id` (`(transaction_id, org_id) → transactions(id, org_id)`
e `(reverses_payment_id, org_id) → org_member_payments(id, org_id)`), não simples —
impede que uma org referencie transação/pagamento de outra org mesmo com um uuid
adivinhado.

**Decisão testada empiricamente: `transaction_id` é `ON DELETE RESTRICT`, e isso NÃO
bloqueia a exclusão de organização.** Verificado por teste real (não por teoria de
mecanismo): excluir uma org com transação + pagamento vinculados funciona, inclusive com
uma cadeia de reversão (pagamento original + estorno, ambos na mesma org). Alternativas
descartadas: `DEFERRABLE` (adiaria também a checagem do lado do INSERT, trocando
fail-fast por proteção contra um risco que não se confirmou); handling explícito no
`DeleteOrgUseCase` (o `DELETE` ali roda via `DRIZZLE`/`app_user`, e a tabela não tem
policy de DELETE — um `DELETE` explícito afetaria 0 linhas **silenciosamente** antes de
sequer chegar no FK, o que é pior que não fazer nada).

**Gotcha de processo**: nesta fatia, duas explicações de "por que o DELETE funciona apesar
do RESTRICT" circularam entre agentes e **as duas estavam erradas** (uma sobre ordem de
`oid` de trigger, outra sobre um FK de precedente que na verdade é `SET NULL`, não
`NO ACTION`). Nenhuma das duas está registrada aqui de propósito — o fato durável é só o
resultado do teste + a decisão, não o mecanismo interno do Postgres que ninguém confirmou
corretamente. Se este comportamento precisar ser reverificado no futuro, teste de novo
empiricamente; não reaproveite uma explicação de mecanismo de sessões anteriores.

## Addendum 2 (2026-09-18) — convenções fechadas durante os passos 6-13

**`findReversedIds(orgId)` é ORG-WIDE, deliberadamente sem filtro por `user_id`** —
espelha `drizzle-transaction.repository.ts:148`. `netPaidCents` também não filtra por
`user_id` no `NOT EXISTS` (só por `p.id`). As duas leituras precisam concordar sobre o
que é "estornado" usando a MESMA chave (o id do pagamento), não `user_id` — filtrar por
`user_id` em qualquer uma delas isoladamente criaria divergência entre a listagem e o
saldo devido. Defesa em profundidade real: o estorno **sempre copia** `userId` do
pagamento original (nunca aceita de input), garantido por `expectedUserId` obrigatório
nos use-cases de estorno/correção, validado contra `payment.userId` logo após o
`findById` — um `paymentId` de outro beneficiário é tratado como "não encontrado"
(`MemberPaymentNotFoundException`, 404), não como erro de autorização separado.

**Status HTTP do estorno segue a distinção já estabelecida pelo caixa (ADR-0010):**
alvo que JÁ é ele mesmo um estorno (`reversesPaymentId != null`) ⇒ **422**
(`MemberPaymentNotReversibleException`, "não existe desestornar"); alvo que JÁ TEM um
estorno apontando pra ele (segundo estorno) ⇒ **409**
(`MemberPaymentAlreadyReversedException`). Mesma taxonomia de
`TransactionNotReversibleException`/`TransactionAlreadyReversedException`.

**`paymentMethod` do pagamento é exposto em `GET .../payments` sem entrar na entidade**
— vem de um `innerJoin` com `transactions` no repositório, devolvido como campo irmão
de `entity` no shape de retorno (`{ entity, reversed, paymentMethod }`), nunca como
coluna de `org_member_payments`. Necessário para a UI de "corrigir pagamento" saber o
método real (senão o relançamento nasceria sempre com um método arbitrário, deslocando
o valor entre os buckets físico/digital do caixa). `innerJoin` (não `left`) é seguro
porque a policy de `SELECT` de `transactions` e de `org_member_payments` usam o MESMO
predicado org-wide — não há gap de visibilidade entre as duas tabelas.

## Consequências

- O caixa continua um livro genérico; o domínio de membros evolui sem tocar em
  `transactions`.
- O saldo devido do membro é **derivável** (comissão acumulada − soma dos pagamentos
  vivos), o que viabiliza o valor sugerido do botão "Pagar" (D5). Sem a entidade não
  haveria como saber o que já foi pago.
- Custo: toda leitura de "quanto já paguei ao membro X" é um join a mais. Aceito.
- Correção de pagamento é mais verbosa (duas linhas + duas transações de caixa) do que um
  `UPDATE`, em troca de auditabilidade e de uma única semântica de correção no stack.
