# Backlog da reuniao de 18-19/08/2026 — comissao por profissional, auto-cadastro e migracao Ink House

> Fonte: `meeting_transcription.md` (32 min) e `meeting_summary.md` (resumo do Fathom) —
> arquivos **untracked** na raiz do repo, deliberadamente **nao commitados**: contem nomes
> completos, e-mail pessoal do Paulo e link de compartilhamento do Fathom. Mesmo criterio
> das reunioes anteriores (10/07, 29/07).
> Participantes: Paulo (dev), Ruan (stakeholder), Joao Pedro / "jp perim" (stakeholder).
>
> **CONTEXTO**: reuniao curta e informal (impromptu), pos-lancamento do ciclo N-A..N-K
> (backlog de 29/07, ja fechado). Sistema ja esta em producao/staging com a organizacao
> Ink House e um segundo cliente (Ge) usando. Foco: preparar o **Ink Day em 12-13/09/2026**
> (migracao de dados + comissao de artistas) e fechar um bug de permissao encontrado no
> teste do Ruan.

---

## Como retomar (leia isto primeiro)

1. **Protocolo de execucao**: cada milestone segue a skill `development-workflow` — classificar
   risco → menor fluxo de agentes suficiente (`locator` → `planner` se complexa →
   `implementer` → `tester` → `database-guardian` se tocar schema/migration → `reviewer` se
   complexa/alto risco). As milestones abaixo ja vem pre-classificadas.
2. **Branches e merges**: uma branch por milestone a partir de `development`, PR para
   `development`, merge quando o CI estiver verde.
3. **Validacao padrao**: `pnpm check-types` + `pnpm lint` + `pnpm test` + build direcionado.
4. **Testes obrigatorios em toda entrega** cobrindo a regra de negocio nova.
5. **Prazo real**: Ink Day em **12-13/09/2026**. Paulo indisponivel **03/09 a 10/09** (lua de
   mel) — tudo que depende dele precisa fechar **antes de 03/09** ou esperar volta em 10/09,
   com pouca folga ate o Ink Day.

---

## 🐛 Bug reportado — Caixa visivel sem permissao (P-BUG-1)

**Relato (20:00–21:57 da transcricao)**: Ruan, logado como **funcionario** na org do Ge, viu
a aba **Caixa** disponivel na sidebar mesmo com o modulo `cashier` **desabilitado** nas
permissoes daquele membership. Ao clicar, os dados apareciam **zerados** (nenhuma
movimentacao) — ou seja, o backend bloqueou corretamente, so o frontend errou.

### Causa-raiz diagnosticada (nesta sessao, leitura de codigo — nao reproduzido em runtime ainda)

`apps/frontend/src/features/dashboard/components/layouts/org-layout.tsx:77-83`:

```ts
const org: OrgSummary | undefined = React.useMemo(() => {
  const base = listOrg ?? resolvedOrg ?? undefined;
  if (base && isSuper && base.role !== "owner") {
    return { ...base, role: "owner" as const }; // <-- forca role="owner" no client
  }
  return base;
}, [listOrg, resolvedOrg, isSuper]);
```

`isSuper = me?.platformRole === "super_admin"`. **Ruan e Joao Pedro sao `super_admin` da
plataforma** (donos da Ink House). A regra de produto "super_admin age como owner em
QUALQUER org" (`.memory/domain-rules.md`, ADR/regra 2026-06-29) foi implementada sobrescrevendo
`org.role` para `"owner"` **incondicionalmente** quando `isSuper` — inclusive quando o
super_admin tem uma **membership real e legitima de `employee`** naquela org (o caso exato do
teste do Ruan: ele foi cadastrado como funcionario na org do Ge).

Essa `org.role="owner"` forcada alimenta `org-sidebar.tsx:98`
(`canAccessModule(org.role, org.permissions, item.module)`), e `canAccessModule` retorna
`true` para qualquer modulo quando `role==="owner"` (`nav.ts:27-34`), **ignorando
`org.permissions`** — daí a aba aparecer mesmo desabilitada. O backend (`OrgModuleGuard`)
usa a role/membership **real** da sessão, não o override client-side, por isso os dados vêm
zerados: dois lados divergentes, sintoma exatamente como descrito.

**Nao afeta funcionarios comuns** (sem `platform_role=super_admin`): para eles `isSuper=false`
e o `role` usado é o real, então `canAccessModule` respeita as permissões normalmente. O bug
só se manifesta quando a mesma conta acumula `super_admin` (plataforma) **e** `employee` real
em uma org — hoje é o caso do Ruan/JP em orgs de terceiros, mas pode voltar a acontecer sempre
que a equipe testar o sistema "vestindo a camisa" de funcionário.

### Decisão (2026-08-19, confirmada pelo Paulo)

**A regra é: se não há acesso à feature, não deve haver acesso à rota.** Ou seja, leitura
**(a)**: a role/permissão **real** da membership manda sempre que existir uma membership real
na org — `super_admin` só vira "owner" honorário (via `actingAsAdmin`) quando **não** tem
membership própria naquela org (acesso administrativo puro a org alheia). Quando o super_admin
**é** de fato `employee` daquela org, a UI deve navegar/gatear exatamente como para qualquer
outro funcionário — nada de mostrar rota/aba que a permissão real nega, mesmo que os dados
venham zerados. Não é só "ajustar a comunicação" (banner) — é remover o acesso mesmo.

**Implicação de escopo**: o fix é em `org-layout.tsx:77-83` — o override de `role="owner"`
só deve acontecer quando `!isRealOwner && base` **e não há membership real** (hoje o código já
computa `actingAsAdmin = isSuper && !isRealOwner`, mas isso confunde "sem membership" com "tem
membership de employee" — os dois caem no mesmo branch hoje). Precisa diferenciar os 3 casos:
`isRealOwner` (role real = owner) → sem override; **tem membership real de employee** → NÃO
fazer override, usar a role/permissões reais (nav some, rotas 403); **sem membership nenhuma**
(caso `resolvedOrg`, org alheia acessada via `/admin`) → mantém o override para "owner" (acesso
administrativo). Checar também se existe lógica equivalente client-side em outros pontos que
leem `isSuper` para decidir visibilidade (ex. `isOwnerOnlyPath`, guard de rota) — mapear no
`locator`.

- **Risco**: intermediária/complexa — mexe em auth/permissões (`OrgLayout`, `canAccessModule`)
  → tratar como complexa por regra do CLAUDE.md ("banco, RLS/tenancy, auth... elevar mesmo se
  pequena"), mas o backend já está correto (não precisa mudar).
- **Fluxo sugerido**: `locator` (mapear todo lugar que lê `me.platformRole`/`isSuper` para
  decidir role/visibilidade efetiva no front) → `planner` → `frontend-implementer` → `tester`
  (cobrir os 3 casos: owner real, super_admin sem membership, super_admin com membership
  employee restrita) → `reviewer`.

---

## 🎯 Feature nova — Comissao/repasse por profissional (P-1)

**Pedido** (0:09–7:57 da transcricao): quando um servico e lancado, o sistema deve calcular
**quanto e do estudio e quanto e do profissional** que executou o servico, com base numa
**porcentagem configuravel por profissional** (nao por servico), definida pelo **owner**.

### Regras de negocio fechadas na reuniao

1. **Configuracao por profissional** (nao por servico/tipo de servico): o owner define, para
   cada membro da org, o percentual de repasse. Analogo ao padrao ja existente de
   `org_payment_fees` (config exclusiva do owner).
2. **Ordem de calculo configuravel** — mesma logica de 3 opcoes ja usada para taxa de cartao:
   - repasse calculado **sobre o valor bruto** (antes da taxa de cartao), estudio absorve 100%
     da taxa;
   - repasse calculado **sobre o valor liquido** (depois da taxa de cartao), a taxa e "dividida"
     proporcionalmente entre estudio e profissional;
   - **configuravel pelo owner, POR PROFISSIONAL** (confirmado 2026-08-19 — não é uma única
     config por org como as taxas de cartão; cada profissional pode ter seu próprio modo de
     cálculo). Exemplo usado na call: servico de R$1.000 no cartao → R$950 liquido (taxa R$50);
     com repasse 50/50 **pos-taxa**: R$475 para cada lado. Pre-taxa seria diferente.
3. **Responsabilidade do sistema é só mostrar valores — nao mover dinheiro.** Mesmo principio
   ja vigente no Caixa ("a gente não movimenta dinheiro, a gente só faz referência ao
   registro"). **Nao criar** um fluxo de pagamento real ao profissional dentro do ASO nesta
   fatia.
4. **Vinculo obrigatorio com o servico**: a transacao ja tem `performed_by` (quem executou);
   o repasse deve ser calculado **sobre a transacao de pagamento do servico**, reaproveitando
   `computeNet`/o padrao de `fee-calculator.ts` do modulo `cashier` (ver
   `.memory/domain-rules.md` secao "Caixa & Financeiro").
5. **Duas telas de visualizacao**:
   - **Profissional**: quanto ele **movimentou** (faturamento gerado para o estudio) e quanto
     é **líquido dele** no período — não necessariamente "quanto falta receber". Racional
     explícito do Ruan: mostrar o próprio impacto/faturamento estimula o controle do
     lançamento pelo funcionário (efeito colateral positivo de adoção, não só de folha).
   - **Owner**: ve e gerencia a porcentagem por funcionario, e ve o total gerado × repassado
     por profissional (mesmo espírito do relatório de custo/margem — RPT-3 — já existente).
6. **Fora de escopo nesta fatia** (levantado pelo JP, resolvido por decisão de simplicidade):
   **não** criar um "check de pagamento confirmado" pelo owner (marcar se de fato pagou o
   funcionário). Ficou definido que o sistema só registra/exibe o **valor de referência**,
   igual já faz o Caixa hoje — não persegue o dinheiro fora do sistema. Se isso mudar de ideia
   depois, é aditivo (nova coluna/flag), não bloqueia esta fatia.
7. **Prazo apertado**: Ruan pediu explicitamente que esta feature esteja pronta **antes do Ink
   Day (12-13/09)** para testar "ao vivo".

### Decisão (2026-08-19, confirmada pelo Paulo)

**Snapshot no momento da criação do serviço, com histórico rastreável, escopado por org.**
Confirma exatamente a leitura recomendada nesta seção:

- **Tracking/histórico**: se a porcentagem mudar depois, os **serviços já criados antes da
  mudança** devem continuar vinculados à porcentagem **vigente no momento em que o serviço foi
  criado** — não à porcentagem atual. Implica **tabela própria com histórico** (não uma coluna
  simples sobrescrita em `org_memberships`), no mesmo espírito de imutabilidade já usado em
  `anamnesis_form_versions`/`billing_plan_prices` (nunca apagar, só desativar/superseder) — e o
  `service`/transação de pagamento guarda uma referência (snapshot) à porcentagem vigente à
  época, não um FK "vivo" que mudaria de valor retroativamente.
- **Escopo por org**: a configuração de percentual por profissional é **por organização** —
  "cada lugar tem sua própria configuração". Ou seja, o percentual vive associado a
  `(org_id, member_id)`, e mudanças em uma org não afetam a configuração/histórico de outra
  (o que já é natural dado que `org_memberships` é por org, mas fica explícito: não modelar
  como preferência global do usuário).

- **Pré-taxa vs. pós-taxa é config POR PROFISSIONAL dentro da org** (2026-08-19, confirmado) —
  não por org. Ou seja, cada linha de configuração de comissão (`org_id`, `member_id`,
  percentual) carrega também o próprio modo de cálculo (pré ou pós-taxa), diferente de
  `org_payment_fees` (que é só por org/método). Um mesmo estúdio pode ter um profissional cuja
  comissão é calculada sobre o bruto e outro sobre o líquido. Isso também precisa entrar no
  **snapshot** por serviço: o registro histórico do serviço guarda não só o percentual vigente,
  mas também o modo (pré/pós) vigente à época, pelos mesmos motivos de auditoria.

Com isso, **todos os pontos de P-1 estão resolvidos** — pronto para `planner`.

- **Risco**: **complexa** (dinheiro/caixa, novo dado sensível, cálculo derivado de
  `org_payment_fees`, tabela com histórico) → `locator` → `planner` → `database-guardian`
  (nova tabela + RLS owner-write) → `backend-implementer` → `frontend-implementer` → `tester`
  → `reviewer`.

---

## 🎯 Feature nova — Auto-cadastro do cliente junto com a ficha de anamnese (P-2)

**Pedido** (22:19–29:00 da transcricao): hoje a ficha de anamnese só pode ser enviada para um
cliente **já cadastrado** (pré-requisito do M10b — `.memory/domain-rules.md`, "Gatilho do envio
é ação manual do owner/funcionário"). Isso obriga o tatuador a coletar ~300 dados do cliente
manualmente antes de poder mandar a ficha. Decisão da reunião: **terceirizar esse cadastro
para o próprio cliente** — o profissional gera um link de auto-cadastro; o cliente preenche
seus próprios dados **e** a ficha de anamnese numa única jornada; o cadastro do cliente é
criado automaticamente no ASO, já vinculado à resposta da ficha.

### Fluxo acordado — CORRIGIDO (2026-08-19, decisão do Paulo)

**A ação NÃO deve ficar no sheet/formulário de lançamento de serviço.** A pré-condição do
sistema continua valendo — não é possível lançar um serviço sem cliente já cadastrado e
selecionado — mas isso não significa que o _gatilho_ do auto-cadastro deva morar ali. A
transcrição sugeria (27:45–29:00) um botão dentro do lançamento de serviço; **essa leitura foi
descartada**: o cliente **já deve existir** antes de qualquer lançamento, então a ação de
criar/atualizar cadastro é responsabilidade do **módulo de Clientes**, não do módulo de
Serviços.

Isso implica **3 cenários distintos** a suportar no módulo de Clientes (não 1):

1. **Criar cliente já preenchendo a ficha** — equivalente ao pedido original da reunião: o
   profissional gera um link de auto-cadastro (sem `customerId` prévio) que, ao ser
   preenchido, cria o `customer` **e** grava a resposta da ficha de anamnese numa única
   submissão. Cobre o caso "cliente novo, sem cadastro nenhum".
2. **Enviar a ficha (atual) para cliente já cadastrado** — fluxo que **já existe** (M10b): o
   profissional seleciona um cliente existente e dispara o convite de anamnese normal. Não
   muda nada aqui, só entra no mesmo agrupamento de cenários por completude.
3. **Enviar ficha de atualização para cliente já cadastrado** — cenário **novo**: quando a
   ficha vigente do tipo de serviço muda de versão (ADR-0020 já cobre a obrigatoriedade de
   repreenchimento) ou quando o cadastro do cliente precisa ser **atualizado** (endereço,
   telefone, e-mail — pense na migração da Ink House V1, que vai trazer clientes com dados
   antigos), o profissional dispara um convite que **reaproveita o `customerId` existente**
   mas leva o cliente a **revisar/atualizar seus próprios dados cadastrais**, não só responder
   perguntas de saúde. Precisa decidir se isso é uma variação do form de anamnese (adicionar
   seção de dados cadastrais no link já existente) ou um link separado "atualizar cadastro".

Os cenários 1 e 3 são os que exigem trabalho novo; o cenário 2 é o `status quo`, mantido como
está.

### Como isso se encaixa no que já existe (M10b, ADR-0020)

A infraestrutura de link público sem login **já existe** para a ficha de anamnese
(`public/anamnesis-responses/:token` + `:token/submit`, `DRIZZLE_ADMIN` restrito a
`findByToken`/`markSubmitted`, minimização de PII, throttle apertado no submit). O gap é que
hoje esse fluxo **exige um `customerId` pré-existente** para gerar o token (a ficha vincula a
um cliente já cadastrado). P-2 precisa de uma variante do fluxo onde:

- o token de convite carrega os **dados necessários para criar o cliente** (org, tipo de
  serviço) mas **ainda não tem `customer_id`**;
- no submit, o backend faz **criar customer + gravar resposta de anamnese** numa única
  transação (mesmo padrão de atomicidade já usado no sign-up — `SignUpUseCase`, saga com
  compensação — e na criação serviço→transação);
- o e-mail do cliente usado no formulário público vira o dado de contato do `customer` criado.

### Ponto de risco discutido na própria reunião (endereçar no design)

O grupo debateu e **decidiu não resolver agora** um caso de borda: cliente preenche com um
e-mail na primeira vez e outro depois → duplicidade de cadastro (mesmo problema que o fluxo
atual por e-mail solto já tinha, então não é regressão). Ficou definido que a mitigação é
**educação de uso** (o profissional só reenvia com o mesmo contato), não uma feature de
merge/dedupe de cliente nesta fatia. **Não implementar** lógica de merge automático de clientes
por e-mail/telefone parecido — fora de escopo, decisão explícita.

### Cenário 1 — fluxo de disparo (2026-08-19, confirmado)

O `serviceTypeId` é escolhido **no momento em que a ação de auto-cadastro é acionada**, dentro
do módulo de Clientes: o profissional informa **e-mail do cliente + tipo de serviço**, e o
sistema envia o link de auto-cadastro já carregando a ficha de anamnese correta daquele tipo
(ADR-0020, ficha é por `service_type_id`). Não é um link genérico — é gerado por
(org, e-mail informado, tipo de serviço).

**Validação obrigatória antes de gerar o convite**: checar se aquele e-mail **já corresponde a
um `customer` existente naquela org**. Se existir, o fluxo não deve seguir pelo caminho de
auto-cadastro (cenário 1) — o profissional já tem um cliente casando com esse e-mail e deveria
usar o cenário 2 (enviar ficha para cliente já cadastrado) ou 3 (atualização). Bloquear/avisar
na hora de gerar o link evita o mesmo problema de duplicidade por e-mail que a reunião já tinha
descartado resolver via merge automático — aqui dá para **prevenir na entrada**, que é mais
barato que resolver depois. Reaproveita `assertEmailNotDuplicated`/checagem equivalente já
usada no cadastro manual de cliente (`customers` module).

### Reaproveitamento entre os 3 cenários — decisão de design (a critério desta sessão)

O Paulo deixou a critério da implementação decidir se os cenários compartilham a mesma "ficha".
Decisão: **não reaproveitar o mesmo link/endpoint para os 3** — são propósitos diferentes:

- **Cenário 1 (criar cliente + ficha)**: precisa de um recurso público **novo**
  (`public/customer-registrations/:token`) porque ainda não existe `customer_id` — o submit
  cria `customer` e `anamnesis_response` na mesma transação (atomicidade, mesmo padrão do
  sign-up). Carrega e-mail (pré-preenchido, do convite) + tipo de serviço já resolvido.
- **Cenário 2 (enviar ficha a cliente já cadastrado)**: **inalterado**, usa o endpoint público
  de anamnese já existente do M10b (`public/anamnesis-responses/:token`).
- **Cenário 3 (ficha de atualização cadastral)**: é sobre **atualizar os dados do `customer`**
  (endereço/telefone/e-mail), não sobre responder perguntas de saúde — propósito diferente do
  M10b. Recomendo um terceiro recurso público dedicado (`public/customer-updates/:token`) que
  atualiza só os campos núcleo de `customers`, reaproveitando o **padrão** de segurança do M10b
  (token 256-bit, `DRIZZLE_ADMIN` restrito, minimização de PII, throttle apertado) mas sem
  acoplar ao módulo de anamnese — dessa forma o cenário 3 pode ser disparado mesmo para clientes
  cujo tipo de serviço não tem ficha de anamnese configurada.

Justificativa de não unificar: os 3 têm gatilhos, dados de entrada e efeitos colaterais
diferentes; forçar um único endpoint parametrizado ("com ou sem customerId", "com ou sem
anamnese") tende a acumular condicionais frágeis num único ponto de escrita pública — o tipo
de superfície mais sensível do app. Três recursos pequenos e coesos são mais fáceis de auditar
e testar isoladamente que um genérico.

### UI dos 3 cenários no módulo de Clientes

Hoje a lista de clientes só tem "Novo cliente" (cadastro manual). Precisa virar um menu/ação
com as 3 opções (criar+ficha via link, enviar ficha a cliente existente, enviar atualização a
cliente existente) — desenho de tela a definir com o `design` antes do `frontend-implementer`,
já que é tela/fluxo novo.

Com os pontos de negócio resolvidos, **P-2 está pronto para `locator`/`design`/`planner`** —
não há mais pendência bloqueante de decisão de produto.

- **Risco**: **complexa** (dois endpoints novos de escrita pública, cria dado de cliente sem
  sessão, precisa de atomicidade entre módulos `customers` e `anamnesis` no cenário 1, tela
  nova) → `locator` (mapear M10a/b/c a fundo) → `design` (tela/fluxo novo no módulo de
  Clientes) → `planner` → `database-guardian` → `backend-implementer` → `frontend-implementer`
  → `tester` → `reviewer`.

---

## 🚚 Migracao de dados — Ink House V1 → ASO (P-3, operacional + suporte tecnico)

**Objetivo**: migrar a Ink House (sistema V1 legado) para o ASO a tempo do Ink Day
(12-13/09/2026).

### Plano acordado

1. **Teste de "dupla entrada"** (responsabilidade do Ruan, iniciar já): todo lançamento feito
   na Ink House V1 também é replicado manualmente no ASO (org de teste/staging), para provar
   que o ASO reproduz 100% do que a V1 faz hoje. Se não houver disparidade, valida a migração.
2. **Corte em dia de baixo volume** (ex.: meia-noite): nesse momento, todos os dados da V1 são
   importados para o ASO. A partir daí, o ASO vira a **única fonte de verdade**.
3. **V1 vira somente-consulta**: não desligar/inutilizar o sistema, apenas deixar um **aviso
   visível** de que é somente para consulta histórica, sem novos lançamentos.

### Decisão (2026-08-19, confirmada pelo Paulo) — sinalização de "cadastro desatualizado" REMOVIDA do escopo do ASO

O item 4 do plano original ("perfis importados marcados como desatualizados, com aviso no
ASO") **foi descartado**: essa sinalização é uma **adição ao sistema legado (V1)**, não ao
ASO — não condiz com o produto atual. **Nenhuma coluna/flag/banner novo em `customers` do ASO
para este propósito.** Se a Ink House quiser esse aviso, é trabalho no V1 (fora do repositório
`ink-ops`), não uma tarefa deste backlog. O que sobrevive é a atualização de fato do cadastro
via o **cenário 3 do P-2** (ficha de atualização enviada a cliente já existente) — mecanismo
genérico do produto, não uma flag específica de dado importado da migração.

### Trabalho técnico associado (Paulo, via acesso direto aos dois bancos)

- Script de migração/reestruturação de dados V1 → schema do ASO (não é feature de produto —
  é ETL pontual, fora do escopo do backlog de milestones normal). Já mencionado como "uso de
  IA via MCP com acesso direto ao banco da V1" em decisões anteriores (29/07).

- **Ação do Ruan/JP**: criar a organização Ink House em ambiente de staging real (já criada
  segundo a call — "já conseguimos criar a organização Ink House lá") e coordenar a data/hora
  do corte com o Paulo.

---

## 💰 Precificacao de lancamento (P-4, majoritariamente operacional)

- **Preço padrão confirmado: R$200/mês** (a partir do 11º cliente).
- **Cupom de lançamento**: 50% de desconto, **10 usos únicos**, para os primeiros 10 clientes.
- **Já suportado pelo produto**: o catálogo multi-preço + cupons via super_admin (planos e
  cupons) foi entregue no ciclo anterior (ADR-0023, ADR-0024, commits `9909a78`/`0f8fda0` —
  "catálogo multi-preço... landing com preços reais" / "tela super_admin para gerenciar
  catálogo de billing"). **Não é trabalho de código nesta fatia** — é operação no painel
  `/admin` de billing: mudar o plano padrão de 400→200 (input de preço, cria novo `Price` via
  `RotatePlanIntervalPriceUseCase`, não editar in-place — ver regra em `domain-rules.md`) e
  criar o cupom via o fluxo já existente de Coupon+Promotion Code.
- **Confirmado (2026-08-19)**: é ação inteiramente coberta pela feature de billing já existente
  para super_admin — **sem tarefa de desenvolvimento aqui**. Quem executa (Ruan ou Paulo) é
  operacional, não bloqueia nem depende de código.
- Paulo também prometeu compartilhar os **cartões de teste do Stripe** com o Ruan para validar
  em staging sem cobrança real.

---

## ⚖️ Propriedade legal (P-5, fora do codigo)

JP vai consultar um advogado sobre registro do nome "ASO"/marca e se alguma funcionalidade
replicada fere direito de terceiro. Discussão levantou a possibilidade de abrir CNPJ próprio
(hoje o vínculo é via Ink House). **Sem ação de engenharia** — só registrar como pendência de
produto/negócio. Termos de uso/privacidade do ASO já existem (mencionado na call como
resguardo já feito).

---

## Proposta de milestones

| Milestone                                                                                   | Conteúdo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Risco (skill)                                                                 | Prazo sugerido                                                                                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ~~**P-BUG-1 — Fix visibilidade do Caixa p/ super_admin com membership real**~~              | ✅ **Concluído (2026-08-19)**, commits `a48c4d3` + `edf2681`. `org-layout.tsx` agora usa `resolveOrgAccess()` (nova lib pura) para diferenciar owner real / super_admin sem membership (`actingAsAdmin`) / super_admin com membership real de employee — só o segundo caso mantém o override de `role="owner"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | intermediária/complexa (auth/permissões)                                      | Concluído                                                                                                         |
| ~~**P-1 — Comissão/repasse por profissional**~~                                             | ✅ **Concluído (2026-08-19)**, commits `dbe3613` (backend) e `af117d7` (frontend). Config por `(org_id, member_id)` com histórico imutável (`org_member_commissions`, supersede append-only), snapshot desnormalizado gravado em `services` no momento do pagamento, dois triggers de banco protegendo a imutabilidade pós-pagamento. Telas: owner configura em Configurações › Caixa; overview mostra "Minha comissão" (employee) e "Comissão a repassar" + repasse por profissional (owner). Revisado por `database-guardian` (4 rodadas) e `reviewer` (3 rodadas). ⚠️ **Correção pós-entrega em andamento (2026-08-19, sessão seguinte)** — ver "P-1-FIX" abaixo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | complexa (dinheiro/caixa + nova tabela com histórico)                         | Concluído antes do Ink Day                                                                                        |
| ~~**P-1-FIX — Reposicionar config de comissão + corrigir bug de salvamento**~~ | ✅ **Concluído (2026-08-19)**. Causa-raiz: `db.transaction()` aninhado sobre a conexão `DRIZZLE` dentro do `supersede()` commitava PREMATURAMENTE a transação do request (`RlsInterceptor`), resetando `request.jwt.claims` no meio da execução — leitura seguinte rodava sem RLS válido, retornava vazio, ficava cacheado 1h. **Fix estrutural** em `database.module.ts`: Proxy `DRIZZLE` intercepta `transaction()` quando já há transação de request aberta e simula com `SAVEPOINT`/`ROLLBACK TO SAVEPOINT`/`RELEASE SAVEPOINT` (não passthrough — preserva atomicidade real), cobrindo de brinde 2 outros sites vulneráveis (`transferOwnership` — perda de `actorId` no audit log, já ativo; `anamnesis createVersion` — latente). Cache de `findActiveByOrg` removido por completo (único consumidor era exibição, sem racional de perf que justificasse o risco de staleness). UX: comissão saiu de Configurações › Caixa e entrou no dialog "Permissões do funcionário" (Configurações › Geral) — restrita a `role === "employee"` E também visível para `role === "owner"` (decisão do usuário, corrige o caso de funcionário promovido a proprietário ficar com comissão órfã/invisível). Revisado por `database-guardian` (2 rodadas) e `reviewer` (1 rodada, changes_required → corrigido). Gotcha completo em `.memory/domain-rules.md` (seção RLS). Validado: check-types/lint/testes direcionados verdes nos dois apps. | complexa (RLS/tenancy + dinheiro) | Concluído antes do Ink Day |
| ~~**P-2 fatia 1/4 e 2/4 — Schema/migrations + backend do módulo `customer-self-service`**~~ | ✅ **Concluídas e commitadas** — fatia 1/4 (`3725767`, schema/migrations) e fatia 2/4 (`2eb078a`, domain/infra/use-cases/controllers completos: `anamnesis.module.ts` corrigido, 2 templates de e-mail, 6 use-cases autenticados+públicos dos cenários 1 e 3, `IPublicCustomerWriter`/`DrizzlePublicCustomerWriter`, 2 controllers, módulo registrado em `app.module.ts`). Revisadas por `database-guardian` (1 rodada, corrigida) e `reviewer` (1 rodada, corrigida). Validado: `check-types`/`lint`/`test` (596/596)/`build` + boot real do Nest. Ver seção "M-P2b" em `.memory/domain-rules.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | complexa (dois endpoints novos de escrita pública, atomicidade entre módulos) | Concluído                                                                                                         |
| 🚧 **P-2 fatia 3/4 — Design + frontend das 3 telas (auto-cadastro/atualização de cliente)** | **Iniciada (2026-08-19)** em worktree dedicado — `design` das 3 telas do módulo de Clientes (menu com as 3 opções: criar+ficha via link/enviar ficha a cliente existente/enviar atualização) + páginas públicas `/customer-registration/:token` e `/customer-update/:token` + hooks/integração. **Nota de risco**: páginas públicas não devem mergear só com validação estática — falta verificação visual real em navegador antes do `reviewer` final. Fatia 4/4 (se houver) seria commit final + qualquer ajuste pós-review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | complexa (tela nova, consumindo endpoints públicos já entregues)              | Sem prazo fixo — considerar antes do Ink Day se a agenda permitir (cenário 3 também apoia a migração V1, ver P-3) |
| **P-3 — Migração Ink House V1 → ASO**                                                       | ETL pontual (fora de milestone de produto) — importação de dados + V1 read-only. Sem flag nova em `customers` (descartada, é responsabilidade do V1 legado, não do ASO).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ETL: não classificado pela skill (script pontual)                             | Corte agendado para 12-13/09 (Ink Day); dupla-entrada já em andamento (Ruan)                                      |
| **P-4 — Preço de lançamento + cupom**                                                       | Sem código — já coberto pela feature de billing existente para super_admin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | operacional, sem dev                                                          | Próxima semana                                                                                                    |
| **P-5 — Propriedade legal/marca**                                                           | Sem código — ação externa do JP com advogado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | operacional                                                                   | Sem prazo definido                                                                                                |

---

## Pendências restantes / a confirmar com o Paulo antes de codar

Nenhuma decisão de produto bloqueante restante. Todos os pontos levantados nas duas rodadas de
revisão (2026-08-19) foram resolvidos — ver "Decisão"/seções datadas em cada milestone acima.
O que falta agora é execução: `locator`/`design`/`planner` por milestone, na ordem sugerida na
tabela.

**Resolvidas nesta rodada final** (não reabrir sem novo motivo):

- **P-1**: pré/pós-taxa é config **por profissional dentro da org** (não por org como as taxas
  de cartão) — entra no snapshot histórico junto com o percentual.
- **P-2**: `serviceTypeId` do cenário 1 é escolhido no momento de acionar o auto-cadastro
  (e-mail + tipo de serviço); validação obrigatória de e-mail já cadastrado na org antes de
  gerar o convite; os 3 cenários usam **3 recursos públicos distintos** (decisão de design
  desta sessão — não reaproveitar um único endpoint genérico).

**Resolvidas em rodadas anteriores**: P-BUG-1 (leitura (a) confirmada — rota sem permissão não
aparece), P-1 (snapshot + histórico + escopo por org confirmados), P-2 (ação sai do sheet de
serviço, vai para o módulo de Clientes), P-3 (flag de cadastro desatualizado removida do
escopo do ASO), P-4 (sem ação de desenvolvimento).
