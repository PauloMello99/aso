import { log } from "@logtail/next"

/**
 * Error tracking do frontend sobre o Better Stack (@logtail/next).
 *
 * `log` é o logger singleton do pacote: detecta o ambiente (browser/SSR),
 * envia para a application "frontend" (id 2554582) e vira no-op quando as vars
 * NEXT_PUBLIC_BETTER_STACK_* não estão setadas. Centralizamos aqui a
 * normalização de Error e a convenção de contexto (`module`, `source`).
 */

export interface TelemetryContext {
  /** Feature/módulo de origem (ex.: "materials", "cashier"). */
  module?: string
  /** Camada que capturou o erro (ex.: "react-render", "api", "react-query"). */
  source?: string
  [key: string]: unknown
}

const baseContext: Record<string, unknown> = {
  runtime: "frontend",
  environment: process.env.NODE_ENV ?? "development",
}

function normalizeError(error: unknown): {
  message: string
  name: string
  stack: string | null
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? null,
    }
  }
  return { message: String(error), name: "NonError", stack: null }
}

/** Reporta uma exceção ao Better Stack. Best-effort: nunca lança. */
export function captureError(
  error: unknown,
  context: TelemetryContext = {},
): void {
  try {
    const err = normalizeError(error)
    log.error(err.message, { ...baseContext, ...context, error: err })
  } catch {
    // telemetria nunca pode quebrar a aplicação
  }
}

/** Reporta uma mensagem arbitrária. Best-effort. */
export function captureMessage(
  message: string,
  context: TelemetryContext = {},
): void {
  try {
    log.info(message, { ...baseContext, ...context })
  } catch {
    /* no-op */
  }
}

let handlersInstalled = false

/**
 * Captura erros globais do browser que escapam aos error boundaries do React:
 * exceções síncronas (window.onerror) e Promises rejeitadas sem catch.
 * Idempotente — chamar uma vez no boot do app.
 */
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled || typeof window === "undefined") return
  handlersInstalled = true

  window.addEventListener("error", (event) => {
    captureError(event.error ?? event.message, {
      source: "window.onerror",
      module: "global",
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    captureError(event.reason, {
      source: "unhandledrejection",
      module: "global",
    })
  })
}
