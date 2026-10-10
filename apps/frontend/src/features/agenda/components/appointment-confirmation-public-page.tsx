"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { ApiError } from "@/infrastructure/api/client"
import { cn } from "@/shared/lib/utils"
import {
  useAppointmentConfirmationPublic,
  useRespondAppointmentConfirmation,
} from "../hooks/use-appointment-confirmation-public"
import {
  CANCELED_BY_STUDIO_MESSAGE,
  formatConfirmationDateTime,
  getConfirmationErrorMessage,
  getConfirmationSuccessMessage,
} from "../lib/appointment-confirmation-public"
import type { AppointmentConfirmationResponse } from "../types"

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-foreground/5 bg-foreground/[0.03] sm:max-w-lg">
        {children}
      </Card>
    </div>
  )
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Centered>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-foreground/40">{text}</CardDescription>
      </CardHeader>
    </Centered>
  )
}

interface AppointmentConfirmationPublicPageProps {
  token: string | undefined
}

export function AppointmentConfirmationPublicPage({
  token,
}: AppointmentConfirmationPublicPageProps) {
  const { data, isLoading, error } = useAppointmentConfirmationPublic(token)
  const respond = useRespondAppointmentConfirmation(token)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
      </div>
    )
  }

  if (!token) {
    return (
      <Message
        title="Link inválido"
        text={getConfirmationErrorMessage(404)}
      />
    )
  }

  if (error || !data) {
    return (
      <Message
        title="Não foi possível abrir"
        text={getConfirmationErrorMessage(
          error instanceof ApiError ? error.status : undefined,
        )}
      />
    )
  }

  if (data.state === "event_canceled") {
    return <Message title={data.orgName} text={CANCELED_BY_STUDIO_MESSAGE} />
  }

  const respondError = respond.error
    ? getConfirmationErrorMessage(
        respond.error instanceof ApiError ? respond.error.status : undefined,
      )
    : null
  const answered = data.confirmationStatus !== "pending"
  const successMessage = getConfirmationSuccessMessage(data.confirmationStatus)

  const options: {
    value: AppointmentConfirmationResponse
    label: string
  }[] = [
    { value: "confirmed", label: "Confirmo" },
    { value: "canceled_by_customer", label: "Não poderei ir" },
  ]

  return (
    <Centered>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{data.orgName}</CardTitle>
        <CardDescription className="text-foreground/40">
          Confirmação de agendamento
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-base first-letter:uppercase">
          {formatConfirmationDateTime(data.startsAt, data.endsAt, data.allDay)}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          {options.map((option) => {
            const selected = data.confirmationStatus === option.value
            return (
              <Button
                key={option.value}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                disabled={respond.isPending}
                onClick={() => respond.mutate(option.value)}
                className={cn(
                  "w-full sm:flex-1",
                  selected &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {respond.isPending && respond.variables === option.value && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {option.label}
              </Button>
            )
          })}
        </div>

        {respondError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {respondError}
          </p>
        )}

        {answered && successMessage && (
          <p role="status" className="text-center text-sm font-medium">
            {successMessage}
          </p>
        )}

        <p className="text-center text-xs text-foreground/40">
          Você pode mudar sua resposta até o horário do atendimento.
        </p>
      </CardContent>
    </Centered>
  )
}
