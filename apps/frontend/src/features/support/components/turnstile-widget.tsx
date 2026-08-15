"use client"

import * as React from "react"
import Script from "next/script"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  "expired-callback": () => void
  "error-callback": () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
  reset: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
}

/**
 * Widget do Cloudflare Turnstile para o formulário público de suporte.
 * Renderiza via `turnstile.render()` (modo explicit) num container próprio,
 * evitando o auto-init implícito do script. `onToken` é lido de uma ref
 * para não recriar o widget a cada render do form pai.
 */
export const TurnstileWidget = React.forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ onToken }, ref) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const widgetIdRef = React.useRef<string | null>(null)
  const onTokenRef = React.useRef(onToken)
  const [scriptReady, setScriptReady] = React.useState(false)

  onTokenRef.current = onToken

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  React.useImperativeHandle(ref, () => ({
    reset() {
      const widgetId = widgetIdRef.current
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId)
      }
    },
  }))

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      setScriptReady(true)
    }
  }, [])

  React.useEffect(() => {
    if (!siteKey || !scriptReady) return
    if (!containerRef.current || widgetIdRef.current) return
    if (!window.turnstile) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    })

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey, scriptReady])

  if (!siteKey) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Verificação de segurança indisponível. Tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  )
})
