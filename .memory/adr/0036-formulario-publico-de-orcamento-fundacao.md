# ADR-0036 — Formulário público de orçamento: fundação (Bloco C, fatia C1)

**Status:** Aceito (C1). Texto de consentimento **PENDENTE de aprovação jurídica**.
**Data:** 2026-10-08

## Contexto

Reunião de **2026-10-07** (Bloco C): substituir Linktree/Google Forms por um formulário público de
orçamento por profissional, atrás de flag, com retenção curta de dados pessoais. A C1 entrega só a
**fundação pública**; a caixa de entrada (C2), a conversão/expiração (C3) e a personalização/páginas
Linktree (C4) vêm depois.

## Decisão

- **Entidade própria** (não `customers`, que exige `birth_date`/`address` e e-mail único por org).
  Migration `0087`: `quote_forms` (um por profissional: `slug` **global** único, `display_name`,
  `enabled`; **opt-in** = formulário ativo), `quote_requests` (nome, telefone, e-mail, ideia,
  consentimentos versionados + `consent_text_snapshot`, `expires_at` = criação + 30 dias, status
  `text` + CHECK) e `quote_request_images` (0–3, FK composta `(quote_request_id, org_id)`). `0088`:
  bucket **privado** `quote-request-images` (5 MB; JPEG/PNG/WebP/HEIC/HEIF), sem policy em `storage.objects`.
- **RLS**: `quote_forms` legível por membros da org e gravável só pelo próprio membro
  (`is_self_member`, SECURITY DEFINER); `quote_requests`/`quote_request_images` **sem policy**
  (deny-by-default) — só `DRIZZLE_ADMIN` escreve (rota pública sem sessão, ADR-0021/0035) e ninguém lê
  até a C2 criar a policy de SELECT por `target_user_id`.
- **Slug**: `^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$` (3..40), sem `--`, lista de reservados, global (vai na bio
  do Instagram). Desativar **não libera** o slug; trocar libera na hora (sem redirect).
- **Superfície pública** `public/quote-forms/:slug` (GET 30/min; POST `…/requests` 5/10 min): flag
  `PUBLIC_QUOTE_FORM_ENABLED` (**default off**, 404; cobre também a configuração autenticada);
  **Turnstile fail-closed por header `x-turnstile-token` em guard, antes do multer** (guards rodam antes de
  interceptors: sem captcha válido nada é bufferizado); upload **multipart único** (sem draft/TTL);
  tipo da imagem **só por magic bytes**; ordem **storage → banco** com compensação (`removeFile`);
  falha de storage → 502 `QUOTE_IMAGE_UPLOAD_FAILED` com mensagem fixa (sem texto do provedor).
- **Anti-enumeração**: slug inexistente/inválido/desativado/membro desabilitado/org suspensa → mesma 404.
  O POST responde `{received:true}` sem id.
- **Privacidade**: consentimento de privacidade **obrigatório**; retenção de contato 30d **opcional**
  (desmarcado: sem aceite, o contato é apagado ao encerrar sem agendamento, em C3). Texto gerado no servidor,
  versionado (`quote-v1-minuta-2026-10`) e snapshotado; **sem IP/User-Agent** no banco. Erros de banco são
  sanitizados na fronteira do repositório (o `DrizzleQueryError` carrega os params, que contêm PII) e paths
  `/public/*` são redigidos em logs/telemetria (`redactPublicPath`).
- **Configuração mínima**: Configurações > Orçamento (owner e funcionário, o próprio membro) com slug, nome
  público e ativar. O item some quando a flag está off (404 do `GET me`; sem flag no frontend).

## Consequências / pendências

- **Go-live**: a flag só deve ser ligada em produção com **C2 e C3 no ar** — sem C3 a retenção de 30 dias
  prometida no consentimento não é cumprida e objetos órfãos do bucket não são varridos (prefixo
  `<org>/<requestId>/` sem linha). Sem C2 ninguém vê os pedidos.
- Aprovação jurídica do texto de consentimento; teste manual no navegador interno do Instagram (iOS/Android):
  Turnstile + seletor de arquivo/HEIC.
- `SupabaseStorageProvider.removeFile` ignora o `error` retornado: a compensação pode falhar em silêncio
  (mesma pendência do ADR-0018 Tier 2; C3 deve introduzir remoção que verifica erro).
- HEIC: Chrome/Android não renderiza HEIC por signed URL na caixa de entrada (C2: fallback "baixar").
- Throttler em memória por instância (várias réplicas multiplicam o limite). Slug sem quarentena/histórico
  (risco de squatting/sequestro do link antigo): decidir em C2/C4.
- Sem bump de versão nem changelog na C1 (feature invisível com a flag off); minor + item quando o fluxo
  ficar utilizável.
- Local: o Storage do Supabase local pode devolver 500 `42P10` (índice único completo ausente em
  `storage.objects` após restore de backup); ver gotcha em `domain-rules.md`.
