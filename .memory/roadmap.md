---
name: roadmap
description: Roadmap/backlog do ink-ops — situação atual por módulo e tarefas a desenvolver (planejar vs backlog), para follow-up com stakeholders
metadata:
  type: project
---

# Roadmap & Situação — ink-ops

> Snapshot de **2026-06-22**. Fonte única de follow-up com stakeholders (a documentação
> de produto anterior estava defasada). Espelhado no Notion (board de tarefas).
> Convenções: **Planejar** = entra no ciclo de planejamento/refinamento; **Backlog** =
> registrado, sem prioridade agora. Status: `done | em progresso | planejar | backlog`.

## Situação atual (o que já está em produção)

| Módulo | Estado |
|---|---|
| Auth/Users (sign-in/up, refresh, forgot/reset, me, avatar) | ✅ (gap: sign-up não-atômico) |
| Organizations (CRUD, membros, convite por token próprio) | ✅ |
| Navegação multi-org/multi-papel (nav role-aware, guards) | ✅ |
| Serviços (escopo por profissional, tipo via modal, material no form) | ✅ |
| Estoque (materiais, restock, ajuste, arquivar, movimentos, low-stock) | ✅ |
| Caixa/Transações (append-only; funcionário vê o seu, owner em nome de) | ✅ |
| Agenda/Calendar (escopo por membro, owner em nome de, lembrete cron) | ✅ |
| Clientes (CRUD, origens, anexos) | ✅ |
| Overview (role-based) | ✅ |
| Conta (rota única com sections + voltar) | ✅ |
| Settings (general/cashier-fees/stock) | ✅ |
| Notificações (in-app + e-mail; lembrete agenda) | ✅ núcleo |
| Settings/Agenda externa, Tema, Billing/Stripe, Excluir conta | ⏳ placeholder/parcial |

Visibilidade por funcionário ("só vê o que é dele; owner vê tudo + lança em nome de"):
**Serviços ✅, Agenda ✅, Caixa ✅** (teste de 3 contas em
`docs/testing/employee-visibility-tests.md`).

---

## EPIC 1 — Modelo de funcionário & convites

- **PERM-1 — Permissões granulares por funcionário** · _Planejar_
  Hoje é tudo-ou-nada por papel (`owner`/`employee`). Evoluir para matriz de permissões por
  feature, configurável pelo owner. Desbloqueia o restante do modelo de funcionário.
  Impacto: guards/`roles` no back, `isOwnerOnlyPath`/nav no front.
- **INV-1 — Recusar convite = apagar o convite** · _Planejar (pequeno)_
  Decline simplesmente **remove** a `org_invitation` (não cria status novo), permitindo
  **regenerar o fluxo** depois. Endpoint `DELETE`/`decline` por token (autenticado) + botão
  "Recusar" na tela de aceite → redireciona p/ `/dashboard/organizations`.

## EPIC 2 — Conta & Organização

- **ORG-1 — Transferir/Excluir organização** · _Planejar_
  Pré-requisito de ACC-1: o usuário não pode ter org em seu nome para excluir a conta.
  Permitir **transferir a propriedade** da org a outro membro **ou apagá-la**.
- **ACC-1 — Excluir conta** · _Planejar (depende de ORG-1)_
  Habilitar o botão (hoje desabilitado). Exige que o usuário não seja owner de nenhuma org.
- **TX-1 — Atribuição na correção de transação** · _Planejar_
  A errata hoje atribui o lançamento corrigido ao owner; preservar o `created_by` original
  (buscar do lançamento estornado) para manter a autoria real.

## EPIC 3 — Temas & Acessibilidade

- **THEME-1 — Tema claro/escuro/sistema** · _Planejar_
  Implementar troca de tema (placeholder "em breve" em Conta → Tema). **Atenção a
  acessibilidade**: garantir contraste suficiente (WCAG AA), validar que as cores não se
  confundem nem dificultam a leitura; tokens de cor por tema, não cores hard-coded.

## EPIC 4 — Qualidade & Testes

- **TEST-1 — Regra de TDD por module** · _✅ done (regra criada)_
  Regra registrada em `domain-rules.md` → "Qualidade — Testes (TDD obrigatório)": todo
  module com unitário + integração, **test-first**. Vale já para código novo.
- **TEST-2 — Ataque de testes (portar cobertura)** · _Backlog_
  Esforço dedicado: montar a infra (Vitest/Jest + Postgres de teste), portar os scripts de
  `docs/testing/` para suíte automatizada e cobrir os módulos existentes. Prioridade futura.

## EPIC 5 — Segurança & Dados

- **SEC-1 — Auditar RLS vs. acesso da Caixa** · _Planejar_
  Garantir que as policies do Postgres acompanham a abertura da Caixa ao funcionário
  (defesa em profundidade, não só no use-case). Revisar `transactions`/`org_memberships`.
- **SEC-2 — Migração de `transactions.created_by`** · _Planejar_
  Linhas antigas guardam `auth_id`; padronizar para `users.id` (app) via backfill, evitando
  inconsistência latente (hoje inofensiva porque owners não são escopados).
- **SEC-3 — Desacoplar do Supabase (auth + banco)** · _Planejar (estratégico)_
  Preocupação do time: reduzir acoplamento ao Supabase para uma **possível migração de banco
  futura**. Abstrair o provider de auth atrás de `IAuthProvider` (já existe parcialmente) e
  garantir que persistência não dependa de features específicas do Supabase. Inclui tornar o
  **sign-up atômico** (auth user + `public.users` numa saga/transação com rollback — hoje
  pode deixar auth user órfão). Mapear todos os pontos de acoplamento.
- **SEC-4 — Rate-limiting** · _Planejar_
  Limitar endpoints públicos (lookup de convite, sign-in, sign-up) contra brute force/abuso.

## EPIC 6 — Performance & UX

- **PERF-1 — Notificações sem polling** · _Planejar_
  Trocar o polling (30s, agressivo no preview) por SSE/WebSocket, ou ajustar cadência.
- **PERF-2 — Endpoint agregado de Overview** · _Planejar_
  Hoje o Overview faz N requests no cliente e fatia no front. Criar `GET /orgs/:id/overview`
  agregado, com limites e scoping no servidor — menos round-trips, scoping num lugar só.
- **PERF-3 — Dashboard analítico (quanto mais info, melhor)** · _Planejar_
  Cards de KPI (receita, ticket médio, ocupação, etc.) + séries temporais reaproveitando
  `balance/history`; inspirado no bloco dashboard14. Trazer o máximo de informação útil.
- **UX-1 — Auditoria mobile-first** · _Planejar_
  Validar telas novas (Overview, Conta) em viewport estreito — regra obrigatória do projeto.

## EPIC 7 — DX & Infra

- **DX-1 — Estabilidade Turbopack/HMR** · _Planejar_
  Erros stale recorrentes (`service-form.tsx`). Script "reset dev" (`rm .next` + restart)
  e/ou avaliar `next dev` sem Turbopack.
- **DX-2 — Snapshots de migration** · _Planejar_
  Migrations custom (0003+, 0016) sem snapshot Drizzle; documentar/regenerar p/
  `drizzle-kit generate` não divergir.
- **DX-3 — CI** · _Planejar_
  Pipeline em PR: `check-types` + `lint` + suíte de testes (quando TEST-2 existir).

## EPIC 8 — Produto / Relatórios

- **RPT-1 — Filtros avançados por entidade** · _Planejar_
  Em **cada module**, hoje só há filtros de campos simples. Melhorar a capacidade de filtrar
  a entidade (múltiplos campos, faixas, combinações) — base para relatórios e export.
- **RPT-2 — Export CSV no backend, com seletor de campos** · _Planejar_
  Substituir a geração de CSV no front (com dados já no cliente) por **export no backend**
  que traz a **lista completa respeitando os filtros aplicados**; incluir um **seletor de
  quais campos** trazer no arquivo. Vale por module.
- **RPT-3 — Custo real / margem** · _Planejar_
  (a) Na section de "estoque acabando", mostrar **valor estimado para repor tudo** (usar
  `costPerUnit` × quantidade a repor). (b) Section dedicada no dashboard com **custo e lucro**
  por atendimento/período (estoque consumido ↔ serviço ↔ caixa).

## EPIC 9 — Backlog (sem prioridade agora)

- **BL-1 — Settings/Agenda real (calendários externos)** · _Backlog_
  Conectar Google/Outlook/Apple por usuário; hoje placeholder.
- **BL-2 — Billing/Assinatura (Stripe)** · _Backlog_
  ⚠️ **Atenção**: o time sinalizou "ainda não sabemos o que é o produto", mas o doc de
  Premissas no Notion **já define o modelo** (assinatura **por org** via Stripe — ver EPIC 10
  / PLAT-2 e "Modelo de produto" abaixo). **Ponto de alinhamento com stakeholders**: o que
  está em aberto é só a **cobrança de múltiplas orgs por usuário** (V1 limita a 1 org).
- **BL-3 — Cashback/créditos do cliente** · _Backlog (confirmar remoção)_
  Quase certa **remoção**; confirmar viabilidade antes de descartar de vez.

## EPIC 10 — Plataforma / V1 documentado ainda NÃO concluído

> Lacunas entre o **escopo V1 do doc de Premissas (Notion)** e o que está implementado.
> Não foram citadas explicitamente nesta rodada, mas são "o que falta" segundo a
> documentação oficial — **levar para alinhamento com stakeholders**.

- **PLAT-1 — `platform_role` / Painel super_admin** · _Planejar (alinhar)_
  Doc prevê `super_admin` (gerencia assinaturas, financeiro da plataforma, todas as
  orgs/users/acessos). Não há painel super_admin implementado. Confirmar prioridade.
- **PLAT-2 — Billing/Assinatura + gate de acesso** · _Planejar (alinhar)_
  Modelo definido no doc: assinatura **por org** via Stripe (Gratuito/Trial/Mensal R$400/
  Semestral R$2000/Anual R$4200/Customizado); **acesso à org só após billing configurado**;
  **grace period configurável** após inadimplência. Hoje não implementado (onboarding não
  exige billing). Mesmo escopo do BL-2 — priorizar quando o produto for confirmado.
- **PLAT-3 — Auditoria de ações** · _Planejar (alinhar)_
  Doc exige log de **quem / o quê / quando / qual org / quais alterações**. Não há trilha de
  auditoria. Importante para compliance e suporte.
- **PLAT-4 — Onboarding self-service com billing** · _Planejar (alinhar)_
  Fluxo único do doc: `Cadastro → Criar org → Configurar billing → Acessar org`. Hoje
  cria-se org sem o passo de billing. Depende de PLAT-2.

> **Nota de discrepância (doc defasada):** o doc de Premissas lista "Permissões granulares
> do employee" como pendência em aberto (= PERM-1), confirma "Testes do zero" (= TEST-1/2) e
> "Cobrança de múltiplas orgs" como futuro — tudo coerente com este roadmap.

---

## Modelo de produto (já documentado + sugestões)

**Já definido no doc de Premissas (Notion):** Ink Ops é SaaS multi-tenant para estúdios de
tatuagem (white label da Ink House). **Assinatura por organização** via Stripe:
Gratuito (Ink House) · Trial 1 mês · Mensal R$400 · Semestral R$2.000 · Anual R$4.200 ·
Customizado. Acesso à org **só após billing**; **grace period** configurável; V1 limita a
**1 org por usuário**.

O que está **em aberto** (alinhar com stakeholders): cobrança de **múltiplas orgs** por
usuário (rede de estúdios) — por org? valor escalonado? por contrato?

Sugestões para a evolução multi-org:
1. **Por org com tiers** (baseline atual) — mantém o modelo; cada org nova = nova assinatura.
2. **+ Seats** quando PERM-1 existir — cobra por membro ativo, alinhando preço ao tamanho.
3. **Add-ons usage-based** para canais pagos (SMS/e-mail em massa) sob feature flags (ADR-0009).
4. **Desconto progressivo** para redes (N orgs do mesmo dono) — incentiva expansão.

---

## Próximos passos sugeridos (ordem)

1. **PERM-1** (desbloqueia o modelo de funcionário) ou **PERF-2 + TEST-2** (robustez de
   baixo risco) — escolher conforme prioridade de negócio.
2. **SEC-3** (desacoplamento Supabase) em paralelo, por ser estratégico para migração futura.
3. **RPT-1/RPT-2** (filtros + export backend) — habilita relatórios e tem alto valor percebido.
