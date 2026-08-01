# ADR-0012 — E-mail transacional com React Email + módulo `mail` dedicado

**Status:** Aceito
**Data:** 2026-06-28

## Contexto

O envio de e-mail estava espalhado e rudimentar: um port `IEmailSender` +
`ResendEmailSender` viviam dentro de `modules/notifications`, e os corpos eram **HTML inline**
montados à mão em `invite-member.use-case` e `notification.service`. O **reset de senha** nem
passava pelo Resend — usava o e-mail do **Supabase GoTrue** (`resetPasswordForEmail`), com os
templates do Supabase. No sign-up nenhum e-mail era enviado (`email_confirm: true`).

Queríamos: (1) padronizar **todos** os e-mails com templates versionados e revisáveis; (2)
centralizar o envio para reuso por auth, organizations e notifications; (3) trazer os e-mails
de **autenticação** para o nosso pipeline (Resend), saindo do GoTrue.

## Decisão

1. **React Email** (`@react-email/components` + `@react-email/render`) para todos os
   templates, em `.tsx` versionados em `apps/backend/src/modules/mail/templates/`
   (`base-layout`, `invite`, `password-reset`, `welcome`, `notification`). Render server-side
   no backend (`jsx: react-jsx` no tsconfig; `react`/`react-dom` viram deps de runtime).
   Templates **dentro do backend** (não em pacote `@repo/*`) para evitar os problemas
   conhecidos de linking de workspace.

2. **Módulo `mail` dedicado** (`modules/mail/`), sem dependência de auth/notifications (evita
   o ciclo — `notifications.module` já importa `AuthModule`). Dono do port `IEmailSender` +
   `ResendEmailSender` e de um `MailService` com métodos tipados (`sendOrgInvite`,
   `sendPasswordReset`, `sendWelcome`, `sendNotification`). Auth, organizations e notifications
   importam `MailModule`.

3. **Auth fora do GoTrue:** `IAuthProvider.generatePasswordResetLink` usa
   `admin.generateLink({ type: "recovery" })` (NÃO envia e-mail — só devolve o `action_link`),
   e nós enviamos via React Email/Resend. Retorna `null` p/ usuário inexistente (sem
   enumeração). O `action_link` redireciona p/ `FRONTEND_URL/auth/reset-password` com os tokens
   no fragment — **mesmo fluxo que o frontend já tratava**, sem mudança no front. Welcome
   enviado no sign-up.

4. **Semântica de falha em dois níveis:** `IEmailSender.send` retorna `false` quando
   desabilitado (no-op em dev), `true` em sucesso e **lança** em falha real. Os callers
   decidem:
   - **Crítico (aborta):** convite (cria → envia → em falha **reverte** o convite via saga +
     `InvitationEmailFailedException` → HTTP 502) e reset de senha (propaga).
   - **Best-effort (não quebra):** `NotificationService` (incl. crons de agenda/estoque) e
     welcome no sign-up — `try/catch` + log; o in-app/cadastro é a fonte da verdade.

## Consequências

- Templates revisáveis em PR + preview local (`pnpm --filter backend email:dev`).
- Auth deixa de depender dos templates/SMTP do GoTrue; toda a marca de e-mail num só lugar.
- Convites agora **garantem entrega** em produção (flag on): sem e-mail, o convite não persiste.
- Gating segue por env (`NOTIFICATIONS_EMAIL_ENABLED` + `RESEND_API_KEY`), alinhado ao ADR-0009;
  `NOTIFICATIONS_FROM_EMAIL` exige **domínio verificado no Resend**.
- `react`/`react-dom` no backend (só render server-side, sem DOM) — peso aceitável.

## Relacionado

- ADR-0009 (feature flags / custo de mensageria) — e-mail segue gateado por env.
- `docs/product/features/14-notificacoes.md`, `02-autenticacao-usuarios-papeis.md`.
- `.memory/domain-rules.md` (seção Notificações).
