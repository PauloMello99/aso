"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, startOfMonth } from "date-fns"
import { AlertCircle } from "lucide-react"
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
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { ApiError } from "@/infrastructure/api/client"
import { downloadAuthenticatedFile } from "@/shared/lib/download-file"
import {
  memberReportFormSchema,
  type MemberReportFormValues,
} from "../schemas/member-report.schemas"

const REPORT_ERROR_MESSAGES: Record<string, string> = {
  CASHIER_FORBIDDEN: "Você não tem permissão para gerar este documento.",
  MEMBER_REPORT_INVALID_PERIOD:
    "Período inválido: use datas reais, de ≤ até, e no máximo 366 dias.",
  PAYMENT_MEMBER_NOT_FOUND:
    "Este membro não está habilitado para receber pagamentos.",
  ORGANIZATION_NOT_FOUND: "Organização não encontrada.",
}

function reportErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const mapped = err.code ? REPORT_ERROR_MESSAGES[err.code] : undefined
    if (mapped) return mapped
    if (err.status === 400) {
      return "Período inválido: use datas reais, de ≤ até, e no máximo 366 dias."
    }
    return "Não foi possível gerar o relatório. Tente novamente."
  }
  return "Não foi possível gerar o relatório. Tente novamente."
}

function defaultValues(): MemberReportFormValues {
  const today = new Date()
  return {
    from: format(startOfMonth(today), "yyyy-MM-dd"),
    to: format(today, "yyyy-MM-dd"),
  }
}

interface MemberReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userId: string
}

export function MemberReportDialog({
  open,
  onOpenChange,
  orgId,
  userId,
}: MemberReportDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<MemberReportFormValues>({
    resolver: zodResolver(memberReportFormSchema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultValues())
    setServerError(null)
    // Só re-popular quando o dialog abre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    const qs = new URLSearchParams({ from: values.from, to: values.to })
    try {
      await downloadAuthenticatedFile(
        `/orgs/${orgId}/members/${userId}/report?${qs.toString()}`,
        `relatorio-${values.from}-${values.to}.pdf`,
      )
      onOpenChange(false)
    } catch (err) {
      setServerError(reportErrorMessage(err))
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v)
      }}
    >
      <DialogContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Exportar relatório</DialogTitle>
              <DialogDescription>
                Gera um PDF com o resumo financeiro e os movimentos do membro no
                período escolhido (máximo de 366 dias).
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período — de</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Início"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período — até</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Fim"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">{serverError}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? "Gerando…" : "Baixar PDF"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
