# ADR-0018: Conformidade legal (Tier 1) — LGPD, identificação do fornecedor, consentimento

**Data**: 2026-07-27
**Status**: Aceito

## Contexto

O ASO estava prestes a ir ao ar como SaaS pago (assinatura via Stripe) sem nenhum documento
legal em produção: o footer da landing tinha 4 links mortos ("Termos de uso", "Privacidade",
"Cookies", "Segurança" — todos `href="#"`), não havia página de termos/privacidade/cookies,
o cadastro não coletava aceite, e — o item mais grave — o formulário público de anamnese
(`/anamnesis/[token]`) coleta **dado sensível de saúde (LGPD art. 11)**, CPF e assinatura
manuscrita, com o backend capturando IP e User-Agent silenciosamente, e o PDF gerado se
chamava *"Ficha de Anamnese - Termo de Consentimento"* sem que nenhum termo fosse exibido ou
armazenado. Além disso, venda de assinatura online exige identificação do fornecedor
(Decreto 7.962/2013 + CDC).

Esta ADR cobre apenas o **Tier 1** (bloqueadores de lançamento), decidido em conversa com o
usuário. Ficou explicitamente para depois (Tier 2): cron de retenção, anamnese órfã ao
deletar cliente (FK `set null`), limpeza de Storage no delete, bucket `avatars` público,
PII em `audit_logs.metadata`, export por titular, opt-out em e-mail de notificação.

## Decisão

### 1. Divisão de papéis controlador/operador

| Dado | Controlador | Operador |
|---|---|---|
| Conta do usuário do estúdio, billing, telemetria | **ASO** | Supabase, Stripe, Resend, Better Stack |
| Clientes do estúdio, anamnese, anexos | **o estúdio (organization)** | **ASO** |

Formalizada em 4 documentos servidos em `apps/frontend/src/pages/legal/`
(`termos.tsx`, `privacidade.tsx`, `cookies.tsx`, `tratamento-de-dados.tsx`), conteúdo em
`apps/frontend/src/features/legal/`. Fonte única de dados da PJ e versionamento em
`features/legal/constants/entity.ts` (`LEGAL_ENTITY`, `LEGAL_VERSIONS`, `LEGAL_ROUTES`) —
os valores de `LEGAL_ENTITY` são placeholders `[PREENCHER: ...]` e **bloqueiam o ar** até
serem preenchidos com dados reais (razão social, CNPJ, endereço, encarregado/DPO).

Todo documento é renderizado com um aviso "minuta em revisão — requer revisão jurídica
formal" (`LegalLayout`, `features/legal/components/legal-layout.tsx`) — isto é redação
técnica e estrutura, não parecer jurídico.

### 2. Sem banner de cookies

Levantamento confirmou zero uso de `document.cookie`, zero GA/GTM/pixel, fontes
self-hosted via `next/font/google` (build-time), Stripe é redirect para checkout hospedado.
Armazenamento local é só `inkops_session` (estritamente necessário) e `theme` (funcional,
next-themes). Decisão: **não implementar consent manager** — a Política de Cookies apenas
declara essas duas chaves e afirma ausência de rastreamento de terceiros. Se isso mudar no
futuro (analytics, pixel), a página precisa ser atualizada e um mecanismo de consentimento
real adicionado antes da ativação.

### 3. Versionamento de aceite: texto gerado no servidor, snapshotado, nunca confiado ao cliente

Regra de domínio nova (ver `.memory/domain-rules.md`): **texto legal exibido ao titular deve
ser gerado no servidor, snapshotado na linha do registro, e impresso no artefato assinado**
— espelha o padrão já existente de `anamnesis_responses.questions_snapshot`.

- **Cadastro** (`users`): migration `0034_legal_consent.sql` adiciona `terms_accepted_at` +
  `terms_version`. `SignUpDto.acceptedTermsVersion` obrigatório; `SignUpUseCase` grava
  `new Date()` + a versão recebida. Frontend: checkbox obrigatório
  (`features/auth/components/signup-form.tsx`) usando novo componente
  `shared/components/ui/checkbox.tsx` (Radix via pacote unificado `radix-ui`, já dependência
  do projeto — não foi adicionada dependência nova).
- **Anamnese pública** (dado sensível): mesma migration adiciona `consent_text_snapshot`,
  `consent_version`, `consent_accepted_at` em `anamnesis_responses`. Texto construído por
  `anamnesis/domain/build-anamnesis-consent-text.ts` (`buildAnamnesisConsentText({orgName})`),
  nomeando o estúdio como controlador e o ASO como operador, cobrindo natureza sensível dos
  dados, captura de IP/UA como evidência, retenção e canal de exercício de direitos. O
  lookup público (`GET /public/anamnesis-responses/:token`) passou a devolver
  `organizationName` + `consent {version, text}`; a submissão
  (`SubmitAnamnesisResponseUseCase`) **rederiva o texto no servidor** e rejeita
  (`ANAMNESIS_CONSENT_REQUIRED`, 422) se `consentAccepted !== true` ou se a `consentVersion`
  enviada não bater com a vigente (proteção contra página aberta durante deploy). O PDF
  (`pdfkit-anamnesis-document.generator.ts`) ganhou seção "Termo de Consentimento" com o
  texto integral antes da assinatura, e a versão/timestamp do aceite nas evidências.

### 4. Identificação do fornecedor

Footer (`features/landing/components/footer.tsx`) atualizado: links do bloco "Legal" agora
apontam para as 4 páginas reais; removido o 5º link morto "Segurança" (sem documento);
removido o bloco de newsletter (`Input` de e-mail + `Button` **sem `onClick`** — coleta
aparente de dado pessoal sem finalidade nem handler); adicionada linha de identificação
(razão social · CNPJ · endereço · e-mail) lida de `LEGAL_ENTITY`.

## Consequências

- Migration `0034_legal_consent` foi escrita à mão (drizzle-kit generate está quebrado desde
  a 0011 — ver `env_migration_snapshot_gap` na memória de sessão) e **exigiu adicionar
  manualmente a entrada no `meta/_journal.json`** — o `migrate()` do drizzle-orm só reconhece
  migrations listadas no journal, então uma migration nova sem entrada de journal é
  silenciosamente ignorada por `db:migrate` (não dá erro, só não aplica). Qualquer migration
  futura escrita à mão precisa desse passo extra.
- Direito de arrependimento (CDC art. 49, 7 dias) e suspensão por inadimplência descritos nos
  Termos de Uso, refletindo o gate de billing já existente (ADR-0016).
- A Política de Privacidade descreve atendimento de solicitações de titular **manual, por
  e-mail, com SLA de 15 dias** — não promete nada que o produto não cumpre hoje (não há
  endpoint de export/deleção automatizado; isso é Tier 2).
- Pendência dura, fora do controle deste ADR: os placeholders `[PREENCHER: ...]` em
  `LEGAL_ENTITY` (razão social, CNPJ, endereço, encarregado) precisam ser preenchidos com
  dados reais antes do site ir ao ar — sem isso a identificação do fornecedor (CDC) e do
  encarregado (LGPD art. 41) ficam incompletas.
- Tier 2 (retenção, anamnese órfã, storage cleanup, bucket avatars público, PII em audit
  logs, export por titular) permanece como débito conhecido, já documentado no levantamento
  desta sessão; não bloqueia o lançamento mas deve ser endereçado em seguida.
- **Tier 1.5 (débito conhecido, revisão pós-implementação 2026-07-30)**: `SignUpUseCase`
  agora valida `acceptedTermsVersion` contra `CURRENT_TERMS_VERSION`
  (`auth/domain/legal-terms-version.ts`) e rejeita divergência com
  `TERMS_ACCEPTANCE_REQUIRED` (422) antes de criar o usuário — a versão do cliente nunca é
  mais gravada sem validação, fechando a assimetria com o fluxo de anamnese. Mas
  `users.termsAcceptedAt`/`termsVersion`, embora já expostos em `GET /auth/me` (`UserEntity`
  sem filtro de serialização) e agora tipados em `features/auth/types/index.ts` (`Me`),
  **não têm nenhum gate de re-aceite no frontend**: contas anteriores a este ADR ficam com
  `termsVersion: null` para sempre, e se `LEGAL_VERSIONS.terms` for incrementada no futuro,
  usuários já logados não são forçados a reaceitar. Requer decisão de produto (modal
  bloqueante? banner dispensável? apenas no próximo login?) antes de implementar — não
  resolvido nesta sessão.
