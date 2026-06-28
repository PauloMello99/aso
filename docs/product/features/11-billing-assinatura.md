# 11 — Billing & Assinatura · 🆕 Novo

## Visão
Cobrança recorrente do acesso à plataforma (a "assessoria"), via Stripe. É o que torna o Ink
Ops um SaaS.

## Estado atual (ink-ops)
Tabela `subscriptions` existe no schema. **Sem** integração Stripe nem fluxo. Páginas
`settings/billing.tsx` / `billing.tsx` são placeholders.

## Legado a portar
**Nenhum** — o legado é interno (sem cobrança).

## Decisões das reuniões / memória
- **Assinatura recorrente mensal**, Stripe como provedor (cobrança, renovação, inadimplência,
  trial, reativação delegados ao Stripe).
- **4 configurações** (geridas pelo super_admin): Gratuita (Ink House) · Trial (1 mês) ·
  Preço cheio (mensal R$400 / semestral R$2.000 / anual R$4.200) · Valor alterado (por cliente).
- **Grace period** configurável após inadimplência.
- Acesso à org **bloqueado** sem billing configurado; produtos Stripe **desacoplados por produto**.

## Comportamento alvo (V1)
1. **Onboarding:** após criar a org, exigir **plano + meio de pagamento** antes de liberar acesso.
2. **Estados da assinatura:** `free | trial | active | past_due | canceled` (alinhar ao enum
   `subscription_status` do schema).
3. **Webhooks Stripe** atualizam o estado; **grace period** define janela de acesso após falha.
4. **Super_admin** gerencia: tipo de assinatura por org, valor customizado, trial, reativação.
5. Cron/checagem para suspender acesso ao fim do grace period.

## Regras de negócio
- Org sem assinatura ativa/trial/grace → acesso bloqueado (somente billing).
- Ink House = plano gratuito.
- Cobrança de **múltiplas orgs** por usuário: futuro (modelo a definir).

## Pendências
- Mapear produtos/preços no Stripe; definir webhooks.
- Política exata de bloqueio/desbloqueio e grace period (dias).

## Revisão das reuniões (04/06 · 11/06)
> Ver [revisão por módulo §0](../reunioes/2026-revisao-funcionalidades-por-modulo.md#0-produto-estratégia-e-arquitetura-0406).
> Status: ✅ feito · 🟡 parcial · ⏳ pendente V1 · 🔮 V2/externo.

- ⏳ **Stripe** intermedia o pagamento (cartão → conta); a plataforma **não** lida com dinheiro
  diretamente. **Modo teste** do Stripe para o ambiente de staging.
- ⏳ **Premissa de preço (04/06):** R$700/mês é caro; **começar baixo (~R$100), fazer nome,
  escalar por quantidade**. (Os valores R$400/2.000/4.200 vieram de síntese posterior — manter
  como configuração do super_admin, a confirmar.)
- ⏳ **Taxa do Stripe repassada ao cliente** (ex.: cobrar 550 p/ receber ~500 limpo).
- ⏳ **Ink House = gratuita** (só paga a taxa do Stripe).
- 🟡 **Bloqueador fiscal:** o CNPJ da Ink House (estúdio) não cobre venda de software → rever
  **CNAE/CNPJ** com contador antes de cobrar.
