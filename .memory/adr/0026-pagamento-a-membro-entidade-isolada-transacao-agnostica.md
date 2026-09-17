# ADR-0026 — Pagamento a membro: `transactions` agnóstica + entidade de pagamento isolada e append-only

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

## Consequências

- O caixa continua um livro genérico; o domínio de membros evolui sem tocar em
  `transactions`.
- O saldo devido do membro é **derivável** (comissão acumulada − soma dos pagamentos
  vivos), o que viabiliza o valor sugerido do botão "Pagar" (D5). Sem a entidade não
  haveria como saber o que já foi pago.
- Custo: toda leitura de "quanto já paguei ao membro X" é um join a mais. Aceito.
- Correção de pagamento é mais verbosa (duas linhas + duas transações de caixa) do que um
  `UPDATE`, em troca de auditabilidade e de uma única semântica de correção no stack.
