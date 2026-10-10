"use client"

import * as React from "react"
import { Check, Copy, Mail, Phone } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

const COPIED_FEEDBACK_MS = 2000

interface CopyableContactProps {
  kind: "tel" | "mailto"
  value: string | null
}

const COPY_LABEL = {
  tel: "Copiar telefone",
  mailto: "Copiar e-mail",
} as const

export function CopyableContact({ kind, value }: CopyableContactProps) {
  const [copied, setCopied] = React.useState(false)
  const [copyFailed, setCopyFailed] = React.useState(false)
  const timerRef = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const Icon = kind === "tel" ? Phone : Mail

  async function handleCopy() {
    if (!value) return
    window.clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(value)
      setCopyFailed(false)
      setCopied(true)
      timerRef.current = window.setTimeout(
        () => setCopied(false),
        COPIED_FEEDBACK_MS,
      )
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }

  if (!value) {
    return (
      <div className="flex min-h-[44px] items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden="true" />
        <span className="text-base text-foreground/40 sm:text-sm">
          Não informado
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex min-h-[44px] items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden="true" />
        <a
          href={`${kind}:${value}`}
          className="min-w-0 flex-1 truncate text-base text-primary-text underline-offset-4 hover:underline sm:text-sm"
        >
          {value}
        </a>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={COPY_LABEL[kind]}
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copiado" : ""}
      </span>
      {copyFailed && (
        <p className="text-xs text-destructive">Não foi possível copiar.</p>
      )}
    </div>
  )
}
