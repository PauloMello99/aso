# WhatsApp para campanhas e lembretes — custo, limites e modelo de preço (2026-10-09)

> Origem: Bloco D do backlog da reunião de 07/10 (`docs/planning/2026-10-07-meeting-backlog.md`).
> Entregável em documento, **sem código**. Status: **estudo**; nada foi implementado nem decidido.
> Data de todas as consultas externas: **2026-10-09**.
>
> Legenda: **[fonte]** = valor lido de página/arquivo citado em "Fontes consultadas" ·
> **[premissa]** = insumo do usuário/da reunião, não é fato · **[inf]** = inferência minha ·
> **[nv]** = não verificado (não consegui confirmar; nenhum valor foi estimado no lugar).
>
> Atenção: preços da Meta mudam **no 1º dia de cada trimestre** (01/01, 01/04, 01/07, 01/10), com
> aviso mínimo de 1 mês [fonte: F1]. **Reconferir a tabela antes do lançamento de jan/2027.**

---

## 1. Resumo executivo e recomendação

1. **WhatsApp não cabe no preço-base.** O e-mail custa quase nada (3.000/mês grátis compartilhados,
   plano seguinte US$ 20 por 50 mil). No WhatsApp cada mensagem de template entregue é cobrada pela
   Meta; no Brasil (tabela BRL vigente desde 01/10/2026): **marketing R$ 0,3217**,
   **utilidade/autenticação R$ 0,035** [fonte: F2].
2. **Uma premissa da reunião está desatualizada.** Dizia-se "dentro da janela de 24h a utilidade é
   grátis". A tabela oficial vigente desde 01/10/2026 traz coluna "Serviço" a R$ 0,035 e 5 fontes
   (Zenvia, Wati, Zendesk, YCloud, 360dialog) relatam que, **a partir de 01/10/2026, respostas livres
   na janela de 24h e utilidade dentro da janela passam a ser cobradas**. A página de preços da Meta
   que obtive ainda diz "grátis" (conflito, §2.3). Este estudo simula **cobrando**.
3. **Marketing é ~9x mais caro que utilidade** (0,3217 ÷ 0,035 = 9,19x) e ~160x mais caro que um
   e-mail no plano Pro da Resend (§4). Campanha de remarketing por WhatsApp é onde o custo estoura.
4. **Confirmação e lembrete (utilidade) são baratos**: 1.000 clientes × 2 mensagens/mês = R$ 70/mês.
   Esse é o caso de uso que justifica o canal.
5. **Simulação** (premissas minhas, §5): custo Meta por org vai de **R$ 11,54/mês** (100 clientes, uso
   baixo) a **R$ 3.315/mês** (3.000 clientes, uso alto). Com 500 clientes e uso médio: **R$ 195,85**,
   ou 85% da margem de R$ 230 do plano de R$ 250 (se o custo fixo por org for os R$ 20 de Paulo).
6. **Limites técnicos importam tanto quanto preço**: portfólio novo começa em **250 destinatários
   únicos/24h** fora da janela; sobe a 2.000 com verificação do negócio; depois 10k, 100k, ilimitado.
   O limite e a nota de qualidade são **por portfólio comercial**, não por org do ASO (§6).
7. **Recomendação**: lançar WhatsApp como **complemento (add-on) separado do plano**, com **créditos
   pré-pagos** (modelo B, §7) e **teto duro por org**; manter e-mail como canal padrão de campanha;
   começar por **utilidade** (confirmação/lembrete) e deixar marketing por WhatsApp para depois, com
   opt-in registrado. Franquia pequena só de utilidade (modelo A) é alternativa.
8. **Decisão de negócio pendente** (Ruan/João): markup, tamanho da franquia, quem é o "dono" do número
   (ASO compartilhado x número do estúdio) e se o piso de R$ 100 inclui algum envio.
9. **Maior risco**: portfólio único do ASO compartilhado por todas as orgs = um estúdio que gera
   denúncias/bloqueios derruba a qualidade e o limite de **todos**. Número/WABA por org (via
   Embedded Signup) isola, mas dá mais atrito de onboarding.
10. Não verificados: mensalidades de Zenvia, Wati e Blip por plano, markup por mensagem de BSPs
    brasileiros, impostos incidentes na fatura da Meta, e a franquia de 1.000 serviços/mês em fonte
    primária (§9).

---

## 2. Como o WhatsApp cobra

### 2.1 Modelo de preço (desde 01/07/2025)
- **[fonte F1]** Cobrança **por mensagem de template entregue** (não mais por conversa de 24h). Taxa
  varia pela **categoria** do template e pelo **país do destinatário** (DDI).
- **[fonte F1]** Categorias de template: **marketing**, **utilidade (utility)**, **autenticação**.
  Mensagens **não-template** (texto livre, imagem etc.) só podem ser enviadas com a **janela de
  atendimento aberta**; template é a única forma de falar fora dela.
- **[fonte F1]** **Janela de atendimento (CSW)**: abre quando o usuário escreve (ou liga) para o
  negócio; dura 24h e reinicia a cada nova mensagem do usuário.
- **[fonte F1]** **Janela de ponto de entrada gratuito (FEP)**: conversa iniciada por anúncio
  Click-to-WhatsApp ou botão na Página abre 72h em que **qualquer** mensagem é grátis.
- **[fonte F1]** Descontos por volume existem **só** para utilidade e autenticação, por mercado e
  categoria, agregados no portfólio, zerando todo mês. No Brasil: taxa de lista até **250.000**
  mensagens/mês de utilidade e **500.000** de autenticação [fonte: F2, arquivo "BRL volume tiers"]
  — nenhum cenário abaixo chega perto.
- **[fonte F6]** Uma mensagem de marketing enviada pelo endpoint comum (e não pela Marketing Messages
  API) tem **sobretaxa de 7%** segundo a 360dialog [fonte: F6]. **[nv]** se isso é regra da Meta ou só
  do intermediário.
- **[fonte F1]** Cobrança em **BRL**, faturada pela entidade local (Facebook Brasil), disponível a
  partir de 01/07/2026 para contas elegíveis; migração obrigatória de todas as WABAs elegíveis até
  **30/06/2027**.

### 2.2 Templates, aprovação e categoria
- **[fonte F4]** Todo template passa por aprovação e é classificado pela Meta. Utilidade exige ser
  **não promocional** e ou **específico/solicitado pelo usuário** (pedido, conta, serviço, transação)
  ou **essencial/crítico**.
- **[fonte F4]** Conteúdo misto (utilidade + promoção) **vira marketing**. Desde 09/04/2025, se você
  marca UTILITY e a Meta entende MARKETING, o template é **aprovado como MARKETING**.
- **[fonte F4]** Uso abusivo da categoria utilidade tem sanções escalonadas: aviso, teto de utilidade
  em 24h, recategorização de todos os templates de utilidade para marketing (7 a 30 dias).
- **[inf]** Os exemplos oficiais de utilidade são pedido/transação, alerta de conta, pesquisa de
  feedback específica e "continuar conversa". **Não há exemplo literal de "confirmação de
  agendamento"**; é análogo a confirmação de pedido/serviço contratado, mas **a classificação final é
  da Meta** e só se sabe submetendo o template.

### 2.3 Conflito de fontes: janela de 24h grátis ou cobrada?
| Fonte | O que diz |
|---|---|
| Página de preços da Meta (texto, F1) | Não-template é grátis; utilidade dentro da janela é grátis |
| Tabela oficial BRL, "effective October 1, 2026" (F2) | Coluna **Serviço** = R$ 0,035 (mesmo valor de utilidade) |
| Zenvia, YCloud, Wati, Zendesk (F7–F10) | A partir de 01/10/2026 serviço e utilidade na janela são **cobrados** |
| 360dialog (F6) | Serviço e utilidade na janela são **cobrados**, a taxa de utilidade, sem desconto por volume |

- **[inf]** A tabela (arquivo) é mais nova que o texto da página, que ainda cita "efetivo 01/07/2026".
  Tratei a **tabela como fonte primária** e o texto como defasado. **Confirmar com a Meta/BSP antes de
  precificar.**
- **[fonte F7, F8, F9]** Franquia reportada: **1.000 mensagens de serviço grátis por número comercial
  por mês**; excedente cobrado. **[nv]** em fonte primária da Meta (só intermediários).
- **[fonte F8]** Relato (só Wati) de que conversas de anúncio Click-to-WhatsApp passam a ter janela
  grátis de até 7 dias a partir de 28/09/2026. **[nv]**.

### 2.4 O que isso significa para cada caso de uso do ASO
| Caso de uso | Categoria provável | Dentro da janela? | Custo por mensagem (BRL) |
|---|---|---|---|
| **Confirmação de agendamento** (enviada pelo estúdio) | Utilidade [inf] | Em geral **não** (o cliente não escreveu antes) | 0,035 |
| **Lembrete** (24h antes) | Utilidade [inf]; se tiver oferta, vira marketing | Em geral não | 0,035 |
| **Resposta do cliente à confirmação** ("confirmo") | Mensagem do usuário: grátis; resposta livre do estúdio: serviço | Sim | Entrada grátis; resposta 0,035 após a franquia reportada |
| **Campanha de remarketing / aniversário** | **Marketing** (promoção, retargeting; "mesmo se pedido pelo usuário") | Não | **0,3217** |
| **Aniversário só com parabéns, sem oferta** | Provavelmente marketing [inf]; não consta como utilidade nos exemplos oficiais | Não | 0,3217 (assumir) |
| **Resposta a formulário de orçamento** | Ver abaixo | Depende | 0,035 ou 0,3217 |

**Formulário de orçamento (correção da premissa):** enviar o formulário **não abre** janela de
atendimento; a janela só abre se a pessoa **escrever no WhatsApp**. Responder depois de um formulário
exige **template**: utilidade "continuar conversa" (**só** se a pessoa pediu para falar no WhatsApp,
caso contrário não passa [fonte F4]) ou marketing. Só é "resposta dentro da janela" se o lead mandar
mensagem no número do estúdio primeiro (ex.: botão "falar no WhatsApp" no formulário).

### 2.5 Opt-in
- **[fonte F5]** É **obrigatório** ter opt-in antes de mensagear. Pode ser geral (não específico de
  WhatsApp) se cumprir a lei local, **precisa citar o nome do negócio** e deixar claro que é para
  receber mensagens. Formas aceitas: SMS, site, telefone (URA), presencial/papel.
- **[fonte F5]** Recomenda opt-in **por categoria** e opt-out claro; a Meta limita entrega de marketing
  por usuário (priorizando quem engaja) e o usuário pode escolher "parar de receber marketing" do
  negócio [fonte F4b].
- **[inf]** LGPD: o consentimento precisa ser registrado (quando, texto exibido, canal, categoria) e
  revogável. O cadastro de cliente do ASO hoje **não** guarda isso para WhatsApp **[sup]** (a verificar
  no código; não inspecionado neste estudo).

---

## 3. Custo por mensagem — Brasil

Fonte: tabela oficial da Meta "Cost per message in BRL... effective October 1, 2026" e a equivalente
em USD [F2], consultada em 2026-10-09. Para destinatário com DDI +55, independentemente de onde o
negócio está.

| Categoria | BRL/mensagem | USD/mensagem | Observação |
|---|---|---|---|
| Marketing | **0,3217** | 0,0625 | Sem desconto por volume |
| Utilidade | **0,035** | 0,0068 | Lista até 250.000/mês; fora da janela (e, a partir de 01/10/2026, dentro dela também, ver §2.3) |
| Autenticação | 0,035 | 0,0068 | Lista até 500.000/mês; não usada pelo ASO |
| Serviço (texto livre na janela) | 0,035 | 0,0068 | Coluna "Serviço" da tabela; franquia de 1.000/mês/número reportada por intermediários [nv] |
| Autenticação internacional | n/a | n/a | |

- **Câmbio**: os valores acima já estão em BRL na tabela da Meta, então **a simulação não depende de
  câmbio**. Para converter preços em USD de terceiros (Twilio, 360dialog, Resend, Gupshup) usei
  **R$ 4,9892 por US$ 1**, série 1 do SGS do Banco Central ("Taxa de câmbio - Livre - Dólar americano
  (venda) - diário"), valor de **09/10/2026** [F11]. A razão implícita da tabela da Meta é 0,3217 ÷ 0,0625 = 5,147 (não é câmbio de
  mercado, é taxa interna da Meta).
- **[nv]** Impostos incidentes sobre a fatura da Meta (ISS, IRRF, PIS/COFINS etc.): um blog de terceiro
  cita 15–25% a mais, mas é fonte secundária sem verificação; **não usado**. Perguntar à contabilidade.

---

## 4. Comparação com e-mail (Resend, canal atual)

Fonte: página de preços da Resend, 2026-10-09 [F12].

| Plano | Preço | E-mails/mês | Limite diário | Excedente |
|---|---|---|---|---|
| Free | US$ 0 | 3.000 | **100/dia** | n/a |
| Pro | US$ 20 (≈ R$ 99,78) | 50.000 | sem limite | US$ 0,90/1.000 |
| Pro | US$ 35 | 100.000 | sem limite | US$ 0,90/1.000 |
| Scale | US$ 90 | 100.000 | sem limite | US$ 0,90/1.000 |

(Resend também tem plano "marketing" por contatos: Free 1.000 contatos; Pro de US$ 40 a US$ 650 por
5.000–150.000 contatos [F12]. Qual plano de contatos se aplica ao ASO é **[sup]**: não verifiquei no código como a Resend é usada.)

**Custo por mensagem (câmbio 4,9892):**
| Canal | Cálculo | BRL/mensagem |
|---|---|---|
| E-mail, Pro (US$ 20 ÷ 50.000) | 0,0004 US$ × 4,9892 | **≈ 0,0020** |
| E-mail, excedente | 0,0009 US$ × 4,9892 | ≈ 0,0045 |
| WhatsApp utilidade | tabela Meta | 0,035 (≈ **17,5x** o e-mail) |
| WhatsApp marketing | tabela Meta | 0,3217 (≈ **161x** o e-mail) |

**O que o limite grátis do e-mail já significa hoje [inf]:** 3.000/mês e 100/dia valem **para a
plataforma inteira**. Uma única org com 1.000 clientes em uso médio (§5) gera ~3.000 e-mails/mês
(2.000 de confirmação/lembrete + 1.000 de campanha) e sozinha esgota a franquia; uma campanha para 500
contatos estoura o teto de 100/dia. **O e-mail também precisa de plano pago assim que houver mais de
poucas orgs ativas**, independentemente do WhatsApp (US$ 20 ≈ R$ 100/mês de custo fixo da plataforma).

---

## 5. Simulação por volume

### 5.1 PREMISSAS (não são fatos; escolhidas por mim, para o leitor trocar)
- **N** = clientes ativos por org: **100, 500, 1.000, 3.000**.
- Mensagens **por cliente por mês**, por categoria:

| Cenário (premissa) | Confirmação (util.) `c` | Lembrete (util.) `l` | Marketing `m` | Total por cliente |
|---|---|---|---|---|
| Baixo | 0,5 | 0,5 | 0,25 (1 campanha a cada 4 meses) | 1,25 |
| Médio | 1 | 1 | 1 | 3 |
| Alto | 2 | 2 | 3 | 7 |

- Todas as confirmações/lembretes são tratadas como **utilidade cobrada** (R$ 0,035), seja dentro ou
  fora da janela (pior caso coerente com §2.3).
- Respostas livres do estúdio na janela (serviço) **não simuladas** (cobertas pela franquia reportada
  de 1.000/número/mês, **[nv]**; cada resposta acima disso seria + R$ 0,035).
- Respostas a formulário de orçamento **não simuladas**; se por template, + R$ 0,035 (utilidade) ou
  + R$ 0,3217 (marketing) por lead.
- Sem taxa de plataforma de BSP no bloco "custo Meta" (ver 5.3).

### 5.2 Fórmula (para refazer)
```
custo_Meta_mês (R$) = N × [ (c + l) × 0,035  +  m × 0,3217 ]
custo_por_cliente   = (c + l) × 0,035 + m × 0,3217
```
Por cenário: Baixo = 1,0 × 0,035 + 0,25 × 0,3217 = **R$ 0,115425**; Médio = 2 × 0,035 + 1 × 0,3217 =
**R$ 0,3917**; Alto = 4 × 0,035 + 3 × 0,3217 = **R$ 1,1051**.

### 5.3 Resultado: custo Meta por org, R$/mês
| Clientes (N) | Baixo | Médio | Alto |
|---|---|---|---|
| 100 | 11,54 | 39,17 | 110,51 |
| 500 | 57,71 | 195,85 | 552,55 |
| 1.000 | 115,43 | 391,70 | 1.105,10 |
| 3.000 | 346,28 | 1.175,10 | 3.315,30 |

Quanto desse custo vem de marketing (cenário Médio): 0,3217 ÷ 0,3917 = **82%**. No Baixo: 70%; no
Alto: 87%. **Marketing domina o custo mesmo sendo a minoria das mensagens.**

**Custo extra se passar por Twilio** (taxa própria **US$ 0,005 por mensagem**, entrante ou
saliente [F13] ≈ R$ 0,02495): `msgs_totais = N × (c + l + m)` e `taxa = msgs_totais × 0,02495`.
Para N = 1.000: Baixo +R$ 31,18; Médio +R$ 74,84; Alto +R$ 174,62 (somar à tabela acima; a Twilio repassa a tarifa da Meta sem alterá-la [F13]). A taxa da Twilio vale
**também para mensagens recebidas**: cada resposta do cliente ("confirmo") soma ≈ R$ 0,025 e não está na
fórmula. Via 360dialog: assinatura **por canal** de **US$ 59** (≈ R$ 294,36),
US$ 119 (≈ R$ 593,72) ou US$ 299 (≈ R$ 1.491,77) por mês, **mais** a taxa Meta sem markup declarado
[F6].

### 5.4 O que isso representa frente ao plano (premissas de Paulo/Ruan/João)
- **[premissa]** Interpretei "~R$ 20/mês de custo por cliente só existindo na plataforma" como **por
  org/estúdio (cliente do ASO)**, não por cliente final do estúdio. Se for por cliente final, a conta
  muda de ordem de grandeza e deve ser refeita.
- **[premissa]** Plano atual: R$ 250,00/mês, 45 dias de trial. Piso citado: R$ 100/mês.

| Referência | Margem antes do WhatsApp |
|---|---|
| Plano R$ 250 − R$ 20 | R$ 230 |
| Piso R$ 100 − R$ 20 | R$ 80 |

| Cenário | Custo Meta | % da margem de R$ 230 | % da margem de R$ 80 (piso) |
|---|---|---|---|
| 100 clientes, Baixo | 11,54 | 5% | 14% |
| 500 clientes, Médio | 195,85 | **85%** | 245% (prejuízo) |
| 1.000 clientes, Médio | 391,70 | 170% (prejuízo) | n/a |
| 3.000 clientes, Alto | 3.315,30 | 1.441% | n/a |

**Leitura honesta:** só estúdios pequenos em uso baixo cabem "embutidos" no plano. Qualquer estúdio
médio com campanha mensal passa o preço do plano. Isso reforça cobrar WhatsApp **à parte ou por
consumo**. Não há como embutir sem teto.

---

## 6. Limites técnicos relevantes

| Tema | O que a documentação diz [F3, F14] | Implicação para o ASO |
|---|---|---|
| **Limite de mensagens** | Nº máximo de **destinatários únicos fora da janela em 24h móveis**, por **portfólio comercial**, compartilhado por todos os números. Novo portfólio: **250**. Sobe a **2.000** (verificar o negócio, ou a verificação feita pelo parceiro, ou 2.000 entregues com template de alta qualidade em 30 dias), depois **10.000**, **100.000**, **ilimitado** (escala automática). | O texto antigo "tiers 1k/10k/100k" não vale: o degrau inicial é 250 e o seguinte 2.000. Uma única campanha para 500 clientes já excede o degrau inicial |
| **Escala automática** | Exige qualidade alta e uso de **pelo menos metade** do limite nos últimos 7 dias; sobe em até 6h | Estúdio pequeno pode nunca sair do degrau inicial |
| **Qualidade** | Baseada em bloqueios, denúncias, silenciamentos nos últimos 7 dias; qualidade baixa sustentada **limita** o envio [F5] | Um estúdio que dispara spam afeta o portfólio inteiro (se compartilhado) |
| **Verificação de negócio** | Caminho para 2.000; também usada pelo parceiro | Cada estúdio precisaria de CNPJ/dados verificados no modelo "um portfólio por org" |
| **Número dedicado** | Número usado na API **não pode** estar ativo no WhatsApp comum do celular (precisa ser removido antes); precisa de verificação por SMS/voz e PIN de 2 etapas; nome de exibição | O estúdio perde o WhatsApp "normal" naquele número **[nv]** se existe modo de coexistência (não verifiquei) |
| **Opt-in / opt-out** | Obrigatório (§2.5) | Registro e respeito ao opt-out por categoria |
| **Janela de 24h** | Só abre quando o usuário escreve | Fluxo de "responder" é diferente do de "avisar" (§2.4) |
| **Per-user marketing limits** | A Meta pode reduzir marketing entregue a quem engaja pouco, **sem aviso de cota fixa** [F4b] | Entrega de campanha **não é garantida**; medir entrega real |
| **Categorização** | Template "utilidade" com cara de marketing é recategorizado; abuso gera restrição [F4] | Revisar texto de templates; não colocar promoção em lembrete |
| **Onboarding por org** | Embedded Signup permite que cada cliente conecte sua WABA e número ao app do ASO; **versão 2 será descontinuada em 15/10/2026**, migrar para v4 [F15] | Caminho técnico do modelo C; já com data de corte |

---

## 7. Proposta de modelo de preço (para Ruan e João)

Todos os parâmetros abaixo (markup, franquia, preços de pacote) são **exemplos ilustrativos**, não
recomendação numérica. A **estrutura** é a proposta; os **números** são decisão de negócio.

### Modelo A — Franquia inclusa + excedente repassado com markup
- Plano inclui **franquia pequena de utilidade** (ex.: o equivalente a R$ 25 de custo Meta ≈ 714
  mensagens de utilidade ≈ 77 de marketing). Acima disso, **excedente = custo Meta × (1 + markup)**.
- Conta (500 clientes, Médio, custo Meta R$ 195,85; franquia R$ 25; markup ilustrativo 30%):
  excedente cobrado = (195,85 − 25) × 1,30 = **R$ 222,11**; custo Meta do excedente = 170,85;
  **margem sobre o excedente = R$ 51,26**; a franquia de R$ 25 é custo do ASO (R$ 25 por org, se
  sempre consumida), logo a margem líquida do WhatsApp nesse caso é **R$ 26,26**.
- **Prós**: simples de comunicar; estúdio pequeno nunca vê conta extra.
- **Contras**: franquia vira custo fixo para todos (inclusive quem não usa); exige medir consumo e
  cobrar excedente (cobrança variável não existe hoje); risco de **mix** (um marketing a R$ 0,32 gasta
  a franquia 9x mais rápido que utilidade).

### Modelo B — Créditos pré-pagos (recomendado como ponto de partida)
- O estúdio compra pacotes (ex.: R$ 100, R$ 300). `crédito = preço ÷ (1 + markup)` em custo Meta.
  Com markup 30%: R$ 100 de pacote = R$ 76,92 de custo Meta ≈ **2.198 utilidades ou 239 marketing**.
- Cada envio debita o custo da categoria; **sem saldo, não envia** (teto duro por construção).
- **Margem**: R$ 23,08 por pacote de R$ 100 (30% sobre custo), antes de taxa de pagamento **[nv]**.
- **Prós**: **risco zero de inadimplência/estouro**; custo variável totalmente repassado; funciona com
  o preço-base de R$ 100–250 intacto; marketing "se paga" ou não acontece.
- **Contras**: fricção de compra; precisa de **ledger** e política de saldo expirado/estorno (LGPD/
  CDC); percepção de "pedágio".

### Modelo C — Número/WABA do próprio estúdio (BYO), cobrança direta da Meta
- Estúdio conecta sua WABA via Embedded Signup; **a Meta fatura o estúdio**; o ASO cobra uma **taxa
  fixa de integração** (valor a definir) ou inclui no plano.
- **Prós**: custo variável do ASO ≈ 0; **qualidade e limite isolados por estúdio** (um spam não afeta
  outros); estúdio fica com seus templates e histórico.
- **Contras**: onboarding pesado (portfólio Meta, verificação do negócio, número exclusivo, cartão na
  Meta); risco de suporte alto; depende da relação de faturamento do Tech Provider com a Meta, que
  **não verifiquei** **[nv]**. Embedded Signup v2 acaba em 15/10/2026 (usar v4).

### Comparação e recomendação
| | A (franquia + excedente) | B (créditos) | C (BYO) |
|---|---|---|---|
| Risco financeiro do ASO | Médio (exposição até o corte) | **Baixo** | **Mínimo** |
| Complexidade de construir | Média (medição + fatura variável) | Média (ledger + checkout) | Alta (Embedded Signup + webhooks por WABA) |
| Atrito para o estúdio | Baixo | Médio | **Alto** |
| Isolamento de qualidade/limite | Não | Não | **Sim** |
| Margem por mensagem | Markup só no excedente | Markup em tudo | Taxa fixa |

**Proposta:** começar com **B** (ou A só com utilidade) usando **portfólio e número do ASO**, com teto
duro por org; deixar **C** como degrau para estúdios grandes. **O portfólio compartilhado só é
aceitável se houver moderação**: limite por org, bloqueio de marketing sem opt-in, templates
aprovados pelo ASO.

### Riscos
| Risco | Efeito | Mitigação |
|---|---|---|
| Abuso/spam por uma org | Qualidade baixa → limite menor para **todas** (portfólio compartilhado) | Teto por org, só templates pré-aprovados, suspensão automática por taxa de bloqueio |
| Banimento do número | Perde-se o canal de todas as orgs | Número/WABA por org (C) ou segregar por portfólio; plano B por e-mail |
| Recategorização de utilidade em marketing | Custo 9x maior que o previsto | Revisar texto; orçar por pior caso |
| Falta de opt-in (LGPD) | Sanção da ANPD **[inf]** + queda de qualidade | Opt-in registrado, bloqueio de envio sem consentimento |
| Mudança de preço da Meta | Margem some | Markup percentual; reler tabela a cada trimestre; cláusula de repasse |
| Custo de suporte de onboarding | Margem consumida | Preço de setup, ou apenas B |

### O que depende de decisão de negócio
1. WhatsApp **dentro** ou **fora** do plano; vale para o piso de R$ 100?
2. Markup (e se aparece em reais ou em "mensagens").
3. Marketing por WhatsApp no lançamento, ou só utilidade no início?
4. Número do ASO compartilhado, número do estúdio (BYO) ou os dois.
5. Quem absorve imposto e taxa de pagamento sobre os créditos.
6. Política de saldo não usado (expira? reembolsa?).

---

## 8. O que o ASO precisaria construir (visão, sem estimativa de prazo)

- **Opt-in registrado por cliente e por categoria**: data, origem, texto exibido, revogação; opt-out
  respeitado em toda campanha e lembrete. Hoje o cadastro não guarda isso **[sup]**.
- **Camada de canais**: abstrair "e-mail" e "WhatsApp" por gatilho; hoje campanhas são só e-mail
  (módulo `campaigns`, ADR-0025).
- **Templates**: cadastro, submissão, estado de aprovação, categoria final, variáveis; versão por
  idioma; mapeamento evento do ASO → template.
- **Webhooks da Meta**: status de entrega (enviado/entregue/lido/falhou), respostas do cliente (para
  "confirmo/cancelo", ligado ao bloco B4 do backlog), alertas de qualidade/limite/categoria.
- **Medição de consumo**: por org, por categoria, por mês, com o preço aplicado (a Meta devolve a
  categoria cobrada em cada status), base do crédito/fatura.
- **Limites por org**: teto mensal, teto diário, bloqueio por saldo; **entitlements por plano** (não
  existem hoje no código).
- **Fila e ritmo de envio** respeitando o limite de 24h do portfólio (campanhas grandes em lotes).
- **Moderação**: pausar org por taxa de bloqueio/denúncia; auditoria de quem enviou o quê.
- **Cobrança**: ledger de créditos ou apuração de excedente; integração com o que já existe (Stripe).
- **Onboarding**: se modelo C, Embedded Signup v4, armazenamento seguro de token por org.
- **Observabilidade e custos**: painel interno de custo por org (ADR-0014 Better Stack).
- **Atenção à regra de tenancy**: `organization_id` deriva da sessão, nunca do cliente (ADR-0005) —
  vale também para o webhook, que chega sem sessão e precisa resolver a org pelo número/WABA.

---

## 9. Lacunas, perguntas abertas e próximos passos

### Não verificado
- Preço de plano/mensalidade e markup por mensagem de **Zenvia, Wati e Take Blip** (páginas sem valores
  públicos ou não carregaram). Blip: planos incluem o canal WhatsApp; add-on de R$ 1,40/R$ 1,25 por
  DAU extra e R$ 150/R$ 100 por atendente extra [F16]; preço dos planos não exibido.
- **Gupshup**: indicado US$ 0,001 por mensagem, via resumo automático da página; **não reconfirmado**.
- **Infobip**: sem valores públicos obtidos.
- Franquia de **1.000 mensagens de serviço por número/mês**: só intermediários (F7, F8, F9).
- **Impostos** na fatura da Meta e taxa de pagamento sobre créditos.
- Relação de faturamento do Tech Provider (Meta cobra o estúdio direto ou via ASO?).
- Se a sobretaxa de 7% do endpoint comum de marketing é regra da Meta (F6).
- Janela grátis de até 7 dias para Click-to-WhatsApp a partir de 28/09/2026 (só a Wati relata).
- Cota publicada para o limite de marketing por usuário (a Meta não publica número).
- Classificação de "confirmação de agendamento" como utilidade: só a Meta decide ao aprovar o template.
- Se o número do estúdio pode coexistir com o WhatsApp do celular.

### Perguntas para a reunião de 15/10 (marketing/assessoria) ou antes
1. "R$ 20/mês por cliente" é por estúdio ou por cliente final?
2. Qual o volume real de clientes ativos por org na base hoje (Ink House primeiro)? Isso troca
   suposição por dado.
3. Marketing por WhatsApp entra no lançamento de jan/2027 ou só utilidade?
4. Número do ASO compartilhado ou do estúdio?

### Próximos passos sugeridos
1. Confirmar com a Meta/um BSP a cobrança de serviço/utilidade na janela e a franquia de 1.000.
2. Pedir cotação a 2 BSPs brasileiros (Zenvia, Blip) para fechar markup e mensalidade.
3. Medir volume real da Ink House (agendamentos/mês, aniversariantes, campanhas) e refazer §5.
4. Submeter 2 templates de teste (confirmação e lembrete) para ver a categoria que a Meta atribui.
5. Decidir modelo (A/B/C) e **só então** levantar escopo técnico; **nada de implementação agora**.
6. Reconferir a tabela de preços em jan/2027 (reajuste possível em 01/01/2027).

---

## Fontes consultadas (todas em 2026-10-09)

| ID | Fonte | URL |
|---|---|---|
| F1 | Meta — Pricing on the WhatsApp Business Platform (modelo por mensagem, janelas, tiers, BRL, calendário) | https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing |
| F2 | Meta — Rate cards "Cost per message in BRL/USD, effective October 1, 2026" e "BRL/USD volume tiers" (arquivos CSV/XLSX linkados na página F1, seção Rate cards) | https://developers.facebook.com/docs/whatsapp/pricing/ (arquivos "BRL rates", "BRL volume tiers", "USD rates") |
| F3 | Meta — Messaging limits | https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits |
| F4 | Meta — Template categorization | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization |
| F4b | Meta — Marketing templates (limites por usuário, preferências) | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates |
| F5 | Meta — Get opt-in for WhatsApp; Send messages (janela, qualidade) | https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in ; https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages |
| F6 | 360dialog — Pricing; Free vs Billed Messaging | https://docs.360dialog.com/docs/get-started/pricing ; https://docs.360dialog.com/docs/get-started/pricing/free-vs-billed-messaging |
| F7 | Zenvia — Novas regras de cobrança do WhatsApp Business em 2026 | https://zenvia.com/novas-regras-cobranca-whatsapp-2026/ |
| F8 | Wati — Pricing changes: service messages and Click-to-Message ads | https://support.wati.io/en/articles/16954666-whatsapp-business-platform-api-pricing-changes-service-messages-and-click-to-message-ads |
| F9 | YCloud — Atualizações de preço efetivas em 1º/10/2026 | https://www.ycloud.com/pt/blog/whatsapp-api-message-pricing-update-effective-october-1-2026 |
| F10 | Zendesk — Announcing upcoming changes to WhatsApp Business messaging pricing | https://support.zendesk.com/hc/en-us/articles/11113277351322-Announcing-upcoming-changes-to-WhatsApp-Business-messaging-pricing |
| F11 | Banco Central do Brasil — SGS série 1, "Taxa de câmbio - Livre - Dólar americano (venda) - diário", valor de 09/10/2026 = 4,9892 | https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=09/10/2026&dataFinal=09/10/2026 |
| F12 | Resend — Pricing | https://resend.com/pricing |
| F13 | Twilio — WhatsApp pricing (US$ 0,005/mensagem + tarifas da Meta repassadas) | https://www.twilio.com/en-us/whatsapp/pricing |
| F14 | Meta — Business phone numbers | https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers |
| F15 | Meta — Embedded Signup (v2 descontinuada em 15/10/2026) | https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview |
| F16 | Take Blip — Preços | https://www.blip.ai/precos/ |
| F17 | Gupshup — Pricing (via resumo automático; **nv**) | https://www.gupshup.ai/pricing |

**Fontes descartadas por inconsistência** (blogs/agregadores com valores que conflitam com a tabela
oficial F2: R$ 0,39/0,08/0,0945; faixas R$ 0,31–0,38; US$ 0,0719): não usadas.
