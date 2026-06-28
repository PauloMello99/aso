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
import {
  correctionSchema,
  type CorrectionFormValues,
} from "../schemas/cashier.schemas"
import { centsToReaisInput, formatBRL } from "../lib/money"
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  type PaymentMethod,
  type Transaction,
} from "../types"

const METHOD_ORDER: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
  "credits",
]

interface CorrectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onSubmit: (values: CorrectionFormValues) => Promise<void>
}

export function CorrectionSheet({
  open,
  onOpenChange,
  transaction,
  onSubmit,
}: CorrectionSheetProps) {
  const form = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      description: "",
      type: "income",
      amount: "",
      paymentMethod: "cash",
      transactedAt: "",
    },
  })

  useEffect(() => {
    if (open && transaction) {
      form.reset({
        description: transaction.description,
        type: transaction.type,
        amount: centsToReaisInput(transaction.grossCents),
        paymentMethod: transaction.paymentMethod,
        transactedAt: transaction.transactedAt.slice(0, 10),
      })
    }
  }, [open, transaction, form])

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
              <SheetTitle>Corrigir lançamento</SheetTitle>
              <SheetDescription>
                A transação original será estornada e um novo lançamento corrigido
                será criado. Nada é apagado — o histórico fica preservado.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              {/* Original (somente leitura) */}
              {transaction && (
                <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-foreground/30">
                    Original
                  </p>
                  <p className="mt-1 truncate text-foreground/70">
                    {transaction.description}
                  </p>
                  <p className="mt-0.5 tabular-nums text-foreground/40">
                    {TRANSACTION_TYPE_LABELS[transaction.type]} ·{" "}
                    {formatBRL(transaction.grossCents)} ·{" "}
                    {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">
                          {TRANSACTION_TYPE_LABELS.income}
                        </SelectItem>
                        <SelectItem value="outcome">
                          {TRANSACTION_TYPE_LABELS.outcome}
                        </SelectItem>
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
                      Descrição <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor <span className="text-red-400">*</span>
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
