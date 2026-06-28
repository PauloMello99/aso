# Reunião 11/06/2026 — Regras de Negócio e Funcionalidades

> Registro da anotação de reunião (Notion → Ink Ops).
> Foco: regras de negócio, comportamento de funcionalidades, padronização de dados e
> requisitos para relatórios/estoque/clientes/agenda. Síntese das decisões →
> [requisitos-e-regras-de-negocio-v1.md](../requisitos-e-regras-de-negocio-v1.md).
>
> 📋 **Detalhe granular por módulo** (forms, campos in/out, features in/out) →
> [2026-revisao-funcionalidades-por-modulo.md](2026-revisao-funcionalidades-por-modulo.md).

## Estrutura geral
Plataforma sobre **organizações independentes** (proprietário, administradores, funcionários,
clientes, agenda, serviços, estoque, caixa, relatórios) + **administração global**.

## Clientes
- **Padronização:** Nome, Telefone, E-mail, Cidade, Origem. Campo de **créditos** é específico
  da Ink House — fora da estrutura núcleo.
- **Origem (categorias fixas):** Indicação · Rede social do profissional · Rede social do
  estúdio. Categorias pré-definidas > cadastro livre, para viabilizar relatórios globais
  e comparação entre orgs.
- **Observações e anexos:** campo de observações + anexos de imagem/documentos. Caso: ficha
  física de anamnese. Decisão: **estrutura genérica** (não uma feature de "ficha").

## Relatórios
- Hoje os indicadores existem só de forma implícita; falta camada consolidada de análise.
- **Não** é uma única tela — múltiplos relatórios especializados:
  - **Serviços:** por período/funcionário/cliente, receita, ticket médio.
  - **Funcionários:** quem mais faturou, mais atendeu, evolução.
  - **Clientes:** recorrentes, inativos, origem, conversão por canal.
  - **Financeiros:** caixa, entradas, saídas, custos, taxas.
- Requer **levantamento de requisitos próprio** antes de desenvolver.

## Financeiro — taxas de cartão
- Problema: registrar valor cheio distorce o caixa (ex.: R$ 1.000 com taxa 10% → R$ 900 reais).
- **Solução:** taxa configurável por org — **percentual**, **valor fixo** ou **combinação**
  (`10%`; `5% + R$ 0,50`). Ao lançar serviço no cartão: calcula a taxa e registra o
  **líquido** no caixa. Configuração **exclusiva de administradores**.

## Estoque
- Objetivo: refletir a realidade (registrado vs. físico).
- **Descartáveis (unitário):** cartuchos, agulhas, luvas, barreiras → usou, saiu.
- **Parcialmente consumidos:** vaselina, sabão, limpeza → controlar frações é burocrático;
  decisão tentativa: após o **primeiro uso**, tratar como **consumido**.
- **Integração estoque ↔ serviço:** custo real e lucro líquido por procedimento *(pesquisar mais)*.

## Dashboard
Prioritariamente para o **administrador** (indicadores, estoque, movimentações, alertas).
Futuro: dashboards por funcionário.

## Notificações e Feature Flags
- Comunicação automática: estoque baixo, agradecimento, campanhas, reativação, comunicados.
- Preocupação: **custo em escala**.
- **Feature Flags:** desenvolver antes e **habilitar quando viável** (controle global pelo
  Super Admin). Ex.: e-mail/SMS/notificações desabilitados até validação comercial.

## Agenda
Possível integração com **Google Calendar** (e sincronização para funcionários conectados).
Viável, mas avaliar necessidade real depois.

## Organização do projeto
**Notion** como ponto central de captura: demandas, problemas, documentação contínua, insumo
para IA e priorização do roadmap.

## Decisões
Padronizar origem de clientes · anexos+observações em clientes · relatórios segmentados ·
cálculo automático de taxas de cartão · estoque realista · dashboard administrativo ·
planejar notificações · Feature Flags · centralizar docs no Notion · continuar levantamento
de relatórios.

## Próximos passos
1. Refatorar organizações. 2. Reimplementar estoque. 3. Estruturar clientes. 4. Arquitetura
de relatórios. 5. Configuração de taxas. 6. Integração de agenda. 7. Auditoria.
8. Documentar novas dores. 9. Consolidar backlog da V1. 10. Iniciar desenvolvimento aprovado.
