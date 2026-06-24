# Ink Ops V1 — Requisitos e Regras de Negócio (consolidado das reuniões)

> Documento consolidado a partir das anotações de reunião no Notion (workspace **Ink Ops**).
> Sintetiza decisões, regras de negócio e requisitos — não é transcrição.
>
> **Fontes:** Reunião 04/06/2026 (estratégia e arquitetura) · Reunião 11/06/2026 (regras de negócio e funcionalidades).
> Complementa o doc [Premissas e Decisões do Produto](https://app.notion.com/p/378a55b8d4c981e387e6cf1af252f977) (Notion).
> Última atualização: 2026-06-14.

## 1. Contexto e visão

O **Ink Ops** é a evolução do sistema interno da **Ink House** para uma plataforma SaaS
**multi-tenant white-label** voltada a estúdios de tatuagem. O sistema de gestão é o
**produto de entrada**; a "Assessoria Ink" poderá agregar depois serviços de audiovisual,
filmmaker, conteúdo, gestão de Instagram, tráfego pago, pós-venda e CRM.

- O código da v1 **não é reaproveitado** — apenas regras de negócio, aprendizados e
  funcionalidades servem de referência.
- A Ink House passa a ser apenas a **primeira organização** dentro da plataforma.
- Stack inicial mantém proximidade com a atual (React + Supabase) para acelerar entrega.

**Problema de mercado:** a maioria dos estúdios tem processos administrativos frágeis
(papel, planilhas, sistemas genéricos). Dores recorrentes: financeiro, estoque, clientes,
agenda, marketing/Instagram, pós-venda e retenção. Há espaço para uma solução
especializada no segmento.

## 2. Arquitetura conceitual (multi-tenant)

Cada **organização** (estúdio) possui, de forma isolada: proprietário, administradores,
funcionários, clientes, agenda, serviços, estoque, caixa e relatórios. Acima das orgs
existe uma **camada de administração global** (Assessoria Ink / super admin) para suporte,
auditoria, manutenção e gestão de clientes.

> Modelagem detalhada de multi-tenancy, papéis e billing já está em `.memory/domain-rules.md`
> e na ADR-0005. Este documento foca no que as reuniões **acrescentaram/refinaram**.

## 3. Modelo comercial

- **Assinatura recorrente mensal** — a meta é tornar a ferramenta indispensável no dia a dia
  (inspiração: modelo de assinatura tipo Netflix).
- **Trial** + validação prévia com estúdios convidados antes da comercialização em larga escala.
- Cobrança via **Stripe** (cobrança, renovação, inadimplência, trial e reativação delegados
  ao provedor) para reduzir esforço operacional.
- Pesquisa de mercado: concorrentes cobram de centenas até R$ 700+/mês. Estratégia inicial:
  **priorizar adoção e validação** antes de maximizar margem.
- Estrutura societária: intenção de incluir Paulo Mello como sócio da operação da plataforma
  (modelo financeiro a definir).

## 4. Regras de negócio detalhadas (reunião 11/06)

### 4.1 Clientes — padronização de cadastro
Campos núcleo padronizados (para viabilizar relatórios consistentes entre orgs):
**Nome, Telefone, E-mail, Cidade, Origem.**
O campo de **créditos** atual é considerado **específico da Ink House** e **não** faz parte
da estrutura núcleo da plataforma.

### 4.2 Origem do cliente — categorias fixas (refinamento)
A origem deixa de ser texto livre e passa a ser um **conjunto de categorias pré-definidas**,
para permitir relatórios globais e comparação entre organizações. Canais identificados:
1. Indicação
2. Rede social do profissional
3. Rede social do estúdio

> ⚠️ **Refinamento sobre `Premissas`/`domain-rules`:** lá `customer_origins` aparecia como
> cadastro livre por org. A decisão da reunião é por **categorias padronizadas** (enum
> global), justamente para habilitar relatórios cross-org. Estrutura final a confirmar
> (enum fixo vs. catálogo global gerenciado pelo super admin).

### 4.3 Observações e anexos do cliente (estrutura genérica)
Cada cliente poderá ter **campo de observações** e **anexos** (imagens, documentos
digitalizados). Caso de uso: ficha física de anamnese/atendimento. Decisão: **não** criar
uma feature específica de "ficha", e sim uma **estrutura genérica** capaz de armazenar
qualquer documentação relacionada ao cliente.

### 4.4 Financeiro — taxas de cartão (líquido no caixa)
Problema: registrar o valor cheio distorce o caixa. Ex.: serviço R$ 1.000, taxa 10% →
recebido real R$ 900.
**Solução:** cada org configura sua taxa — **percentual**, **valor fixo** ou **combinação**
(ex.: `10%`, `5% + R$ 0,50`). Ao lançar um serviço pago em cartão, o sistema **calcula a taxa
automaticamente** e registra o **valor líquido** no caixa, refletindo o valor realmente
recebido. Configuração de taxas é **exclusiva de administradores**.

### 4.5 Estoque — refletir a realidade operacional
Problema central: divergência entre quantidade registrada e física.
- **Descartáveis (consumo unitário):** cartuchos, agulhas, luvas, barreiras → usou, saiu do estoque.
- **Parcialmente consumidos:** vaselina, sabão, produtos de limpeza → controlar frações é
  burocrático; decisão tentativa: após o **primeiro uso**, tratar como **consumido** para
  fins de estoque operacional.
- **Integração estoque ↔ serviço:** relacionar materiais consumidos ao serviço executado para
  calcular **custo real** e **lucro líquido** do procedimento. *(Requer pesquisa adicional
  antes da definição final.)*

### 4.6 Relatórios segmentados (novo módulo)
Relatórios **não** são uma única tela; serão **múltiplos relatórios especializados**:
- **Serviços:** por período / funcionário / cliente, receita, ticket médio.
- **Funcionários:** quem mais faturou, mais atendeu, evolução de performance.
- **Clientes:** recorrentes, inativos, origem, conversão por canal de aquisição.
- **Financeiros:** movimentação de caixa, entradas, saídas, custos operacionais, taxas.

> O módulo de relatórios precisa de **levantamento de requisitos próprio** antes do
> desenvolvimento.

### 4.7 Dashboard administrativo
Dashboard principal voltado ao **administrador do estúdio**: indicadores do negócio,
estoque, movimentações recentes e alertas operacionais. Futuro: dashboards individuais por
**funcionário** (métricas de desempenho).

### 4.8 Notificações / mensageria (futuro) + Feature Flags
Funcionalidades de comunicação automática: estoque baixo, agradecimento pós-atendimento,
campanhas, reativação de clientes, comunicados. Preocupação principal: **custo operacional
em escala**.
**Decisão arquitetural — Feature Flags:** desenvolver recursos antecipadamente e
**habilitá-los só quando viáveis** (controle global pelo Super Admin). Ex.: e-mail, SMS,
notificações automáticas permanecem desabilitados até validação comercial. *(Ver ADR-0009.)*

### 4.9 Agenda e integrações
Possível integração com **Google Calendar** (sincronizar compromissos; sincronização para
funcionários conectados). Tecnicamente viável, mas **avaliar necessidade real** depois.

### 4.10 Pré-cadastro de cliente
Pré-cadastro simplificado (**nome + telefone**) para habilitar automações de **confirmação
de agenda** antes mesmo da execução do serviço.

### 4.11 Cashback e fidelização
Possibilidade de substituir o modelo de **créditos** por **cashback**, **opcional por org**,
com regras de **expiração** e personalização. Cada estúdio decide se usa.

## 5. Plataforma, infra e operação (reunião 04/06)

- **Ambientes separados:** desenvolvimento, **homologação** e produção (testar funcionalidades,
  simular falhas, validar pagamentos, testes controlados com convidados).
- **Cron jobs / processamento assíncrono:** base para mensagens automáticas, campanhas,
  notificações de retorno, confirmações de agenda e ações de retenção.
- **Administração global:** área privilegiada para suporte, correção operacional e gestão de orgs.
- **Auditoria:** registrar **quem / o quê / quando / qual org / quais alterações** — rastreabilidade.
- **Suporte:** inicialmente próximo/manual; depois FAQ, documentação e canais estruturados.
- **Custos iniciais:** domínio, infraestrutura, armazenamento e taxas de pagamento; Supabase
  com baixo custo inicial, escalando com volume.
- **Captura de conhecimento:** **Notion** como ponto central — registrar demandas, problemas,
  documentação contínua e insumo para análise por IA e priorização do roadmap.

## 6. Decisões consolidadas

- Criar **novo produto** (não reaproveitar código), usando a v1 como referência de negócio.
- Modelo **SaaS por assinatura**, **Stripe** como provedor de cobrança.
- Arquitetura **multiempresa/multitenant** + **admin global**.
- **Ambientes separados** e validação com estúdios convidados antes de expandir.
- Padronizar **origem de clientes** (categorias fixas) e **campos núcleo** do cliente.
- **Anexos + observações** de cliente via estrutura genérica.
- **Relatórios segmentados** (módulo dedicado, com levantamento próprio).
- **Cálculo automático de taxas de cartão** → líquido no caixa.
- Evoluir **estoque** para refletir a realidade (descartável vs. parcial; integração com serviço).
- **Dashboard administrativo** prioritário.
- **Feature Flags** para liberar recursos conforme viabilidade.
- **Auditoria** de ações.
- **Cashback** opcional (substituto de créditos) — a detalhar.

## 7. Roadmap / próximos passos

1. Mapear o sistema atual e consolidar **backlog da V1**.
2. Refatorar estrutura de **organizações**.
3. Reimplementar módulo de **estoque** (modelo realista).
4. Estruturar entidades de **clientes** (campos núcleo, origem, anexos/observações).
5. Definir **arquitetura dos relatórios** (levantamento de requisitos).
6. Implementar **configuração de taxas financeiras**.
7. Definir estratégia de **integração de agenda** (Google Calendar).
8. Estruturar **auditoria**.
9. Implementar **Feature Flags**.
10. Homologação interna → validação com estúdios convidados → lançamento comercial.

## 8. Pendências / a pesquisar

- Estrutura final de **origem do cliente** (enum fixo vs. catálogo global do super admin).
- Modelo de **integração estoque ↔ serviço** (custo/lucro por procedimento).
- Requisitos detalhados de cada **relatório**.
- Regras de **cashback** (expiração, opt-in por org).
- Necessidade real da **integração de agenda**.
- Adequação **fiscal/CNAE** e definição **societária**.
