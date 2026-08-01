"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { centsToReaisInput, formatBRL } from "@/features/cashier/lib/money"
import {
  correctServicePaymentSchema,
  type CorrectServicePaymentFormValues,
} from "../schemas/services.schemas"
import {
  SERVICE_PAYMENT_METHODS,
  SERVICE_PAYMENT_METHOD_LABELS,
  type ServicePaymentMethod,
} from "../types"

export interface ServicePaymentCorrectionTarget {
  amountCents: number
  paymentMethod: ServicePaymentMethod
  /**
   * O Service (backend) só expõe `paymentTransactionId`, não a data da
   * transação de pagamento — por isso services-page.tsx pré-popula com
   * `performedAt` (execução do serviço), enquanto cashier-page.tsx usa
   * `transactedAt` da própria transação (correto). Isso diverge sempre que o
   * serviço é pago em dia diferente da execução (fluxo "pagar depois"), não é
   * caso raro. Campo é editável no form antes do submit. Corrigir de vez
   * requer expor a data da transação de pagamento no Service do backend.
   */
  dateISO?: string | null
}

interface ServicePaymentCorrectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ServicePaymentCorrectionTarget | null
  onSubmit: (values: CorrectServicePaymentFormValues) => Promise<void>
}

export function ServicePaymentCorrectionSheet({
  open,
  onOpenChange,
  target,
  onSubmit,
}: ServicePaymentCorrectionSheetProps) {
  const form = useForm<CorrectServicePaymentFormValues>({
    resolver: zodResolver(correctServicePaymentSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
      description: "",
      transactedAt: "",
    },
  })

  const amountCents = target?.amountCents
  const paymentMethod = target?.paymentMethod
  const dateISO = target?.dateISO

  useEffect(() => {
    if (open && amountCents !== undefined && paymentMethod) {
      form.reset({
        amount: centsToReaisInput(amountCents),
        paymentMethod,
        description: "",
        transactedAt: dateISO ? dateISO.slice(0, 10) : "",
      })
    }
  }, [open, amountCents, paymentMethod, dateISO, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>Corrigir valor do pagamento</SheetTitle>
              <SheetDescription>
                A transação de pagamento original será estornada e um novo
                lançamento corrigido será criado no caixa. Nada é apagado — o
                histórico fica preservado.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              {target && (
                <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-foreground/30">
                    Original
                  </p>
                  <p className="mt-1 tabular-nums text-foreground/70">
                    {formatBRL(target.amountCents)} ·{" "}
                    {SERVICE_PAYMENT_METHOD_LABELS[target.paymentMethod]}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                          R$
                        </span>
                        <Input
                          placeholder="0,00"
                          inputMode="decimal"
                          autoComplete="off"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pagamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {SERVICE_PAYMENT_METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Data{" "}
                      <span className="text-xs text-foreground/30">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Hoje"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição{" "}
                      <span className="text-xs text-foreground/30">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting
                  ? "Aplicando…"
                  : "Estornar e relançar"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
