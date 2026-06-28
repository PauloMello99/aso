# Revisão de Funcionalidades por Módulo — Reuniões 04/06 e 11/06

> Documento **destilado das transcrições originais** das reuniões de 04/06/2026 (estratégia e
> arquitetura) e 11/06/2026 (revisão funcionalidade a funcionalidade do sistema legado da
> Ink House). Foco: **o que foi revisado por módulo** — comportamento de formulários, campos
> que entraram/saíram, features que entraram/saíram e demais mudanças solicitadas.
>
> Complementa os resumos em [2026-06-04](2026-06-04-estrategia-e-arquitetura.md) e
> [2026-06-11](2026-06-11-regras-de-negocio.md) e a
> [síntese de requisitos](../requisitos-e-regras-de-negocio-v1.md). Os specs por feature em
> [`../features/`](../features/) trazem a versão "oficial" de cada módulo.

**Legenda de status:** ✅ implementado · 🟡 parcial · ⏳ pendente (V1) · 🔮 V2 / externo (gera custo)

---

## 0. Produto, estratégia e arquitetura (04/06)

- **Assessoria Ink:** empresa que vende soluções para estúdios de tatuagem; o **sistema é o
  produto de entrada** (carro-chefe). Depois: audiovisual/filmmaker, conteúdo, gestão de
  Instagram, tráfego pago, pós-venda, CRM. 🔮
- **White-label multitenant:** **não reaproveitar o código** legado — nova plataforma baseada
  nos aprendizados. **Ink House vira a 1ª organização** (com acesso completo); migrar os dados
  da Ink House para a nova plataforma. ✅ (multitenancy implementada)
- **Super admin (administração global):** poder total e absoluto sobre qualquer organização —
  pode agir "em nome de" para corrigir falha humana (ex.: serviço lançado errado). Camada de
  comunicação: desenvolvedor → administração (super admin) → cliente final. ⏳
- **Ambientes:** dev/staging/produção; fluxo **protótipo → aprovação → produção** (esteira).
  Ambiente de teste interno serve para forçar crashes/cenários sem afetar produção. 🟡
- **Trial + assinatura recorrente (Stripe):** modelo Netflix; trial (ex.: 2 meses grátis para
  estúdios convidados) → mensalidade. **Stripe** intermedia o pagamento (cartão → conta); a
  plataforma **não** lida com dinheiro diretamente. **Grace period** configurável após
  inadimplência. Taxa do Stripe **repassada ao cliente** (ex.: cobra 550 p/ receber ~500 limpo).
  Exige **CNPJ/CNAE** compatível (a Ink House é estúdio, não fornecedora de software → rever). 🟡
- **Precificação (premissa):** concorrentes ruins cobram R$700+/mês; R$700 é caro. Começar
  baixo (~R$100/mês), fazer nome, escalar por **quantidade**. Disponibilização **gratuita** para
  a própria Ink House (só paga a taxa do Stripe). ⏳
- **Suporte:** início manual/próximo (WhatsApp, visita); depois FAQ/docs/canais. Seção
  "Precisa de ajuda? → e-mail". ⏳
- **Infra/custo:** manter **Supabase** na V1 (barato); custo só vira problema ao estourar limite
  de storage; **cron jobs** para ações por tempo (mensagens, lembretes, retenção). Domínio é
  custo anual fixo. 🟡

---

## 1. Papéis & permissões

- **Funcionário vê apenas os próprios serviços** (os que ele lançou); **só o administrador vê
  todos**. Na V1 (legado) isso era falso: funcionário via tudo como admin. ✅ (visibilidade por
  papel implementada na agenda; replicar em Serviços/Caixa)
- **Rotas privadas por papel:** funcionário não acessa abas de funcionários, caixa, etc. ✅
- **Admin pode agir em nome de todos** (ex.: lançar serviço para um funcionário). ✅

---

## 2. Serviços

**Comportamento de form/UX**
- No lançamento, **funcionário não deve ver o seletor de funcionário** — só lança para si
  (pré-preenchido pela conta logada). O **admin** mantém o seletor (lança em nome de qualquer um). ⏳
- **Tela própria do serviço** (em vez de modal apertada), dividida em **seções**: editar campos
  do serviço × materiais atrelados. ⏳
- **Filtro de período com default = mês vigente** (1º do mês até hoje), não "hoje − 30 dias";
  trocar o mês carrega outro período. ⏳

**Campos que entraram**
- **Método de pagamento: +Pix** (dinheiro físico que cai integral na conta). **Cartão vira
  "crédito"** (cartão de crédito). ⏳
- **Data de execução do serviço** exibida na listagem (≠ data de lançamento). Manter as duas:
  execução (visível, retroativa) e lançamento (auditoria, oculta). 🟡 (campos created/updated já existem)
- **Tipo de serviço configurável por org** (cadastro), não enum. ✅

**Campos / features que saíram**
- **Enum fixo `tattoo | body_piercing`** → tipos viram cadastro por org. ✅
- Para o funcionário: **seleção de funcionário no lançamento** (removida). ⏳

**Regras**
- **Taxa de cartão → líquido no caixa:** ao lançar serviço no **cartão**, o sistema desconta a
  taxa e registra o **valor líquido** (ex.: R$1.000 no crédito, taxa 10% → R$900 no caixa). A
  taxa é **configurada por org** (percentual, valor fixo ou combinação, ex.: `5% + R$0,50`),
  **exclusiva de administradores**, **não bloqueante** (carrega como base, editável no
  lançamento). O tatuador freelancer com máquina própria **não** é coberto na V1 (vira só uma
  transação do valor acordado). ✅ (config de taxas + líquido implementados no Caixa)
- **Consumo de materiais** no lançamento e na **edição** do serviço (debita do estoque). 🟡

---

## 3. Clientes & origem do cliente

**Comportamento de form/UX**
- **Endereço estruturado** (saiu o texto livre): linha 1, complemento, cidade, estado, país. ✅
- **Telefone com máscara internacional** (saiu o formato só-BR; tem de aceitar telefone de
  qualquer país). ✅
- **Validação de e-mail** (formato válido). ✅
- **Verificação ativa de e-mail/telefone** (double-check: manda e-mail/WhatsApp ao cadastrar e a
  pessoa confirma) — desejável, mas cliente quase nunca confirma → 🔮 (depende de mensageria).

**Campos que entraram**
- **Exibir a cidade** na listagem. ✅
- **Observações + anexos de imagem/documento** no cadastro (estrutura **genérica**, ex.: foto da
  ficha de anamnese escaneada) — **não** uma feature de "ficha" específica. 🟡

**Campos / features que saíram**
- **Campo "crédito"** sai do núcleo (era específico da Ink House) → vira **cashback opcional por
  org** (ver §12). ✅

**Origem do cliente**
- **Categorias fixas (3):** Indicação · Rede social do profissional · Rede social do estúdio.
  Pré-definidas (não texto livre) para viabilizar **relatórios cross-org**. ✅

**Ficha de anamnese (decisão)**
- Não virar fluxo bloqueante/digital obrigatório (cliente não preenche; poucos estúdios usam;
  estúdio prefere prova física p/ vigilância). V1: **ficha física segue do estúdio**; o sistema
  só permite **anexar** (escanear) ao cliente. Reavaliar no futuro. ⏳

**Outros**
- **Exportar CSV** da lista de clientes/contatos (com o filtro aplicado) — facilita campanhas
  sem depender de mensageria interna. ⏳

---

## 4. Agenda

- **V1: replicar a funcionalidade atual** (lançar eventos de serviços futuros para gestão da
  equipe/maca). ✅ (agenda por membro implementada)
- **Integração com Google Calendar:** 🔮 V2 — sincronização **por usuário** (quem conecta o
  próprio Gmail), idealmente bidirecional; exige webhook/investigação (pode ter custo) → prova
  de conceito antes.
- **Pré-cadastro (nome + telefone)** ligado ao **pagamento do sinal**, para agendamento
  automático e confirmação de agenda. Depende de atendimento automático/IA → 🔮 futuro.

---

## 5. Funcionários

- Sem grandes mudanças de funcionalidade. Pontos: **não deixar todos os funcionários
  desativados** (estado atual do legado); permitir **editar a página** do funcionário. 🟡
- (Possível futuro: home/dashboard do funcionário com os próprios indicadores — ver §9.) 🔮

---

## 6. Materiais & estoque

**Princípio:** o estoque deve refletir o **físico** (o que sai do armário sai do sistema). O erro
do legado é operacional (uso entendido de forma diferente), não do sistema.

**Comportamento de form/UX**
- **Buscar material por nome** (a listagem alfabética obriga rolar até a letra). ⏳
- **Ordenar por "último utilizado"** + listar os **mais usados** primeiro (campo de data
  "última vez usado", além de criado/atualizado). Aplicar também na listagem do lançamento de
  serviço. ⏳

**Campos / features que entraram**
- **Flag "material compartilhável"** (ex.: vaselina, tinta, luva): **não** é debitado por
  inteiro a cada serviço. No lançamento, em vez de quantidade, o funcionário responde
  **"acabou?"** — se sim, debita; se não, não debita (bom para auditoria: quem marcar "acabou"
  assume). Materiais **descartáveis** (cartucho/agulha) debitam por uso. ✅ (flag implementada; o
  comportamento "acabou?" no lançamento é 🟡, virá com Serviços)
- **Arquivar material** (não apagar) — material já usado em serviço **não pode ser excluído**
  (mataria a referência do serviço). Lista de arquivados × ativos; pode reativar. ⏳
- **Excluir material só se nunca foi usado** → V2. 🔮 (hoje a exclusão é bloqueada se vinculado a
  serviço — `MATERIAL_IN_USE_BY_SERVICES`)

**Features rejeitadas**
- **Lançar por caixa/unidade composta** (ex.: 1 caixa = 20 cartuchos): **descartado** — estoque é
  unitário/consumível; caixa "mista" quebra a premissa. ❌
- **Granularizar consumo fracionado** (ex.: 50 g de vaselina, folhas de papel toalha): **muita
  burocracia** → resolvido pela flag "compartilhável" + "acabou?". ❌

**Verificação periódica de estoque**
- **Lembrete configurável por org** (a cada N dias) para conferir o estoque; precisa de
  **histórico de verificações** (última verificação) + **cron** diário que avalia a diferença
  desde a última. Notificação **desabilitável** por org. ⏳
- **Discrepância** verificação × lançamento (ex.: sistema diz 20 cartuchos, gaveta tem 5 → faltou
  lançar ou houve perda) deve ser detectável. ⏳
- **Notificação de estoque baixo** ao administrador (in-app/dashboard; e-mail/celular só depois
  por custo). 🟡 (alerta de baixo estoque existe; push externo é 🔮)

---

## 7. Caixa & transações

**Conceito**
- "Caixa" é **registro/gestão de movimentação** (quanto girou, por meio de pagamento), **não um
  espelhamento ao vivo da conta bancária**. Possível **renomear**. Saídas (pagar funcionário,
  material) também são registradas — é movimentação do ambiente da plataforma. ✅ (modelado como
  livro de transações)

**Features que entraram**
- **Errata em vez de editar/excluir** (transações são **append-only**): um lançamento errado é
  corrigido por uma **errata** — o sistema calcula a diferença e cria a transação de correção
  ("você quer que a transação de −27 vire −10?" → lança a diferença). Melhor que edição para
  **auditoria** (fica registrado que houve correção). Botão de errata acessível. ✅
- **Botão de transferência** entre meios (ex.: dinheiro → banco/poupança) — evita o vai-e-vem de
  debitar de um e lançar entrada no outro (e o risco de erro). ⏳ (mesma premissa da errata)
- **Categoria de transação** pré-definida + **criável** na hora (ex.: pagamento de funcionário,
  material, conta, reforma) para padronizar descrições divergentes entre admins e alimentar
  relatórios. O **campo descrição permanece** (detalhe: "material → cartucho"). ⏳
- **Data da transação** (quando a movimentação ocorreu, **retroativa**) ≠ data de registro. ✅
  (transações têm `transacted_at`)

**Features que saíram**
- **Edição/exclusão direta de transação** → substituídas por errata (append-only). ✅

**Em stand-by**
- **Caixa poupança / reserva de emergência** (mais um "caixa") — discutido, deixado em stand-by
  (segue a premissa de registro, não espelhamento). ⏳

---

## 8. Relatórios (novo módulo)

- **Nova aba** para o administrador puxar relatórios sem pedir export manual ao desenvolvedor. ⏳
- **Não é uma tela única** — **múltiplos relatórios** especializados: **Serviços** (período/
  funcionário/cliente, receita, ticket médio), **Funcionários** (quem mais faturou/atendeu,
  evolução — base p/ bonificação), **Clientes** (recorrentes/inativos, **origem**, conversão por
  canal), **Financeiros** (caixa, entradas, saídas, custos, taxas). ⏳
- **Exportar PDF/CSV** com **filtros aplicáveis** (período, funcionário, etc.). ⏳
- Exige **levantamento de requisitos próprio** antes do desenvolvimento. ⏳

---

## 9. Dashboard

- **Página inicial do administrador**: últimos serviços lançados, últimas transações, caixa da
  semana, serviços da semana, **estoque com pontos de atenção** (baixo/acabando), gráficos. ⏳
- Alerta visual no menu (ex.: "!" em Estoque quando algo está acabando). ⏳
- **Só para o administrador** na V1; **dashboard do funcionário** (próprios serviços/rendimentos)
  é futuro. 🔮

---

## 10. Notificações & mensageria

- **Tudo que sai do sistema gera custo** (e-mail, SMS, WhatsApp, IA) — escala com nº de clientes
  finais. V1: **notificações in-app** (dashboard/sino); externos **adiados**. 🟡 (in-app + e-mail
  gated por env implementados)
- **Feature flags** controlam mensageria/automação: desenvolver antes, **habilitar quando
  viável** comercialmente; controle **global pelo super admin**. ✅ (decisão ADR-0009)
- Casos futuros: agradecimento pós-atendimento, confirmação de agenda, reativação de inativos
  (ex.: 6 meses sem vir), campanhas/promoções em massa. 🔮

---

## 11. Auditoria

- Rastrear **quem fez / quando / o quê / qual org / quais alterações** (funcionário vs admin). ⏳
- Toda entidade carrega **criado em / atualizado em** (a data de lançamento do serviço vira campo
  de auditoria). ✅
- Auditar **envios de e-mail/SMS** (saber quais são válidos/falharam — só se descobre após o
  envio). 🔮

---

## 12. Cashback (substitui "crédito")

- O antigo **crédito** (específico da Ink House) é **removido** do núcleo e **substituído por
  cashback**, **opcional por org** (feature flag). Termo mais apelativo/comercial. ⏳
- Regras de **expiração** configuráveis (ex.: 1 ano para gastar, senão zera) — cada estúdio
  define o que pesa na agenda. ⏳
- **Cliente não tem acesso ao sistema** na V1 (não vê histórico/saldo); o controle é do estúdio.
  Schema de clientes já tem `user_id` nullable preparado para vínculo futuro. ✅ (preparo)

---

## Apêndice — itens "fora da V1" (resumo)

🔮 Mensageria externa (e-mail/SMS/WhatsApp) · IA de atendimento/pré-cadastro automático ·
integração Google Calendar · dashboard do funcionário · verificação ativa de contato
(double-check) · geração de nota fiscal · audiovisual/tráfego/CRM da assessoria.
