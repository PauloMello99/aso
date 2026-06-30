# ADR-0014 — Error tracking com Better Stack (Logtail) no front e no back

**Status:** Aceito
**Data:** 2026-06-30

## Contexto

Não havia rastreamento de erros centralizado. No backend, dois filtros globais
(`DomainExceptionFilter` + `HttpExceptionFilter`, instanciados com `new` em
`main.ts`) apenas moldavam a resposta HTTP — nada era enviado para fora, e
exceções inesperadas (não-HTTP) sequer tinham filtro, vazando stack para o
cliente. No frontend (Next.js **Pages Router**) não havia error boundary nem
captura de `window.onerror`/`unhandledrejection`; o `apiRequest` lançava um
`Error` genérico sem status. O time já tinha criado as applications no Better
Stack: **frontend = source 2554582**, **backend = source 2554574**.

## Decisão

1. **SDK Better Stack (Logtail).** Backend usa `@logtail/node`; frontend usa
   `@logtail/next` (`log` singleton + `withBetterStack` no `next.config.js`).
   Obs.: o `@logtail/next` 0.2+ documenta App Router, mas o core `log`/`useLogger`
   é agnóstico de router e funciona no Pages Router — o caveat só vale para o
   wrapper de route handlers/RSC.

2. **Config por env, no-op sem credenciais** (espelha Mail/Audit):
   - Backend: `BETTERSTACK_SOURCE_TOKEN` + `BETTERSTACK_INGESTING_URL`.
   - Frontend (BUILD-TIME, inlinado): `NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN` +
     `NEXT_PUBLIC_BETTER_STACK_INGESTING_URL` (+ `_LOG_LEVEL` opcional).
   - Todas declaradas em `turbo.json globalEnv`.

3. **Backend — filtro único `AllExceptionsFilter` (`@Catch()`)** substitui os
   dois anteriores (deletados), preservando os shapes de resposta Domain/Http e
   adicionando 500 genérico que **não vaza** a mensagem interna. O mapa
   código→status saiu para `common/exceptions/domain-status.map.ts`. Resolvido
   via container em `main.ts` (`app.get(TelemetryService)`) → determinístico,
   sem ambiguidade de ordem de filtros. `TelemetryModule` é `@Global` (igual
   `AuditModule`). `main.ts` também captura `unhandledRejection`/
   `uncaughtException` e dá flush no shutdown (`enableShutdownHooks`).

4. **Frontend** — `infrastructure/telemetry/telemetry.ts` (`captureError` +
   `installGlobalErrorHandlers`), `ErrorBoundary` no root do `_app`,
   `pages/_error.tsx` (reporta SSR/navegação, com `log.flush()` no servidor),
   `ApiError` tipado no `client.ts` (carrega `status`/`code`/`path`) e handlers
   globais `QueryCache`/`MutationCache.onError`.

5. **Escopo do que é enviado (faults + unhandled):** só vão ao Better Stack
   **5xx**, falhas de rede (`status 0`), códigos de domínio não mapeados e
   exceções inesperadas. **4xx esperados (erros de negócio) NÃO são enviados** —
   apenas log local (debug) — para manter o stream limpo. A UI já trata os 4xx.

6. **Erros custom por módulo:** o contexto `module` é derivado do 1º segmento da
   rota (backend) e do 1º segmento da query key / path da API (frontend), então
   cada feature aparece agrupada no dashboard sem instrumentação manual.

## Consequências

- Um único ponto de captura por camada (filtro global no back; boundary +
  api client + react-query no front); use-cases/components não precisam logar.
- `apiRequest` agora lança `ApiError` (com `status`) em vez de `Error` — callers
  que liam `error.message` seguem funcionando (herda de `Error`).
- Sem credenciais a telemetria é no-op total: dev/local roda igual.
- Setar as 4 vars por ambiente no Railway (back) e no serviço frontend
  (build-time) — pegar token + ingesting host em Sources → Configure.

## Relacionado

- `project_audit_logging` / AuditModule — mesmo padrão `@Global` + no-op gracioso.
- ADR-0006 (Clean Architecture) — domain exceptions por módulo alimentam o `code`.
- ADR-0011 (deploy/Railway) — onde as env vars são setadas por ambiente.
