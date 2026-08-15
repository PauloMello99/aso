# Spike — viabilidade de e-mail-to-ticket (Fatia B do módulo support)

**Data**: 2026-08-10
**Status**: Concluído — recomendação pronta para aprovação
**Contexto**: pré-requisito definido pelo usuário para a Fatia C (formulário público/anônimo
de suporte) — ver [ADR-0021](../../.memory/adr/0021-support-privileged-writes-drizzle-admin-column-auth.md)
e a Fatia A já entregue do módulo `support`.

## Pergunta a responder

O Resend (já usado no projeto para e-mail transacional, ADR-0012) suporta receber e-mail
(inbound)? Se sim, com que esforço/custo. Se não, qual alternativa.

## Resposta curta

**Sim.** O Resend lançou uma feature "Inbound" (novembro de 2025) que recebe e-mail e
processa via webhook — disponível em **todos os planos, inclusive o Free**, sem custo
adicional. Como o projeto já usa Resend para envio, isso significa **zero provedor novo,
zero dependência nova, zero custo adicional** — o oposto do cenário de risco que o plano
original da Fatia A havia sinalizado ("Resend pode não suportar inbound nativo").

## Como funciona

1. **Domínio de recebimento**: um domínio (ou subdomínio — a Resend recomenda
   explicitamente usar um subdomínio dedicado, ex. `suporte.inkops.com.br`, em vez do
   domínio raiz) é configurado com um registro **MX de menor prioridade** apontando pra
   infraestrutura da Resend. Não pode haver conflito com o MX já usado pelo domínio
   principal para o e-mail transacional de saída (são registros DNS diferentes:
   SPF/DKIM cuidam do envio, MX cuida do recebimento).
2. **Webhook**: a Resend processa o e-mail recebido e envia um evento `email.received`
   para um endpoint HTTP configurado no dashboard/API. O payload desse evento traz só
   **metadados** (`email_id`, `from`, `to`, `subject`, lista de anexos) — **não** traz o
   corpo (texto/HTML) nem o conteúdo dos anexos.
3. **Busca do conteúdo completo**: com o `email_id` do evento, uma chamada adicional
   (`resend.emails.receiving.get()` ou equivalente REST) devolve o corpo em texto/HTML e
   os anexos. Ou seja, o fluxo é sempre **webhook (metadados) → fetch (conteúdo)**, nunca
   tudo em uma única requisição.
4. **Verificação de assinatura**: a Resend assina webhooks via **Svix** (`svix-id`,
   `svix-timestamp`, `svix-signature`) — o mesmo padrão usado por dezenas de provedores
   (Stripe, Clerk, etc.). Verificação usa o SDK oficial (`resend.webhooks.verify()`) com o
   corpo **cru** da requisição (não o JSON já parseado pelo framework — atenção ao
   `ValidationPipe`/body parser global do Nest, que precisa de uma exceção de rota pra
   preservar o raw body nesse endpoint específico).
5. **Retenção sem webhook pronto**: se o endpoint estiver fora do ar, a Resend retém os
   e-mails recebidos e os disponibiliza assim que o webhook voltar — não há perda de
   mensagem por indisponibilidade momentânea do backend.

## O que falta resolver (não é mais "se é viável", é "como implementar")

1. **Resolução de organização a partir do remetente.** O e-mail chega com `from`/`to`,
   não com `org_id`. A mesma lógica de resolução best-effort desenhada pra Fatia C do
   formulário público (slug da org ou e-mail de membro existente) se aplica aqui — com
   uma vantagem: o endereço `to` pode ser uma variação por organização
   (`suporte+{orgSlug}@suporte.inkops.com.br`, plus-addressing) pra tornar a resolução
   determinística em vez de heurística, se o produto preferir isso a um `to` único
   compartilhado por todas as orgs.
2. **Threading (reply vira resposta no ticket existente, não ticket novo).** Dois
   caminhos possíveis, não mutuamente exclusivos:
   - **Plus-addressing por ticket**: e-mails de notificação (`ticket-response-added.tsx`,
     já implementado na Fatia A) passam a usar `Reply-To: suporte+{ticketId}@...`; quando
     o cliente responde, o `to` do webhook já contém o `ticketId`, sem precisar de
     heurística de assunto/thread.
   - **Cabeçalhos de e-mail** (`In-Reply-To`/`References`) — mais frágil (depende do
     cliente de e-mail do usuário preservar os cabeçalhos), mas complementar como
     fallback.
   - Recomendação: **plus-addressing por ticket** é o caminho determinístico e mais barato
     de implementar; não requer parsing de cabeçalho nenhum.
3. **Endpoint webhook novo, sem autenticação de sessão** (mesma classe de risco do
   formulário público da Fatia C): precisa de verificação de assinatura Svix (item 4
   acima) como controle primário — não há CAPTCHA aplicável aqui (não é um humano
   preenchendo formulário, é a própria Resend chamando o endpoint), então a defesa é
   inteiramente criptográfica (assinatura) + validação de que o evento é genuinamente
   `email.received` da conta certa.
4. **Anexos de e-mail** reaproveitam a mesma infraestrutura já pronta (bucket
   `support-attachments`, `IStorageProvider`, `upload-ticket-attachment` use-case) — o
   novo código só precisa buscar o conteúdo do anexo via API da Resend e fazer o upload,
   sem desenhar nada novo de storage.
5. **Rate limiting / abuso**: diferente do formulário público, o volume de e-mail
   recebido não é controlável por CAPTCHA — mas o custo de abuso também é bem menor (não
   é um formulário público indexável por bot; o endereço só é conhecido por quem já
   trocou e-mail com o suporte, ou descobriu via engenharia reversa de um e-mail de
   notificação). Ainda assim, vale um rate limit por remetente/IP-de-origem-do-webhook
   (que é sempre a infraestrutura da Resend, então na prática o controle é por `from`).

## Esforço estimado

Ordem de grandeza — **menor do que o esperado quando o plano original da Fatia A tratou
isso como risco técnico em aberto**:

| Item | Esforço |
|---|---|
| Configuração de domínio/subdomínio + MX na Resend | Infraestrutura, ~30min, feito 1x |
| Endpoint webhook (`POST /webhooks/support-inbound`) + verificação Svix | 1 use-case + 1 controller, padrão já dominado no módulo (endpoint público autenticado por assinatura, não por sessão) |
| Fetch do corpo completo + criação de ticket/resposta via `DRIZZLE_ADMIN` | Reaproveita quase 100% do `create-ticket`/`add-customer-response` já implementados na Fatia A — só troca a origem do input (webhook em vez de DTO HTTP) |
| Plus-addressing pra threading | Ajuste nos templates de e-mail já existentes (`Reply-To`) + parsing do `to` no handler |
| Upload de anexos vindos do e-mail | Reaproveita `IStorageProvider` e o bucket já existentes |

Comparado à complexidade que a Fatia A já atravessou (7 migrations de RLS/trigger até
chegar na arquitetura certa de autorização de escrita — ver ADR-0021), esta fatia é
**estritamente mais simples**: não há problema novo de autorização por coluna (o webhook
sempre escreve via `DRIZZLE_ADMIN`, como o resto das escritas privilegiadas do portal já
faz desde a 0043).

## Recomendação

**Prosseguir com Resend Inbound.** Não há motivo técnico ou financeiro para considerar
Postmark, Mailgun ou SendGrid (todos viáveis como alternativa genérica, mas nenhum
oferece a vantagem de já estar integrado ao projeto) — a única razão pra trocar de
provedor seria uma limitação concreta da Resend que não apareceu nesta investigação.

**Pré-requisito de infraestrutura antes de implementar**: decidir e provisionar o
subdomínio de recebimento (ex. `suporte.inkops.com.br`) e configurar o registro MX — isso
depende de acesso ao DNS do domínio de produção, fora do escopo de código.

## Próximo passo

Esta investigação libera a Fatia C (formulário público/anônimo + e-mail-to-ticket) para
entrar em planejamento formal (locator → planner), já sem a incerteza técnica que a
bloqueava. Não implementar nada ainda — aguardando decisão do usuário sobre quando essa
fatia entra no roadmap.

## Fontes

- [Receiving Emails — Resend](https://resend.com/docs/dashboard/receiving/introduction)
- [Inbound · Receive emails with Resend](https://resend.com/features/inbound)
- [Custom Receiving Domains — Resend](https://resend.com/docs/dashboard/receiving/custom-domains)
- [How to avoid conflicts with your MX records — Resend](https://resend.com/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records)
- [Forward emails with Resend Inbound](https://resend.com/docs/knowledge-base/forward-emails-with-resend-inbound)
- [Verify Webhooks Requests — Resend](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests)
- [Resend adds Inbound feature — AlternativeTo News](https://alternativeto.net/news/2025/11/resend-adds-inbound-feature-for-webhooks-based-email-receiving-and-processing/)
- [Resend Pricing 2026 — Nuntly](https://nuntly.com/resend-pricing)
- [Postmark inbound webhook docs](https://postmarkapp.com/developer/webhooks/inbound-webhook) (referência de alternativa avaliada)
- [Mailgun inbound routing](https://www.mailgun.com/features/inbound-email-routing/) (referência de alternativa avaliada)
- [SendGrid Inbound Parse](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/inbound-email) (referência de alternativa avaliada)
