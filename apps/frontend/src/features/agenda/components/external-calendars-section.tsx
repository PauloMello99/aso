"use client"

import * as React from "react"
import { CalendarClock, Loader2, Link2Off, CheckCircle2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import {
  useCalendarConnection,
  type CalendarProvider,
} from "../hooks/use-calendar-connection"

const PROVIDERS: { key: CalendarProvider; name: string; color: string }[] = [
  { key: "google", name: "Google Calendar", color: "text-info" },
  { key: "outlook", name: "Outlook Calendar", color: "text-info" },
  { key: "apple", name: "Apple Calendar", color: "text-foreground/70" },
]

const PROVIDER_NAME: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  outlook: "Outlook Calendar",
  apple: "Apple Calendar",
}

interface Props {
  orgId: string
  isOwner: boolean
}

export function ExternalCalendarsSection({ orgId, isOwner }: Props) {
  const { enabled, connection, loading, disconnect } =
    useCalendarConnection(orgId)
  const [busy, setBusy] = React.useState(false)
  const [disconnectOpen, setDisconnectOpen] = React.useState(false)
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null)
  const [connectNotice, setConnectNotice] = React.useState<string | null>(null)

  async function handleDisconnect() {
    setBusy(true)
    setDisconnectError(null)
    try {
      await disconnect()
      setDisconnectOpen(false)
    } catch {
      setDisconnectError("Não foi possível desconectar.")
    } finally {
      setBusy(false)
    }
  }

  function handleConnect(name: string) {
    setConnectNotice(`A conexão com ${name} ainda está em desenvolvimento.`)
  }

  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Calendários externos</h3>
        {!enabled && (
          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/40">
            Em breve
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground/50">
        Conecte um calendário externo a esta organização para espelhar e
        sincronizar os eventos da agenda. Cada organização pode ter um
        calendário próprio.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-foreground/30">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : connection ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-success/20 bg-success/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-foreground">
              {PROVIDER_NAME[connection.provider]}
            </span>
            {connection.externalAccountEmail && (
              <span className="text-foreground/40">
                · {connection.externalAccountEmail}
              </span>
            )}
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setDisconnectOpen(true)}
              className="text-destructive hover:text-destructive/80"
            >
              <Link2Off className="h-4 w-4" />
              Desconectar
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={!enabled || !isOwner}
              onClick={() => handleConnect(p.name)}
              className="flex items-center justify-between rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2.5 text-sm text-foreground/60 transition-colors enabled:hover:border-foreground/20 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className={p.color}>{p.name}</span>
              <span className="text-xs text-foreground/30">
                {enabled ? "Conectar" : "Em breve"}
              </span>
            </button>
          ))}
        </div>
      )}

      {!isOwner && (
        <p className="mt-3 text-xs text-foreground/30">
          Apenas o dono da organização gerencia o calendário externo.
        </p>
      )}

      {connectNotice && (
        <p className="mt-3 text-xs text-foreground/40">{connectNotice}</p>
      )}

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={(open) => {
          setDisconnectOpen(open)
          if (!open) setDisconnectError(null)
        }}
        title="Desconectar calendário externo"
        description="Desconectar o calendário externo desta organização?"
        confirmLabel="Desconectar"
        destructive
        loading={busy}
        error={disconnectError}
        onConfirm={() => void handleDisconnect()}
      />
    </section>
  )
}
