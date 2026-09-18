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
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/features/cashier/types"
import {
  memberPaymentFormSchema,
  type MemberPaymentFormValues,
} from "../schemas/member-payment.schemas"
import type { MemberPaymentView } from "../types"

const METHOD_ORDER: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
]

interface PayMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "correct"
  // "create": saldo devido sugerido (payment-summary), editável — pagamento
  // parcial continua livre (D5). "correct": valor atual do pagamento sendo
  // corrigido.
  suggestedAmountCents: number
  // Só em mode="correct": pagamento original sendo corrigido, usado para
  // prefill de description/período/paymentMethod. amountCents dele já vem em
  // suggestedAmountCents (o chamador decide a fonte).
  original?: MemberPaymentView | null
  onSubmit: (values: MemberPaymentFormValues) => Promise<void>
}

export function PayMemberDialog({
  open,
  onOpenChange,
  mode,
  suggestedAmountCents,
  original = null,
  onSubmit,
}: PayMemberDialogProps) {
  const form = useForm<MemberPaymentFormValues>({
    resolver: zodResolver(memberPaymentFormSchema),
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
      description: "",
      periodStart: "",
      periodEnd: "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      amount:
        suggestedAmountCents > 0
          ? centsToReaisInput(suggestedAmountCents)
          : "",
      paymentMethod:
        mode === "correct" ? (original?.paymentMethod ?? "cash") : "cash",
      description:
        mode === "correct" ? (original?.entity.description ?? "") : "",
      periodStart:
        mode === "correct" ? (original?.entity.periodStart ?? "") : "",
      periodEnd:
        mode === "correct" ? (original?.entity.periodEnd ?? "") : "",
    })
    // suggestedAmountCents/original mudam por render (novo objeto vindo do
    // React Query) — só queremos re-popular quando o sheet abre, não a cada
    // refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
              <SheetTitle>
                {mode === "create" ? "Pagar membro" : "Corrigir pagamento"}
              </SheetTitle>
              <SheetDescription>
                {mode === "create"
                  ? "Registra uma saída no caixa em nome deste membro. O valor sugerido é o saldo devido, mas pode ser alterado (pagamento parcial)."
                  : "O pagamento original será estornado e um novo lançamento corrigido será criado — gera um estorno e um relançamento no caixa. Nada é apagado."}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              {mode === "create" && suggestedAmountCents > 0 && (
                <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-sm">
                  <span className="text-foreground/50">Saldo devido: </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatBRL(suggestedAmountCents)}
                  </span>
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
                        {METHOD_ORDER.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição{" "}
                      <span className="text-xs text-foreground/30">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Comissão de setembro"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Período (de){" "}
                        <span className="text-xs text-foreground/30">(opcional)</span>
                      </FormLabel>
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
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Período (até){" "}
                        <span className="text-xs text-foreground/30">(opcional)</span>
                      </FormLabel>
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
                  ? "Salvando…"
                  : mode === "create"
                    ? "Pagar"
                    : "Estornar e relançar"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
