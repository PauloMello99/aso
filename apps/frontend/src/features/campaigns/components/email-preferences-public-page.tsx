"use client"

import * as React from "react"
import { Loader2, RefreshCw } from "lucide-react"
import {
  CardContent,
  CardHeader,
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"
import { ApiError } from "@/infrastructure/api/client"
import {
  useEmailPreferences,
  useUnsubscribe,
} from "../hooks/use-email-preferences"
import {
  CLIENT_TRIGGER_LABELS,
  unsubscribeSuccessMessage,
} from "../lib/campaign-copy-preview"
import type { CampaignTrigger, EmailPreferences } from "../types"
import {
  PublicFormCentered,
  PublicFormMessageCard,
  PublicFormSpinner,
} from "./public-form-shell"

const TRIGGERS: CampaignTrigger[] = ["post_service", "birthday", "inactivity"]

const RATE_LIMIT_MESSAGE =
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
const GENERIC_ACTION_ERROR = "Não foi possível concluir. Tente novamente."

function unsubscribeErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return RATE_LIMIT_MESSAGE
  return GENERIC_ACTION_ERROR
}

function triggerEnabled(
  prefs: EmailPreferences,
  trigger: CampaignTrigger,
): boolean {
  if (trigger === "post_service") return prefs.postServiceEnabled
  if (trigger === "birthday") return prefs.birthdayEnabled
  return prefs.inactivityEnabled
}

interface EmailPreferencesPublicPageProps {
  token: string | undefined
}

export function EmailPreferencesPublicPage({
  token,
}: EmailPreferencesPublicPageProps) {
  const {
    data: prefs,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useEmailPreferences(token)
  const { mutateAsync: unsubscribe, isPending } = useUnsubscribe(token)

  const [pendingTarget, setPendingTarget] = React.useState<
    CampaignTrigger | "all" | null
  >(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [confirmError, setConfirmError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const bannerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (successMessage) bannerRef.current?.focus()
  }, [successMessage])

  if (isLoading) return <PublicFormSpinner />

  const isTransportError =
    error instanceof ApiError
      ? error.status === 0 || error.status >= 500
      : Boolean(error)

  if (!token || !prefs || error) {
    if (token && isTransportError) {
      return (
        <PublicFormMessageCard
          title="Não foi possível carregar"
          description="Tente novamente em alguns instantes."
          action={
            <Button
              type="button"
              variant="outline"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
              />
              Tentar novamente
            </Button>
          }
        />
      )
    }
    return (
      <PublicFormMessageCard
        title="Este link não é mais válido"
        description="Não foi possível abrir suas preferências de e-mail. O link pode ter expirado."
      />
    )
  }

  async function runUnsubscribe(trigger?: CampaignTrigger) {
    if (!prefs) return
    setActionError(null)
    setConfirmError(null)
    setPendingTarget(trigger ?? "all")
    try {
      await unsubscribe(trigger)
      await refetch()
      setConfirmOpen(false)
      if (trigger) {
        setSuccessMessage(unsubscribeSuccessMessage(trigger, prefs.orgName))
      }
      // Opt-out global: o ponto 10 da spec rege o estado terminal (apenas o box
      // de status, sem banner de sucesso). O refetch leva a UI para esse estado.
    } catch (err) {
      const message = unsubscribeErrorMessage(err)
      if (trigger) setActionError(message)
      else setConfirmError(message)
    } finally {
      setPendingTarget(null)
    }
  }

  return (
    <PublicFormCentered>
      <CardHeader className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
          ASO
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Preferências de e-mail
        </h1>
        <p className="text-sm text-foreground/40">
          E-mails de <strong>{prefs.orgName}</strong>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <div
            ref={bannerRef}
            role="status"
            tabIndex={-1}
            className="rounded-xl border border-success/20 bg-success/[0.06] p-3 text-sm text-success outline-none"
          >
            {successMessage}
          </div>
        )}

        {prefs.unsubscribedAll ? (
          <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-sm text-foreground/60">
            Você não está recebendo e-mails de {prefs.orgName}.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-foreground/[0.06]">
              {TRIGGERS.map((trigger) => {
                const enabled = triggerEnabled(prefs, trigger)
                const label = CLIENT_TRIGGER_LABELS[trigger]
                return (
                  <li
                    key={trigger}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {label}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {enabled
                          ? "Você recebe estes e-mails."
                          : "Você não recebe estes e-mails."}
                      </p>
                    </div>
                    {enabled ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 shrink-0 sm:min-h-9"
                        disabled={isPending}
                        aria-label={`Parar de receber: ${label}`}
                        onClick={() => void runUnsubscribe(trigger)}
                      >
                        {pendingTarget === trigger ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Parar de receber"
                        )}
                      </Button>
                    ) : (
                      <span className="shrink-0 text-xs text-foreground/40">
                        Cancelado
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>

            <Separator className="bg-foreground/[0.06]" />

            <Button
              type="button"
              className="w-full"
              disabled={isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Não quero receber nenhum e-mail desta empresa
            </Button>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setConfirmError(null)
        }}
        destructive
        title="Parar de receber todos os e-mails?"
        description={`Você não vai mais receber nenhum e-mail de ${prefs.orgName}. Não é possível reativar por esta página.`}
        confirmLabel="Parar de receber tudo"
        cancelLabel="Voltar"
        loading={pendingTarget === "all"}
        error={confirmError}
        onConfirm={() => void runUnsubscribe()}
      />
    </PublicFormCentered>
  )
}
