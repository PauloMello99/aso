"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addYears, format } from "date-fns"
import { Loader2 } from "lucide-react"
import { ApiError } from "@/infrastructure/api/client"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  isQuoteAlreadyResolvedError,
  useScheduleQuoteRequest,
} from "../hooks/use-quote-requests"
import {
  DEFAULT_SCHEDULE_DURATION,
  SCHEDULE_DURATION_OPTIONS,
  buildSchedulePayload,
  formatScheduledLabel,
} from "../lib/schedule-quote"
import {
  scheduleQuoteSchema,
  type ScheduleQuoteValues,
} from "../schemas/schedule-quote.schema"

export const QUOTE_ALREADY_RESOLVED_MESSAGE =
  "Este pedido já foi respondido ou expirou."

interface ScheduleQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  requestId: string
  /** Nome do profissional-alvo quando o owner agenda em nome de outro membro. */
  assigneeName: string | null
  /** Chamado após o encerramento do pedido (sucesso ou pedido já resolvido). */
  onResolved: (message: string) => void
}

function emptyValues(): ScheduleQuoteValues {
  return {
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    durationMinutes: DEFAULT_SCHEDULE_DURATION,
  }
}

function describeScheduleError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.code === "CALENDAR_EVENT_OVERLAP") {
      return "Já existe um compromisso nesse horário na agenda. Escolha outro horário."
    }
    if (error.status === 422) return "Horário inválido."
    if (error.status === 403) {
      return "Você não tem permissão para agendar este pedido para este profissional."
    }
    if (error.status === 402) {
      return "Assinatura inativa: regularize para criar agendamentos."
    }
  }
  return "Não foi possível agendar. Tente novamente."
}

export function ScheduleQuoteDialog({
  open,
  onOpenChange,
  orgId,
  requestId,
  assigneeName,
  onResolved,
}: ScheduleQuoteDialogProps) {
  const { schedule, isPending, reset } = useScheduleQuoteRequest(orgId)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const form = useForm<ScheduleQuoteValues>({
    resolver: zodResolver(scheduleQuoteSchema),
    defaultValues: emptyValues(),
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(emptyValues())
    setSubmitError(null)
    reset()
  }, [open, form, reset])

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const result = await schedule({
        id: requestId,
        body: buildSchedulePayload(values),
      })
      onOpenChange(false)
      const label = formatScheduledLabel(result.startsAt)
      onResolved(
        result.alreadyScheduled
          ? `Este pedido já tinha um agendamento em ${label}. O pedido foi encerrado.`
          : `Agendamento criado para ${label}${assigneeName ? ` na agenda de ${assigneeName}` : " na sua agenda"}.`,
      )
    } catch (error) {
      if (isQuoteAlreadyResolvedError(error)) {
        onOpenChange(false)
        onResolved(QUOTE_ALREADY_RESOLVED_MESSAGE)
        return
      }
      setSubmitError(describeScheduleError(error))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar agendamento</DialogTitle>
          <DialogDescription>
            {assigneeName
              ? `O atendimento será criado na agenda de ${assigneeName}.`
              : "O atendimento será criado na sua agenda."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Escolha a data"
                      endMonth={addYears(new Date(), 2)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        step={300}
                        className="h-11 text-base sm:h-10 sm:text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 text-base sm:h-10 sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SCHEDULE_DURATION_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-sm text-foreground/60">
              Se a confirmação por e-mail estiver ativa no seu estúdio, o
              cliente recebe um link para confirmar presença. Depois de agendar,
              o pedido e as imagens são apagados.
            </p>

            {submitError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {submitError}
              </p>
            )}

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:h-9 sm:w-auto"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-11 w-full sm:h-9 sm:w-auto"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Agendando…" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
