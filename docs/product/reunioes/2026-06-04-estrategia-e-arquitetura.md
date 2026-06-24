# Reunião 04/06/2026 — Estratégia e Arquitetura

> Registro da anotação de reunião (Notion → Ink Ops). Participantes: Paulo Mello, Ruan, João Pedro.
> Foco: evolução do sistema da Ink House para uma plataforma comercial escalável.
> Síntese das decisões → [requisitos-e-regras-de-negocio-v1.md](../requisitos-e-regras-de-negocio-v1.md).
>
> 📋 **Detalhe granular por módulo** (forms, campos in/out, features in/out) →
> [2026-revisao-funcionalidades-por-modulo.md](2026-revisao-funcionalidades-por-modulo.md).

## Contexto e problema de mercado
- Sistema atual foi feito sob medida para a Ink House e é o principal instrumento de gestão
  (clientes, agenda, estoque, financeiro, lançamentos de serviços).
- Maioria dos estúdios tem processos frágeis (papel, planilhas, sistemas genéricos). Dores:
  financeiro, estoque, clientes, agenda, marketing/Instagram, pós-venda, retenção.
- Oportunidade: solução especializada no segmento de tatuagem.

## Proposta — Assessoria Ink
Empresa que oferece soluções para estúdios. O **sistema é o produto de entrada**; depois
audiovisual, filmmaker, conteúdo, gestão de Instagram, tráfego pago, pós-venda, CRM.

## White-label / multitenant
- Não copiar o sistema atual — **nova plataforma** baseada nos aprendizados.
- Ink House vira a **primeira organização**. Conceito **multiempresa/multitenant** com
  isolamento entre estúdios.
- Cada org: proprietário, usuários, permissões, dados, estoque, clientes, movimentações.
- Camada **administrativa global** (Assessoria Ink) para suporte, auditoria, manutenção, gestão.

## Funcionalidades
- **Existentes (V1):** cadastro de clientes, agenda, caixa, entradas/saídas, estoque,
  lançamentos de serviços, histórico operacional, transações.
- **Planejadas:** mensagens automáticas de agradecimento, confirmação de agendamentos,
  remarketing/recuperação de inativos, campanhas, pós-venda, pesquisas de satisfação,
  automações por tempo, CRM, fidelidade, cashback, planos e serviços adicionais.

## Comercial
- **Assinatura recorrente mensal** (inspiração: Netflix). Produto "indispensável".
- **Trial** + validação prévia com estúdios convidados.
- Crescimento: validar → prospecção ativa (visitas, discurso a partir das dores administrativas).
- Pesquisa: concorrentes de centenas a R$ 700+/mês → priorizar adoção/validação sobre margem.
- **Stripe** para cobrança recorrente (cobrança, renovação, inadimplência, trial, reativação).

## Tecnologia e infra
- Stack atual: React + Supabase; manter próximo na V1 para acelerar. Código atual não
  reaproveitado (só regras de negócio).
- **Cron jobs / assíncrono:** mensagens, campanhas, notificações de retorno, confirmações,
  retenção.
- **Ambientes separados:** desenvolvimento, homologação, produção.
- Custos iniciais: domínio, infraestrutura, armazenamento, taxas de pagamento (Supabase barato no início).

## Governança e operação
- **Administração global** com acesso privilegiado.
- **Auditoria:** quem / quando / qual usuário / quais alterações.
- **Suporte:** próximo/manual no início; depois FAQ, docs, canais estruturados.
- Estrutura societária: incluir Paulo Mello como sócio (modelo a definir).

## Outros pontos
- **Cashback** opcional por org (possível substituto de créditos; regras de expiração).
- **Pré-cadastro** (nome + telefone) para automações de confirmação de agenda.

## Riscos
Adequação fiscal/CNAE; definição societária; validação de mercado; descoberta de
funcionalidades para outros estúdios; bugs do sistema atual; suporte; pagamentos; infra.

## Roadmap inicial
1. Mapear o sistema atual.
2. Definir funcionalidades da V1.
3. Desenvolver a plataforma.
4. Homologação interna.
5. Validar com estúdios convidados.
6. Lançamento comercial.
7. Expandir serviços da assessoria.

## Decisões
Novo produto (não reaproveitar código) · v1 como referência de negócio · SaaS com assinatura ·
Stripe · ambientes separados · suporte administrativo global · arquitetura multiempresa ·
validar com usuários externos antes de expandir.
