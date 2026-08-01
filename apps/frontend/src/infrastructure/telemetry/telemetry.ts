import { log } from "@logtail/next"

export interface TelemetryContext {
  module?: string
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

export function captureError(
  error: unknown,
  context: TelemetryContext = {},
): void {
  try {
    const err = normalizeError(error)
    log.error(err.message, { ...baseContext, ...context, error: err })
  } catch {
    void 0
  }
}

export function captureMessage(
  message: string,
  context: TelemetryContext = {},
): void {
  try {
    log.info(message, { ...baseContext, ...context })
  } catch {
    void 0
  }
}

let handlersInstalled = false

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
